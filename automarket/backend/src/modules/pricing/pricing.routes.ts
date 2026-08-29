import { Router } from 'express';
import { sensitiveRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as pricingController from './pricing.controller';
import {
  onRoadQuoteSchema,
  onRoadTeaserQuerySchema,
  quoteIdParamSchema,
} from './pricing.validation';

const router = Router();

router.get(
  '/on-road/teaser',
  validate({ query: onRoadTeaserQuerySchema }),
  pricingController.getTeaser,
);
router.post(
  '/on-road',
  sensitiveRateLimiter,
  validate({ body: onRoadQuoteSchema }),
  pricingController.createQuote,
);
router.get('/on-road/:id', validate({ params: quoteIdParamSchema }), pricingController.getQuote);

export default router;
