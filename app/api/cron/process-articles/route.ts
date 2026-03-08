import { NextRequest, NextResponse } from 'next/server';
import { processUnprocessedArticles } from '@/lib/ai/processor';
import { verifyCronSecret } from '@/lib/auth/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for AI processing

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request, 'process-articles');
  if (authError) return authError;

  try {
    console.log('Starting article processing cron job...');
    const result = await processUnprocessedArticles(50);
    console.log('Article processing completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Article processing completed',
      result,
    });
  } catch (error) {
    console.error('[process-articles] Cron error:', error);
    return NextResponse.json(
      { success: false, error: 'internal_error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
