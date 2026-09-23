import { env } from '../../config/env';
import { logger } from '../../config/logger';

// Pluggable notification interface for follow-up reminders (call/WhatsApp/SMS/
// email — spec section 12: "Follow-up Engine"). CALL/SMS/EMAIL have no real
// provider wired up (that needs its own credentials — Twilio/SendGrid/etc.)
// and always fall back to logging. WHATSAPP is wired to the real Meta Cloud
// API once WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID are configured
// (see WhatsAppCloudApiProvider below); until then it also just logs.

export type NotificationChannel = 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL';

export interface NotificationMessage {
  channel: NotificationChannel;
  to: string;
  message: string;
  // WhatsApp Business Platform only allows a business to *initiate* a
  // conversation (as opposed to replying within an existing 24h
  // customer-service window) using a pre-approved message template — a
  // freeform `message` alone cannot be delivered that way. When channel is
  // WHATSAPP, templateName + templateParams (mapped positionally onto the
  // template's {{1}}, {{2}}, ... placeholders) are required for the real
  // provider; `message` is still used for the console fallback and for the
  // CommunicationLog record either way.
  templateName?: string;
  templateParams?: string[];
}

export interface NotificationResult {
  success: boolean;
  providerRef?: string;
  error?: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<NotificationResult>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<NotificationResult> {
    logger.info(
      { channel: message.channel, to: message.to },
      'Notification (no provider configured — logged only)',
    );
    return { success: true };
  }
}

interface WhatsAppSendResponse {
  messages?: { id: string }[];
  error?: { message: string };
}

// Shared low-level sender for both proactive template messages (reminders)
// and freeform text replies (the WhatsApp bot — see whatsappBot.service.ts)
// — same endpoint/auth, just a different `type` payload.
async function postToWhatsAppGraphApi(
  payload: Record<string, unknown>,
): Promise<NotificationResult> {
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });

    const body = (await res.json()) as WhatsAppSendResponse;

    if (!res.ok) {
      logger.error({ status: res.status, body }, 'WhatsApp message send failed');
      return { success: false, error: body.error?.message ?? `HTTP ${res.status}` };
    }

    return { success: true, providerRef: body.messages?.[0]?.id };
  } catch (err) {
    logger.error({ err }, 'WhatsApp message send threw');
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Meta expects the recipient in international format without a leading "+"
// or any separators (e.g. "919876543210").
function toWhatsAppRecipient(to: string): string {
  return to.replace(/[^\d]/g, '');
}

// Sends a WhatsApp template message via the Meta Cloud API:
// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
export class WhatsAppCloudApiProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!message.templateName) {
      logger.error({ to: message.to }, 'WhatsApp send skipped — no approved templateName provided');
      return { success: false, error: 'WhatsApp requires an approved templateName' };
    }

    return postToWhatsAppGraphApi({
      to: toWhatsAppRecipient(message.to),
      type: 'template',
      template: {
        name: message.templateName,
        language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
        ...(message.templateParams?.length
          ? {
              components: [
                {
                  type: 'body',
                  parameters: message.templateParams.map((text) => ({ type: 'text', text })),
                },
              ],
            }
          : {}),
      },
    });
  }
}

// Sends a freeform text WhatsApp message — only deliverable as a *reply*
// within an existing 24h customer-service session (i.e. the customer
// messaged first), unlike the template-only sends above which can be
// business-initiated at any time. Used by the WhatsApp bot to reply to an
// inbound message; not exposed through the NotificationProvider interface
// since it has a narrower, session-scoped precondition the generic
// reminder-sending callers don't account for.
export async function sendWhatsAppFreeformText(
  to: string,
  text: string,
): Promise<NotificationResult> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn({ to }, 'WhatsApp freeform send skipped — WhatsApp Cloud API not configured');
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }
  return postToWhatsAppGraphApi({
    to: toWhatsAppRecipient(to),
    type: 'text',
    text: { body: text },
  });
}

// Sends up to 3 tappable reply buttons alongside a body text — the WhatsApp
// bot's menu entry point (see whatsappBot.service.ts). Same 24h-session
// reply-only rule as sendWhatsAppFreeformText. A tapped button comes back
// as its own inbound message (type "interactive", not "text") carrying the
// button's id, which the bot matches to route the workflow.
export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
): Promise<NotificationResult> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn({ to }, 'WhatsApp buttons send skipped — WhatsApp Cloud API not configured');
    return { success: false, error: 'WhatsApp Cloud API not configured' };
  }
  return postToWhatsAppGraphApi({
    to: toWhatsAppRecipient(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

const consoleProvider = new ConsoleNotificationProvider();
const whatsAppProvider =
  env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID ? new WhatsAppCloudApiProvider() : null;

// Routes WHATSAPP-channel messages to the real Cloud API provider once it's
// configured; every other channel (and WhatsApp itself, until configured)
// falls back to logging only.
class RoutingNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (message.channel === 'WHATSAPP' && whatsAppProvider) {
      return whatsAppProvider.send(message);
    }
    return consoleProvider.send(message);
  }
}

export const notificationProvider: NotificationProvider = new RoutingNotificationProvider();
