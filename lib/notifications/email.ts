/**
 * Email notification service using Resend
 */

import { Resend } from 'resend';
import type { EmailTemplate } from './templates';

let resendClient: Resend | null = null;

/**
 * Get or create Resend client
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  template: EmailTemplate;
  retries?: number;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email with retry logic
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const {
    to,
    from = 'Korean Stock News <noreply@yourdomain.com>',
    template,
    retries = 3,
  } = options;

  const resend = getResendClient();

  // Validate email addresses
  const emails = Array.isArray(to) ? to : [to];
  for (const email of emails) {
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: `Invalid email address: ${email}`,
      };
    }
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await resend.emails.send({
        from,
        to: emails,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error(
        `Resend email error (attempt ${attempt + 1}/${retries}):`,
        error,
      );

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('Invalid email') ||
          error.message.includes('API key'))
      ) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (attempt === retries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: 'Failed to send email after retries',
  };
}

/**
 * Send email to multiple recipients (batch)
 */
export async function sendBatchEmails(
  recipients: Array<{
    email: string;
    template: EmailTemplate;
  }>,
  options?: {
    from?: string;
    batchSize?: number;
    delayMs?: number;
  },
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: SendEmailResult[];
}> {
  const { from, batchSize = 10, delayMs = 100 } = options || {};

  const results: SendEmailResult[] = [];
  let successful = 0;
  let failed = 0;

  // Process in batches to avoid rate limiting
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const batchPromises = batch.map((recipient) =>
      sendEmail({
        to: recipient.email,
        from,
        template: recipient.template,
      }),
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    // Delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    total: recipients.length,
    successful,
    failed,
    results,
  };
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Test email connection (useful for health checks)
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const resend = getResendClient();
    // Resend doesn't have a ping endpoint, so we just check if client is initialized
    return !!resend;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
