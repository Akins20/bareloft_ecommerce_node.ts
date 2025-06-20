import { BaseService } from "../BaseService";
import { PushNotification } from "../../types";
import admin from "firebase-admin";
import { pushConfig } from "../../config";

export interface SendPushRequest {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  badge?: number;
  sound?: string;
  priority?: "normal" | "high";
}

export interface SendPushToTokenRequest {
  deviceToken: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
}

export class PushService extends BaseService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    super();
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: pushConfig.firebase.projectId,
            clientEmail: pushConfig.firebase.clientEmail,
            privateKey: pushConfig.firebase.privateKey.replace(/\\n/g, "\n"),
          }),
        });
      }

      this.messaging = admin.messaging();
    } catch (error) {
      this.handleError("Error initializing Firebase", error);
      throw error;
    }
  }

  /**
   * Send push notification to a user (by userId)
   */
  async sendPush(request: SendPushRequest): Promise<string> {
    try {
      // Get user's device tokens from database
      const deviceTokens = await this.getUserDeviceTokens(request.userId);

      if (deviceTokens.length === 0) {
        throw new Error("No device tokens found for user");
      }

      // Send to all user's devices
      const results = await Promise.allSettled(
        deviceTokens.map((token) =>
          this.sendPushToToken({
            deviceToken: token,
            title: request.title,
            message: request.message,
            data: request.data,
            imageUrl: request.imageUrl,
            actionUrl: request.actionUrl,
          })
        )
      );

      // Count successful sends
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;

      if (successful === 0) {
        throw new Error("Failed to send push notification to any device");
      }

      return `Sent to ${successful}/${deviceTokens.length} devices`;
    } catch (error) {
      this.handleError("Error sending push notification", error);
      throw error;
    }
  }

  /**
   * Send push notification to specific device token
   */
  async sendPushToToken(request: SendPushToTokenRequest): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        token: request.deviceToken,
        notification: {
          title: request.title,
          body: request.message,
          imageUrl: request.imageUrl,
        },
        data: {
          ...request.data,
          actionUrl: request.actionUrl || "",
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            icon: "ic_notification",
            color: "#2D5CFF",
            sound: "default",
            clickAction: request.actionUrl,
          },
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: "/icons/icon-192x192.png",
            badge: "/icons/badge-72x72.png",
            requireInteraction: true,
            actions: request.actionUrl
              ? [
                  {
                    action: "open",
                    title: "View",
                  },
                ]
              : undefined,
          },
        },
      };

      const response = await this.messaging.send(message);
      return response;
    } catch (error) {
      this.handleError("Error sending push to token", error);
      throw error;
    }
  }

  /**
   * Send order confirmation push
   */
  async sendOrderConfirmation(
    userId: string,
    customerName: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<string> {
    return this.sendPush({
      userId,
      title: "Order Confirmed! 🎉",
      message: `Hi ${customerName}, your order ${orderNumber} (₦${totalAmount.toLocaleString()}) has been confirmed.`,
      data: {
        type: "order_confirmation",
        orderNumber,
        amount: totalAmount.toString(),
      },
      actionUrl: `/orders/${orderNumber}`,
    });
  }

  /**
   * Send order shipped push
   */
  async sendOrderShipped(
    userId: string,
    customerName: string,
    orderNumber: string,
    trackingNumber?: string
  ): Promise<string> {
    return this.sendPush({
      userId,
      title: "Order Shipped! 🚚",
      message: `Hi ${customerName}, your order ${orderNumber} is on its way!${trackingNumber ? ` Track: ${trackingNumber}` : ""}`,
      data: {
        type: "order_shipped",
        orderNumber,
        trackingNumber: trackingNumber || "",
      },
      actionUrl: `/orders/${orderNumber}/tracking`,
    });
  }

  /**
   * Send order delivered push
   */
  async sendOrderDelivered(
    userId: string,
    customerName: string,
    orderNumber: string
  ): Promise<string> {
    return this.sendPush({
      userId,
      title: "Order Delivered! ✅",
      message: `Hi ${customerName}, your order ${orderNumber} has been delivered. Enjoy your purchase!`,
      data: {
        type: "order_delivered",
        orderNumber,
      },
      actionUrl: `/orders/${orderNumber}/review`,
    });
  }

  /**
   * Send payment successful push
   */
  async sendPaymentSuccessful(
    userId: string,
    customerName: string,
    orderNumber: string,
    amount: number
  ): Promise<string> {
    return this.sendPush({
      userId,
      title: "Payment Successful! 💳",
      message: `Hi ${customerName}, your payment of ₦${amount.toLocaleString()} for order ${orderNumber} was successful.`,
      data: {
        type: "payment_successful",
        orderNumber,
        amount: amount.toString(),
      },
      actionUrl: `/orders/${orderNumber}`,
    });
  }

  /**
   * Send abandoned cart reminder
   */
  async sendAbandonedCartReminder(
    userId: string,
    customerName: string,
    itemCount: number,
    cartTotal: number
  ): Promise<string> {
    return this.sendPush({
      userId,
      title: "Don't forget your cart! 🛒",
      message: `Hi ${customerName}, you have ${itemCount} items (₦${cartTotal.toLocaleString()}) waiting in your cart.`,
      data: {
        type: "abandoned_cart",
        itemCount: itemCount.toString(),
        cartTotal: cartTotal.toString(),
      },
      actionUrl: "/cart",
    });
  }

  /**
   * Send product back in stock push
   */
  async sendProductBackInStock(
    userId: string,
    customerName: string,
    productName: string,
    productId: string
  ): Promise<string> {
    return this.sendPush({
      userId,
      title: "Back in Stock! 📦",
      message: `Hi ${customerName}, ${productName} is back in stock! Get yours now.`,
      data: {
        type: "product_back_in_stock",
        productId,
        productName,
      },
      actionUrl: `/products/${productId}`,
    });
  }

  /**
   * Send promotional push
   */
  async sendPromotion(
    userId: string,
    customerName: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<string> {
    return this.sendPush({
      userId,
      title,
      message: `Hi ${customerName}, ${message}`,
      data: {
        type: "promotion",
        title,
      },
      actionUrl: actionUrl || "/products",
    });
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkPush(requests: SendPushRequest[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ userId: string; messageId?: string; error?: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      results: [] as Array<{
        userId: string;
        messageId?: string;
        error?: string;
      }>,
    };

    for (const request of requests) {
      try {
        const messageId = await this.sendPush(request);
        results.results.push({
          userId: request.userId,
          messageId,
        });
        results.successful++;
      } catch (error) {
        results.results.push({
          userId: request.userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Subscribe user to topic (for broadcast notifications)
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<void> {
    try {
      await this.messaging.subscribeToTopic(deviceTokens, topic);
    } catch (error) {
      this.handleError("Error subscribing to topic", error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from topic
   */
  async unsubscribeFromTopic(
    deviceTokens: string[],
    topic: string
  ): Promise<void> {
    try {
      await this.messaging.unsubscribeFromTopic(deviceTokens, topic);
    } catch (error) {
      this.handleError("Error unsubscribing from topic", error);
      throw error;
    }
  }

  /**
   * Send notification to topic (broadcast)
   */
  async sendToTopic(
    topic: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const messagePayload: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body: message,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            icon: "ic_notification",
            color: "#2D5CFF",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      };

      const response = await this.messaging.send(messagePayload);
      return response;
    } catch (error) {
      this.handleError("Error sending to topic", error);
      throw error;
    }
  }

  /**
   * Validate device token
   */
  async validateDeviceToken(token: string): Promise<boolean> {
    try {
      await this.messaging.send(
        {
          token,
          data: { test: "true" },
        },
        true
      ); // Dry run
      return true;
    } catch (error) {
      return false;
    }
  }

  // Private helper methods

  /**
   * Get user's device tokens from database
   */
  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      // This would typically query your database for user's device tokens
      // For now, return empty array - implement based on your user device token storage

      // Example implementation:
      // const user = await UserModel.findUnique({
      //   where: { id: userId },
      //   include: { deviceTokens: true }
      // });
      // return user?.deviceTokens.map(dt => dt.token) || [];

      return [];
    } catch (error) {
      this.handleError("Error getting user device tokens", error);
      return [];
    }
  }

  /**
   * Clean up invalid device tokens
   */
  async cleanupInvalidTokens(userId: string): Promise<number> {
    try {
      const tokens = await this.getUserDeviceTokens(userId);
      let removedCount = 0;

      for (const token of tokens) {
        const isValid = await this.validateDeviceToken(token);
        if (!isValid) {
          // Remove invalid token from database
          // await this.removeDeviceToken(userId, token);
          removedCount++;
        }
      }

      return removedCount;
    } catch (error) {
      this.handleError("Error cleaning up invalid tokens", error);
      return 0;
    }
  }

  /**
   * Get push notification analytics
   */
  async getPushAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    deliveryRate: number;
    openRate: number;
  }> {
    try {
      // This would typically query your analytics database
      // For now, return placeholder stats
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        deliveryRate: 0,
        openRate: 0,
      };
    } catch (error) {
      this.handleError("Error getting push analytics", error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        deliveryRate: 0,
        openRate: 0,
      };
    }
  }
}
