/**
 * Social Media Publish API
 * POST endpoint to publish news to selected social media platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/supabase-server';
import { publishToSocialMedia } from '@/lib/social-media/dispatcher';
import { SocialPlatform } from '@/lib/social-media/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { articleIds, platforms } = body;

    // 3. Validate input
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: 'articleIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'platforms must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate platform names
    const validPlatforms: SocialPlatform[] = [
      'telegram',
      'twitter',
      'threads',
      'toss',
    ];
    const invalidPlatforms = platforms.filter(
      (p) => !validPlatforms.includes(p)
    );

    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid platforms: ${invalidPlatforms.join(', ')}`,
          validPlatforms,
        },
        { status: 400 }
      );
    }

    // 4. Publish to social media for each article
    const results = await Promise.allSettled(
      articleIds.map((articleId) =>
        publishToSocialMedia({
          articleId,
          platforms: platforms as SocialPlatform[],
        })
      )
    );

    // 5. Aggregate results
    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    const summaries = successful.map((r) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      return null;
    });

    const errors = failed.map((r) => {
      if (r.status === 'rejected') {
        return r.reason instanceof Error ? r.reason.message : String(r.reason);
      }
      return null;
    });

    // 6. Calculate overall statistics
    const totalSuccessCount = summaries.reduce(
      (sum, s) => sum + (s?.successCount || 0),
      0
    );
    const totalFailureCount = summaries.reduce(
      (sum, s) => sum + (s?.failureCount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      processedArticles: articleIds.length,
      successfulPublishes: successful.length,
      failedPublishes: failed.length,
      totalSuccessCount,
      totalFailureCount,
      summaries: summaries.filter((s) => s !== null),
      errors: errors.filter((e) => e !== null),
    });
  } catch (error) {
    console.error('Error in publish API:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
