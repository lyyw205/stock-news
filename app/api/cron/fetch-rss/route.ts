import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRSSSources } from '@/lib/rss/fetcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting RSS fetch cron job...');
    const result = await fetchAllRSSSources();

    console.log('RSS fetch completed:', result);

    return NextResponse.json({
      success: true,
      message: 'RSS fetch completed',
      result,
    });
  } catch (error) {
    console.error('RSS fetch cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
