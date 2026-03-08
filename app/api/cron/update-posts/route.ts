import { NextRequest, NextResponse } from 'next/server';
import { updateOutdatedPosts } from '@/lib/services/post-updater';
import { verifyCronSecret } from '@/lib/auth/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Cron job: 소셜미디어 포스트 업데이트
 * 뉴스 내용이 변경된 경우 기존 포스트를 수정
 *
 * Vercel Cron: 매 시간마다 실행
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request, 'update-posts');
  if (authError) return authError;

  try {
    console.log('[CRON] Starting post update job...');
    const result = await updateOutdatedPosts();
    console.log('[CRON] Post update completed:', result);

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[update-posts] Cron error:', error);
    return NextResponse.json(
      { success: false, error: 'internal_error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
