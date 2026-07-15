import { logger } from '../../config/logger';

// Pluggable notification interface for follow-up reminders (call/WhatsApp/SMS/
// email — spec section 12: "Follow-up Engine"). No real messaging provider is
// wired up here — that requires a provider (Twilio, Gupshup, SendGrid, etc.)
// and its API credentials. ConsoleNotificationProvider logs instead of
// sending so the follow-up flow works end-to-end today; swapping in a real
// provider later only touches this file.

export type NotificationChannel = 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL';

export interface NotificationMessage {
  channel: NotificationChannel;
  to: string;
  message: string;
}

export interface NotificationResult {
  success: boolean;
  providerRef?: string;
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

export const notificationProvider: NotificationProvider = new ConsoleNotificationProvider();
