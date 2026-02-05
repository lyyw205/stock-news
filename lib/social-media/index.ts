/**
 * Social Media Library - Main Export
 * Provides a unified interface for social media publishing
 */

// Export types
export * from './types';

// Export platforms
export * from './platforms';

// Export formatters
export * from './formatters';

// Export dispatcher
export { publishToSocialMedia, getPublishStatus } from './dispatcher';
