/**
 * Twitter/X Publisher
 * Posts tweets using Twitter API v2 with OAuth 1.0a
 */

import crypto from 'crypto';
import {
  PlatformPublisher,
  FormattedContent,
  PublishResult,
  ErrorCode,
  PLATFORM_CONFIGS,
} from '../types';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

export class TwitterPublisher implements PlatformPublisher {
  name = 'twitter' as const;
  private config = PLATFORM_CONFIGS.twitter;

  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;

  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY || '';
    this.apiSecret = process.env.TWITTER_API_SECRET || '';
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN || '';
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';
  }

  async publish(content: FormattedContent): Promise<PublishResult> {
    const timestamp = new Date();

    // Check configuration
    if (!this.apiKey || !this.apiSecret || !this.accessToken || !this.accessTokenSecret) {
      return {
        platform: this.name,
        success: false,
        error: 'Twitter API credentials not configured',
        errorCode: ErrorCode.AUTH_FAILED,
        timestamp,
      };
    }

    // Validate content length (280 character limit)
    if (content.text.length > (this.config.maxLength || 280)) {
      return {
        platform: this.name,
        success: false,
        error: 'Tweet exceeds 280 character limit',
        errorCode: ErrorCode.CONTENT_TOO_LONG,
        timestamp,
      };
    }

    try {
      const url = `${TWITTER_API_BASE}/tweets`;
      const body = JSON.stringify({ text: content.text });

      const authHeader = this.generateOAuthHeader('POST', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body,
      });

      const data = await response.json();

      if (response.ok && data.data) {
        return {
          platform: this.name,
          success: true,
          messageId: data.data.id,
          timestamp,
          responseData: {
            id: data.data.id,
            text: data.data.text,
          },
        };
      }

      // Handle Twitter API errors
      const errorMessage = data.detail || data.title || 'Unknown Twitter error';
      const errorCode = this.mapTwitterError(response.status);

      return {
        platform: this.name,
        success: false,
        error: errorMessage,
        errorCode,
        timestamp,
        responseData: data,
      };
    } catch (error) {
      return {
        platform: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: ErrorCode.NETWORK_ERROR,
        timestamp,
      };
    }
  }

  private generateOAuthHeader(method: string, url: string): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.apiKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0',
    };

    // Create signature base string
    const sortedParams = Object.keys(oauthParams)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(oauthParams[key])}`)
      .join('&');

    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams),
    ].join('&');

    // Create signing key
    const signingKey = `${this.percentEncode(this.apiSecret)}&${this.percentEncode(this.accessTokenSecret)}`;

    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');

    oauthParams['oauth_signature'] = signature;

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${this.percentEncode(key)}="${this.percentEncode(oauthParams[key])}"`)
      .join(', ');

    return authHeader;
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  private mapTwitterError(statusCode: number): ErrorCode {
    switch (statusCode) {
      case 429:
        return ErrorCode.RATE_LIMIT;
      case 400:
        return ErrorCode.INVALID_CONTENT;
      case 401:
      case 403:
        return ErrorCode.AUTH_FAILED;
      default:
        return ErrorCode.NETWORK_ERROR;
    }
  }
}

// Export singleton instance
export const twitterPublisher = new TwitterPublisher();
