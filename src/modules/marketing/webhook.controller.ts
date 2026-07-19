import { LeadSource } from '@prisma/client';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ForbiddenError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { verifyWebhookSignature } from '../../common/utils/webhookSignature';
import { ingestLead } from '../leads/lead.service';
import type { IngestWebhookLeadInput } from './webhook.validation';

const SIGNATURE_HEADER = 'x-webhook-signature';

function verifyOrReject(req: Request, secret: string | undefined, platform: string): void {
  if (!secret) {
    logger.error({ platform }, 'Webhook received but no secret configured for this platform');
    throw new ForbiddenError('This webhook integration is not configured');
  }
  const signature = req.header(SIGNATURE_HEADER);
  if (!signature || !req.rawBody || !verifyWebhookSignature(req.rawBody, signature, secret)) {
    throw new ForbiddenError('Invalid webhook signature');
  }
}

export const receiveFacebookLead = asyncHandler(async (req: Request, res: Response) => {
  verifyOrReject(req, env.MARKETING_WEBHOOK_SECRET_FACEBOOK, 'facebook');
  const input = req.body as IngestWebhookLeadInput;
  await ingestLead({ ...input, source: LeadSource.FACEBOOK_ADS });
  res.status(202).json({ data: { received: true } });
});

export const receiveGoogleLead = asyncHandler(async (req: Request, res: Response) => {
  verifyOrReject(req, env.MARKETING_WEBHOOK_SECRET_GOOGLE, 'google');
  const input = req.body as IngestWebhookLeadInput;
  await ingestLead({ ...input, source: LeadSource.GOOGLE_ADS });
  res.status(202).json({ data: { received: true } });
});
