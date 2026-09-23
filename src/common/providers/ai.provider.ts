import { env } from '../../config/env';
import { logger } from '../../config/logger';

// Thin wrapper around the Claude Messages API, used by the WhatsApp bot
// (see whatsappBot.service.ts) to draft a reply to an inbound customer
// message or decide the message needs a human instead. Uses forced tool-use
// so the model's output is always structured — never free text we'd have to
// parse heuristically.

export interface BotDecision {
  action: 'reply' | 'escalate' | 'start_booking' | 'check_appointment';
  message?: string;
  escalationReason?: string;
}

const RESPOND_TOOL = {
  name: 'respond_to_customer',
  description: "Decide how to respond to the customer's WhatsApp message.",
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['reply', 'escalate', 'start_booking', 'check_appointment'],
        description:
          '"reply" for general questions you can safely answer yourself (what a treatment involves, general clinic info, redirecting pricing questions to a consultation). "start_booking" if the customer wants to book/schedule a new appointment — the app will handle asking for details, so just classify the intent, don\'t draft a message for this one. "check_appointment" if they\'re asking about an appointment they already have (when is it, do they have one) — the app looks this up itself. "escalate" for anything involving a medical concern, side effect, complication, complaint, a request to cancel/reschedule an existing appointment, or anything you are not fully confident answering.',
      },
      message: {
        type: 'string',
        description:
          'The WhatsApp reply to send the customer. Required (and only used) when action is "reply". 1-3 short sentences, warm and conversational, no markdown formatting, no more than one emoji and only if it fits naturally.',
      },
      escalationReason: {
        type: 'string',
        description:
          'A brief internal note for staff explaining why this needs a human. Required when action is "escalate".',
      },
    },
    required: ['action'],
  },
} as const;

interface ClaudeToolUseBlock {
  type: 'tool_use';
  input: BotDecision;
}
interface ClaudeMessageResponse {
  content: ({ type: string } & Partial<ClaudeToolUseBlock>)[];
}

const SYSTEM_PROMPT_TEMPLATE = `You are a warm, professional WhatsApp assistant for Lumine Aesthetics, a skin/hair/cosmetology clinic in Gurugram, India. A prospective patient messaged in from Instagram.

Rules you must always follow:
- NEVER state a specific price, discount, or number for any treatment, even if asked directly. Pricing always depends on an in-person consultation with a doctor — say that, and offer to help them book one. Do not say "starting from" a number either.
- You may describe what a treatment generally involves, typical duration, and number of sessions in general terms, using the treatment list below. Do not invent details not implied by the list.
- NEVER give medical advice, diagnose a condition, promise a specific outcome, or discuss side effects, risks, contraindications, or allergic reactions — escalate these to a human instead of answering.
- Escalate (do not reply yourself) if the message describes a medical concern or adverse reaction, is a complaint, asks something you're not confident about, or is abusive/spam/unrelated to the clinic.
- Keep replies short (1-3 sentences), warm, and human — like a real front-desk person texting, not a corporate bot.
- If unsure whether to reply or escalate, escalate.

Available treatments (context only — never quote prices from this or anywhere else):
{{TREATMENTS}}`;

export async function generateWhatsAppReply(params: {
  customerMessage: string;
  customerName: string;
  treatmentContext: string;
}): Promise<BotDecision | null> {
  if (!env.ANTHROPIC_API_KEY) {
    logger.warn('AI auto-reply skipped — ANTHROPIC_API_KEY not configured');
    return null;
  }

  const system = SYSTEM_PROMPT_TEMPLATE.replace(
    '{{TREATMENTS}}',
    params.treatmentContext || 'No treatments configured.',
  );

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 500,
        system,
        messages: [
          {
            role: 'user',
            content: `Customer name: ${params.customerName || 'Unknown'}\nMessage: ${params.customerMessage}`,
          },
        ],
        tools: [RESPOND_TOOL],
        tool_choice: { type: 'tool', name: RESPOND_TOOL.name },
      }),
    });

    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, 'Claude API call failed');
      return null;
    }

    const data = (await res.json()) as ClaudeMessageResponse;
    const toolUse = data.content.find(
      (block): block is ClaudeToolUseBlock => block.type === 'tool_use',
    );
    return toolUse?.input ?? null;
  } catch (err) {
    logger.error({ err }, 'Claude API call threw');
    return null;
  }
}
