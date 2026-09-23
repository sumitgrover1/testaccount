import { Router } from 'express';
import * as whatsappBotController from './whatsappBot.controller';

const router = Router();

// Meta's WhatsApp webhook is unauthenticated (Meta is not one of our staff)
// but signature-verified for POST deliveries (see whatsappBot.controller.ts)
// and covered by the app-wide general rate limiter (app.ts) like every other
// route — no per-route authenticate/authorize here, unlike every other
// module mounted in src/routes/index.ts.
router.get('/webhook', whatsappBotController.verifyWebhook);
router.post('/webhook', whatsappBotController.receiveWebhook);

export default router;
