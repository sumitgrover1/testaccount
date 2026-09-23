import { LeadSource, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { generateWhatsAppReply } from '../../common/providers/ai.provider';
import { sendWhatsAppFreeformText } from '../../common/providers/notification.provider';
import { ingestLead } from '../leads/lead.service';
import { createFollowUp } from '../followups/followup.service';

// Handles inbound WhatsApp messages (see whatsappBot.controller.ts's webhook
// receiver) for Instagram-originated conversations only, per the clinic's
// choice: general questions (what a treatment involves, booking, pricing —
// which always gets redirected to a consultation, never a number) get an
// AI-drafted reply; anything medical, a complaint, or the AI isn't confident
// about gets escalated to staff as a FollowUp instead of auto-replied.

// --- Meta Cloud API webhook payload shapes (only the fields we read) ---
interface WhatsAppReferral {
  source_type?: string;
  source_id?: string;
  source_url?: string;
  headline?: string;
  body?: string;
}
interface WhatsAppInboundMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  referral?: WhatsAppReferral;
}
interface WhatsAppWebhookValue {
  contacts?: { profile?: { name?: string }; wa_id: string }[];
  messages?: WhatsAppInboundMessage[];
}
export interface WhatsAppWebhookPayload {
  entry?: { changes?: { field: string; value: WhatsAppWebhookValue }[] }[];
}

function isInstagramReferral(referral?: WhatsAppReferral): boolean {
  return Boolean(referral?.source_type?.toLowerCase().startsWith('ig'));
}

let cachedSystemActorId: string | null = null;
async function getSystemActorId(): Promise<string> {
  if (cachedSystemActorId) return cachedSystemActorId;
  const admin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) {
    throw new Error('No SUPER_ADMIN user found to attribute WhatsApp bot actions to');
  }
  cachedSystemActorId = admin.id;
  return admin.id;
}

async function resolveEscalationAssigneeId(): Promise<string> {
  if (env.WHATSAPP_BOT_ESCALATION_ASSIGNEE_EMAIL) {
    const user = await prisma.user.findUnique({
      where: { email: env.WHATSAPP_BOT_ESCALATION_ASSIGNEE_EMAIL },
    });
    if (user) return user.id;
    logger.warn('WHATSAPP_BOT_ESCALATION_ASSIGNEE_EMAIL is set but no matching user was found');
  }
  const fallback = await prisma.user.findFirst({
    where: { role: { in: [Role.COUNSELOR, Role.RECEPTIONIST] } },
    orderBy: { createdAt: 'asc' },
  });
  return fallback?.id ?? getSystemActorId();
}

async function resolveLeadForInboundMessage(
  waId: string,
  contactName: string,
  referral?: WhatsAppReferral,
) {
  // Numbers may be stored with or without a leading "+" elsewhere in the
  // app; wa_id from Meta never has one, so match both forms.
  const candidates = [waId, `+${waId}`];
  const existing = await prisma.lead.findFirst({
    where: { mobileNumber: { in: candidates } },
    orderBy: { createdAt: 'desc' },
  });
  const igReferral = isInstagramReferral(referral);

  if (!existing) {
    // Scope: only auto-engage Instagram-attributed conversations. A first
    // message from an unknown number with no Instagram referral is left
    // for staff to pick up manually — logged nowhere here since we have no
    // lead to attach a CommunicationLog to yet.
    if (!igReferral) return { lead: null, eligible: false };
    const actorId = await getSystemActorId();
    const created = await ingestLead(
      { fullName: contactName || waId, mobileNumber: waId, source: LeadSource.INSTAGRAM },
      actorId,
    );
    return { lead: created, eligible: true };
  }

  return { lead: existing, eligible: existing.source === LeadSource.INSTAGRAM || igReferral };
}

const TREATMENT_CONTEXT_TTL_MS = 5 * 60 * 1000;
let treatmentContextCache: { fetchedAt: number; text: string } | null = null;

async function buildTreatmentContext(): Promise<string> {
  if (
    treatmentContextCache &&
    Date.now() - treatmentContextCache.fetchedAt < TREATMENT_CONTEXT_TTL_MS
  ) {
    return treatmentContextCache.text;
  }
  const treatments = await prisma.treatment.findMany({
    where: { isActive: true },
    select: {
      name: true,
      category: true,
      description: true,
      durationMinutes: true,
      numberOfSessions: true,
    },
    take: 100,
  });
  const text = treatments.length
    ? treatments
        .map(
          (t) =>
            `- ${t.name} (${t.category}): ${t.description ?? 'No description available'} — typically ${t.numberOfSessions} session(s), ~${t.durationMinutes} min each`,
        )
        .join('\n')
    : 'No treatments configured yet.';
  treatmentContextCache = { fetchedAt: Date.now(), text };
  return text;
}

async function logCommunication(
  leadId: string,
  direction: 'INBOUND' | 'OUTBOUND',
  content: string,
) {
  const actorId = await getSystemActorId();
  await prisma.communicationLog.create({
    data: { leadId, channel: 'WHATSAPP', direction, content, createdById: actorId },
  });
}

async function escalateToStaff(
  lead: { id: string; mobileNumber: string },
  originalMessage: string,
  reason?: string,
) {
  const actorId = await getSystemActorId();
  const assignedToId = await resolveEscalationAssigneeId();

  await createFollowUp(
    {
      leadId: lead.id,
      assignedToId,
      channel: 'WHATSAPP',
      dueAt: new Date(),
      notes: `Needs a human reply — customer asked: "${originalMessage}"${reason ? ` (${reason})` : ''}`,
    },
    actorId,
  );

  const holdingMessage =
    "Thanks for reaching out! I'm looping in one of our specialists to help with this — they'll get back to you personally shortly.";
  const result = await sendWhatsAppFreeformText(lead.mobileNumber, holdingMessage);
  if (result.success) {
    await logCommunication(lead.id, 'OUTBOUND', holdingMessage);
  }
}

async function processInboundTextMessage(input: {
  waId: string;
  text: string;
  contactName: string;
  referral?: WhatsAppReferral;
}): Promise<void> {
  const { lead, eligible } = await resolveLeadForInboundMessage(
    input.waId,
    input.contactName,
    input.referral,
  );

  if (!lead || !eligible) {
    logger.info(
      { waId: input.waId },
      'Inbound WhatsApp message ignored — not an Instagram-attributed lead',
    );
    return;
  }

  await logCommunication(lead.id, 'INBOUND', input.text);

  const treatmentContext = await buildTreatmentContext();
  const decision = await generateWhatsAppReply({
    customerMessage: input.text,
    customerName: input.contactName,
    treatmentContext,
  });

  if (!decision || decision.action === 'escalate' || !decision.message) {
    await escalateToStaff(lead, input.text, decision?.escalationReason);
    return;
  }

  const result = await sendWhatsAppFreeformText(lead.mobileNumber, decision.message);
  if (result.success) {
    await logCommunication(lead.id, 'OUTBOUND', decision.message);
  } else {
    logger.error({ leadId: lead.id, error: result.error }, 'Failed to send WhatsApp bot reply');
  }
}

export async function handleInboundWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const { value } = change;
      for (const message of value.messages ?? []) {
        if (message.type !== 'text' || !message.text?.body) continue;
        const contactName =
          value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name ?? '';
        try {
          await processInboundTextMessage({
            waId: message.from,
            text: message.text.body,
            contactName,
            referral: message.referral,
          });
        } catch (err) {
          logger.error({ err, waId: message.from }, 'Failed to process inbound WhatsApp message');
        }
      }
    }
  }
}
