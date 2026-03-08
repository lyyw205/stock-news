import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotifications } from '@/lib/notifications/dispatcher';
import { verifyCronSecret } from '@/lib/auth/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for notification dispatch

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request, 'send-notifications');
  if (authError) return authError;

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
    console.error('[send-notifications] Cron error:', error);
    return NextResponse.json(
      { success: false, error: 'internal_error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
