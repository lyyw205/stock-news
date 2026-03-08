import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify CRON_SECRET for cron endpoints.
 * Returns a NextResponse error if auth fails, or null if auth passes.
 */
export function verifyCronSecret(
  request: NextRequest,
  endpointName: string
): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(`[${endpointName}] CRON_SECRET not configured`);
    return NextResponse.json(
      { success: false, error: 'server_configuration_error', message: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
