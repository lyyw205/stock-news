/**
 * Social Media Status API
 * GET endpoint to check publishing status for a post
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/supabase-server';
import { getPublishStatus } from '@/lib/social-media/dispatcher';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get post ID from params
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      );
    }

    // 3. Get publish status
    const status = await getPublishStatus(postId);

    if (!status) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 4. Return status
    return NextResponse.json({
      success: true,
      post: status,
    });
  } catch (error) {
    console.error('Error in status API:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
