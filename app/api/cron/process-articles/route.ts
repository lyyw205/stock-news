import { NextRequest, NextResponse } from 'next/server';
import { processUnprocessedArticles } from '@/lib/ai/processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for AI processing

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    console.error('Article processing cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
