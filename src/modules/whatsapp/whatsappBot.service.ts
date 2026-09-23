import { AppointmentStatus, BotPendingIntent, LeadSource, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { generateWhatsAppReply } from '../../common/providers/ai.provider';
import {
  sendWhatsAppButtons,
  sendWhatsAppFreeformText,
} from '../../common/providers/notification.provider';
import { ingestLead } from '../leads/lead.service';
import { createFollowUp } from '../followups/followup.service';

// Handles inbound WhatsApp messages (see whatsappBot.controller.ts's webhook
// receiver) for Instagram-originated conversations only, per the clinic's
// choice: general questions (what a treatment involves, pricing — which
// always gets redirected to a consultation, never a number) get an
// AI-drafted reply; anything medical, a complaint, or the AI isn't confident
// about gets escalated to staff as a FollowUp instead of auto-replied.
//
// Two structured workflows on top of that free-text Q&A, triggered either by
// tapping a button (see BUTTON: menu below) or by the AI recognizing intent
// in free text:
// - "Book an appointment": the app does NOT create a real Appointment row
//   itself (no doctor-availability system exists yet — see README) — it
//   asks for the treatment + preferred date/time, then hands that off to
//   staff as a FollowUp to actually confirm, same as the medical-question
//   escalation path.
// - "Check my appointment": a deterministic DB lookup (never AI-generated,
//   so it can't hallucinate a date) of the lead's converted patient's next
//   upcoming appointment.

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
  interactive?: { type: string; button_reply?: { id: string; title: string } };
  referral?: WhatsAppReferral;
}
interface WhatsAppWebhookValue {
  contacts?: { profile?: { name?: string }; wa_id: string }[];
  messages?: WhatsAppInboundMessage[];
}
export interface WhatsAppWebhookPayload {
  entry?: { changes?: { field: string; value: WhatsAppWebhookValue }[] }[];
}

const BUTTON_BOOK_APPOINTMENT = 'book_appointment';
const BUTTON_CHECK_APPOINTMENT = 'check_appointment';
// Short, exact-match greetings only — anything longer/more specific goes
// through the AI classifier instead, so a real question isn't swallowed by
// the menu.
const MENU_TRIGGER_WORDS = new Set([
  'hi',
  'hello',
  'hey',
  'menu',
  'start',
  'namaste',
  'hii',
  'helo',
]);

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

async function sendAndLog(lead: { id: string; mobileNumber: string }, text: string): Promise<void> {
  const result = await sendWhatsAppFreeformText(lead.mobileNumber, text);
  if (result.success) {
    await logCommunication(lead.id, 'OUTBOUND', text);
  } else {
    logger.error({ leadId: lead.id, error: result.error }, 'Failed to send WhatsApp bot message');
  }
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

  await sendAndLog(
    lead,
    "Thanks for reaching out! I'm looping in one of our specialists to help with this — they'll get back to you personally shortly.",
  );
}

// "Book an appointment" workflow, step 1: ask for the details, and remember
// (via Lead.whatsappPendingIntent) that the *next* message from this lead
// is the answer, not a fresh message to classify.
async function startBookingWorkflow(lead: { id: string; mobileNumber: string }): Promise<void> {
  await prisma.lead.update({
    where: { id: lead.id },
    data: { whatsappPendingIntent: BotPendingIntent.AWAITING_BOOKING_DETAILS },
  });
  await sendAndLog(
    lead,
    "I'd love to help you book! Could you tell me which treatment you're interested in, and your preferred date and time? I'll pass it straight to our team to confirm with you.",
  );
}

// "Book an appointment" workflow, step 2: whatever the lead replies with is
// treated as their booking request, verbatim — a human on staff always
// confirms the actual appointment (see the "Booking depth" decision in
// README.md), so there's no need to parse/validate it here.
async function completeBookingWorkflow(
  lead: { id: string; mobileNumber: string },
  detailsText: string,
): Promise<void> {
  const actorId = await getSystemActorId();
  const assignedToId = await resolveEscalationAssigneeId();

  await createFollowUp(
    {
      leadId: lead.id,
      assignedToId,
      channel: 'WHATSAPP',
      dueAt: new Date(),
      notes: `WhatsApp booking request: "${detailsText}"`,
    },
    actorId,
  );

  await prisma.lead.update({
    where: { id: lead.id },
    data: { whatsappPendingIntent: BotPendingIntent.NONE },
  });

  await sendAndLog(
    lead,
    "Got it, thank you! I've passed this to our team and they'll confirm your appointment with you shortly.",
  );
}

// Deterministic DB lookup — deliberately never AI-generated, so it can't
// hallucinate a date/doctor. Appointments belong to Patients, not Leads, so
// this only has an answer once the lead has actually converted.
async function checkAppointment(lead: {
  id: string;
  mobileNumber: string;
  convertedPatientId: string | null;
}): Promise<void> {
  if (!lead.convertedPatientId) {
    await sendAndLog(
      lead,
      "Looks like you haven't booked with us yet! Want to get your first appointment scheduled? Just let me know which treatment you're interested in and your preferred date/time.",
    );
    return;
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      patientId: lead.convertedPatientId,
      status: AppointmentStatus.BOOKED,
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: 'asc' },
    include: {
      doctor: { select: { firstName: true, lastName: true } },
      treatment: { select: { name: true } },
    },
  });

  if (!appointment) {
    await sendAndLog(
      lead,
      "I don't see any upcoming appointments for you right now. Want to book one? Just let me know which treatment and your preferred date/time.",
    );
    return;
  }

  const { date, time } = formatDateTimeIST(appointment.scheduledDate);
  const treatmentPart = appointment.treatment ? ` for ${appointment.treatment.name}` : '';
  await sendAndLog(
    lead,
    `Your next appointment${treatmentPart} is on ${date} at ${time} with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}. Reply here if you need to reschedule or cancel and our team will help.`,
  );
}

function formatDateTimeIST(date: Date): { date: string; time: string } {
  return {
    date: date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

async function sendMenu(lead: { id: string; mobileNumber: string }): Promise<void> {
  const bodyText = "Hi! 👋 I'm the Lumine Aesthetics assistant. What can I help you with?";
  const result = await sendWhatsAppButtons(lead.mobileNumber, bodyText, [
    { id: BUTTON_BOOK_APPOINTMENT, title: 'Book appointment' },
    { id: BUTTON_CHECK_APPOINTMENT, title: 'Check my appointment' },
  ]);
  if (result.success) {
    await logCommunication(lead.id, 'OUTBOUND', bodyText);
  } else {
    logger.error({ leadId: lead.id, error: result.error }, 'Failed to send WhatsApp bot menu');
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

  if (lead.whatsappPendingIntent === BotPendingIntent.AWAITING_BOOKING_DETAILS) {
    await completeBookingWorkflow(lead, input.text);
    return;
  }

  if (MENU_TRIGGER_WORDS.has(input.text.trim().toLowerCase())) {
    await sendMenu(lead);
    return;
  }

  const treatmentContext = await buildTreatmentContext();
  const decision = await generateWhatsAppReply({
    customerMessage: input.text,
    customerName: input.contactName,
    treatmentContext,
  });

  if (decision?.action === 'start_booking') {
    await startBookingWorkflow(lead);
    return;
  }
  if (decision?.action === 'check_appointment') {
    await checkAppointment(lead);
    return;
  }
  if (!decision || decision.action === 'escalate' || !decision.message) {
    await escalateToStaff(lead, input.text, decision?.escalationReason);
    return;
  }

  await sendAndLog(lead, decision.message);
}

async function processInboundInteractiveMessage(input: {
  waId: string;
  buttonId: string;
  contactName: string;
}): Promise<void> {
  // Button taps never carry a referral — by this point in the conversation
  // the lead was already created (from an earlier text message that did),
  // so eligibility rests entirely on the existing lead's own source.
  const { lead, eligible } = await resolveLeadForInboundMessage(input.waId, input.contactName);
  if (!lead || !eligible) {
    logger.info(
      { waId: input.waId },
      'Inbound WhatsApp button tap ignored — not an Instagram-attributed lead',
    );
    return;
  }

  await logCommunication(lead.id, 'INBOUND', `[tapped: ${input.buttonId}]`);

  if (input.buttonId === BUTTON_BOOK_APPOINTMENT) {
    await startBookingWorkflow(lead);
    return;
  }
  if (input.buttonId === BUTTON_CHECK_APPOINTMENT) {
    await checkAppointment(lead);
    return;
  }
  logger.warn({ buttonId: input.buttonId }, 'Unrecognized WhatsApp button id');
}

export async function handleInboundWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const { value } = change;
      for (const message of value.messages ?? []) {
        const contactName =
          value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name ?? '';
        try {
          if (message.type === 'text' && message.text?.body) {
            await processInboundTextMessage({
              waId: message.from,
              text: message.text.body,
              contactName,
              referral: message.referral,
            });
          } else if (message.type === 'interactive' && message.interactive?.button_reply) {
            await processInboundInteractiveMessage({
              waId: message.from,
              buttonId: message.interactive.button_reply.id,
              contactName,
            });
          }
        } catch (err) {
          logger.error({ err, waId: message.from }, 'Failed to process inbound WhatsApp message');
        }
      }
    }
  }
}
