import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotifications } from '@/lib/notifications/dispatcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for notification dispatch

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting notification dispatch cron job...');

    // Dispatch notifications for articles from last 30 minutes
    const result = await dispatchNotifications({
      sinceMinutes: 30,
      batchSize: 50,
    });

    console.log('Notification dispatch completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Notification dispatch completed',
      result,
    });
  } catch (error) {
    console.error('Notification dispatch cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
