import { Router } from 'express';
import * as reviewsController from './reviews.controller';

const router = Router();

// Public, unauthenticated — powers the marketing website's Testimonials
// page with real Google Business Profile reviews. Not gated behind
// authenticate(): there is nothing sensitive here, only a business's public
// review data (already cached server-side, see reviews.service.ts).
router.get('/google', reviewsController.getGoogleReviews);

export default router;
