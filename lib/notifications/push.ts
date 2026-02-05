/**
 * Push notification service using Firebase Cloud Messaging (FCM)
 */

import * as admin from 'firebase-admin';
import type { NewsItem } from './templates';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export function getFirebaseApp(): admin.app.App | null {
  // Return null if Firebase is not configured (optional feature)
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.warn('Firebase credentials not configured. Push notifications disabled.');
    return null;
  }

  if (!firebaseApp) {
    try {
      // Check if app already exists
      firebaseApp = admin.app();
    } catch {
      // Initialize new app
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  return firebaseApp;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendPushOptions {
  tokens: string | string[];
  payload: PushNotificationPayload;
  retries?: number;
}

export interface SendPushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

/**
 * Send push notification to device token(s)
 */
export async function sendPushNotification(
  options: SendPushOptions,
): Promise<SendPushResult> {
  const { tokens, payload, retries = 3 } = options;

  const app = getFirebaseApp();

  // If Firebase is not configured, skip push notifications
  if (!app) {
    console.log('Firebase not configured, skipping push notification');
    return {
      success: true,
      successCount: 0,
      failureCount: 0,
    };
  }

  const messaging = admin.messaging(app);
  const deviceTokens = Array.isArray(tokens) ? tokens : [tokens];

  // Validate tokens
  if (deviceTokens.length === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      errors: ['No device tokens provided'],
    };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens: deviceTokens,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    },
    data: payload.data,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'stock_news',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await messaging.sendEachForMulticast(message);

      const errors: string[] = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            errors.push(`Token ${idx}: ${resp.error?.message || 'Unknown error'}`);
          }
        });
      }

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error(
        `FCM push notification error (attempt ${attempt + 1}/${retries}):`,
        error,
      );

      if (attempt === retries - 1) {
        return {
          success: false,
          successCount: 0,
          failureCount: deviceTokens.length,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    successCount: 0,
    failureCount: deviceTokens.length,
    errors: ['Failed to send push notification after retries'],
  };
}

/**
 * Create push notification payload from news item
 */
export function createNewsNotificationPayload(
  news: NewsItem,
): PushNotificationPayload {
  return {
    title: `[${news.ticker}] ${news.title}`,
    body: news.summary,
    data: {
      ticker: news.ticker,
      url: news.url,
      pubDate: news.pubDate.toISOString(),
    },
  };
}

/**
 * Create push notification payload for multiple news items (digest)
 */
export function createDigestNotificationPayload(
  ticker: string,
  count: number,
): PushNotificationPayload {
  return {
    title: `[${ticker}] 새로운 뉴스 ${count}건`,
    body: `${ticker} 종목에 ${count}건의 새로운 뉴스가 있습니다.`,
    data: {
      ticker,
      type: 'digest',
      count: count.toString(),
    },
  };
}

/**
 * Validate FCM device token format
 */
export function isValidFCMToken(token: string): boolean {
  // FCM tokens are typically 152+ characters long
  return token.length >= 100 && /^[a-zA-Z0-9_-]+$/.test(token);
}

/**
 * Test Firebase connection
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const app = getFirebaseApp();
    if (!app) {
      return false;
    }
    // Just check if messaging is accessible
    const messaging = admin.messaging(app);
    return !!messaging;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}
