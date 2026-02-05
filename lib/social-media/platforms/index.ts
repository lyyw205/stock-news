/**
 * Platform publishers index
 * Exports all platform publishers
 */

import { telegramPublisher } from './telegram';
import { twitterPublisher } from './twitter';
import { threadsPublisher } from './threads';
import { tossPublisher } from './toss';
import { PlatformPublisher, SocialPlatform } from '../types';

// Export individual publishers
export { telegramPublisher } from './telegram';
export { twitterPublisher } from './twitter';
export { threadsPublisher } from './threads';
export { tossPublisher } from './toss';

// Map of platform name to publisher
export const platformPublishers: Record<SocialPlatform, PlatformPublisher> = {
  telegram: telegramPublisher,
  twitter: twitterPublisher,
  threads: threadsPublisher,
  toss: tossPublisher,
};

// Get publisher by platform name
export function getPublisher(platform: SocialPlatform): PlatformPublisher {
  const publisher = platformPublishers[platform];
  if (!publisher) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return publisher;
}
