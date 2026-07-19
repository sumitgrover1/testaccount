import { z } from 'zod';
import { mobileNumberSchema, personNameSchema } from '../../common/validation/primitives';

// Normalized shape our webhook handlers expect after verifying the sender's
// signature. Real Facebook/Google webhooks don't send lead field data inline
// (Facebook's Lead Ads webhook sends only a leadgen_id that must then be
// fetched via a signed Graph API call using the page's access token; Google's
// lead form extensions work similarly) — wiring that up requires the
// platform's real app credentials, which this environment doesn't have. This
// schema is what a configured platform-side transform/relay (or, once
// credentials exist, our own Graph API fetch step) should post here.
export const ingestWebhookLeadSchema = z.object({
  fullName: personNameSchema,
  mobileNumber: mobileNumberSchema,
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  interestedTreatmentId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type IngestWebhookLeadInput = z.infer<typeof ingestWebhookLeadSchema>;
