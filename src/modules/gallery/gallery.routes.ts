import { Router } from 'express';
import * as galleryController from './gallery.controller';

const router = Router();

// Public, unauthenticated — powers the marketing website's Gallery page
// with the clinic's real Instagram posts. No sensitive data: only public
// post images/captions, already cached server-side (see instagram.service.ts).
router.get('/instagram', galleryController.getInstagramGallery);

export default router;
