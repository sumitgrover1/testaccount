import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ForbiddenError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { verifyWebhookSignature } from '../../common/utils/webhookSignature';
import { handleInboundWebhook, type WhatsAppWebhookPayload } from './whatsappBot.service';

const SIGNATURE_HEADER = 'x-hub-signature-256';

// Meta's one-time webhook subscription handshake: GET with hub.mode=subscribe
// and a verify token you chose in Meta's App Dashboard. Must echo back
// hub.challenge verbatim as plain text, or the subscription is rejected.
export const verifyWebhook = asyncHandler(async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (
    env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    mode === 'subscribe' &&
    token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    res.status(200).send(challenge);
    return;
  }
  throw new ForbiddenError('WhatsApp webhook verification failed');
});

// Inbound message delivery. Meta requires a fast 2xx ack (it retries
// deliveries that time out or error), so the payload is processed
// asynchronously after responding rather than awaited inline — a slow AI
// call here would otherwise cause duplicate-delivery retries.
export const receiveWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (env.WHATSAPP_APP_SECRET) {
    const signature = req.header(SIGNATURE_HEADER);
    if (
      !signature ||
      !req.rawBody ||
      !verifyWebhookSignature(req.rawBody, signature, env.WHATSAPP_APP_SECRET)
    ) {
      throw new ForbiddenError('Invalid webhook signature');
    }
  } else {
    logger.warn(
      'WhatsApp webhook received without WHATSAPP_APP_SECRET configured — signature not verified',
    );
  }

  res.status(200).json({ received: true });

  handleInboundWebhook(req.body as WhatsAppWebhookPayload).catch((err) => {
    logger.error({ err }, 'WhatsApp inbound webhook processing failed');
  });
});
