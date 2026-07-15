import { Router } from 'express';
import { Role } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/constants/roles';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as campaignController from './campaign.controller';
import * as webhookController from './webhook.controller';
import {
  createCampaignSchema,
  idParamSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
} from './campaign.validation';
import { ingestWebhookLeadSchema } from './webhook.validation';

const router = Router();

const MARKETING_STAFF = [...ADMIN_ROLES, Role.MARKETING_TEAM] as const;

// Ad-platform webhooks: unauthenticated (the platform is not one of our
// staff), but signature-verified (see webhook.controller.ts) and rate-limited.
router.post(
  '/webhooks/facebook',
  authRateLimiter,
  validate({ body: ingestWebhookLeadSchema }),
  webhookController.receiveFacebookLead,
);
router.post(
  '/webhooks/google',
  authRateLimiter,
  validate({ body: ingestWebhookLeadSchema }),
  webhookController.receiveGoogleLead,
);

router.use(authenticate);

router.post(
  '/campaigns',
  authorize(...MARKETING_STAFF),
  validate({ body: createCampaignSchema }),
  campaignController.createCampaign,
);
router.get(
  '/campaigns',
  authorize(...MARKETING_STAFF),
  validate({ query: listCampaignsQuerySchema }),
  campaignController.listCampaigns,
);
router.get(
  '/campaigns/:id',
  authorize(...MARKETING_STAFF),
  validate({ params: idParamSchema }),
  campaignController.getCampaign,
);
router.get(
  '/campaigns/:id/performance',
  authorize(...MARKETING_STAFF),
  validate({ params: idParamSchema }),
  campaignController.getCampaignPerformance,
);
router.patch(
  '/campaigns/:id',
  authorize(...MARKETING_STAFF),
  validate({ params: idParamSchema, body: updateCampaignSchema }),
  campaignController.updateCampaign,
);

export default router;
