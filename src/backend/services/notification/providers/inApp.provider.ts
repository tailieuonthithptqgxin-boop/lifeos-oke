import { getPrisma } from '../../../db.js';
import { DeliveryResult, NotificationProvider } from '../notification.types.js';

export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = 'in_app' as const;

  async send(
    delivery: {
      id: string;
      userId: string;
      recipient: string;
      subject?: string | null;
      title: string;
      content: string;
      priority: string;
      actionUrl?: string | null;
      actionLabel?: string | null;
      metadata?: string | null;
    },
    userContext: {
      email: string;
      name?: string | null;
    }
  ): Promise<DeliveryResult> {
    try {
      const prisma = getPrisma();

      let metaObj: Record<string, any> = {};
      try {
        if (delivery.metadata) {
          metaObj = JSON.parse(delivery.metadata);
        }
      } catch (e) {}

      const notif = await prisma.notification.create({
        data: {
          userId: delivery.userId,
          title: delivery.title,
          message: delivery.content,
          type: delivery.priority === 'CRITICAL' ? 'alert' : delivery.priority === 'HIGH' ? 'warning' : 'info',
          priority: delivery.priority,
          category: metaObj.category || 'SYSTEM',
          deliveryId: delivery.id,
          actionUrl: delivery.actionUrl,
          actionLabel: delivery.actionLabel,
          read: false
        }
      });

      return {
        success: true,
        channel: 'in_app',
        deliveryId: delivery.id,
        details: { notificationId: notif.id }
      };
    } catch (err: any) {
      console.error('[InAppProvider] Failed to persist in-app notification:', err);
      return {
        success: false,
        channel: 'in_app',
        deliveryId: delivery.id,
        error: err.message
      };
    }
  }
}

export const inAppProvider = new InAppNotificationProvider();
