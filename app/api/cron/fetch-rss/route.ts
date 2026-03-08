import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRSSSources } from '@/lib/rss/fetcher';
import { verifyCronSecret } from '@/lib/auth/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request, 'fetch-rss');
  if (authError) return authError;

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
    console.error('[fetch-rss] Cron error:', error);
    return NextResponse.json(
      { success: false, error: 'internal_error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
