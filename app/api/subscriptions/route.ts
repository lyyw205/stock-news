import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserFromRequest } from '@/lib/auth/supabase-server';
import { validateTicker, checkSubscriptionLimit } from '@/lib/subscriptions/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticker } = body;

    // Validate ticker
    if (!validateTicker(ticker)) {
      return NextResponse.json(
        { error: 'Invalid ticker format. Must be 6 digits.' },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Check existing subscriptions
    const { data: existing, error: fetchError } = await supabase
      .from('subscriptions')
      .select('ticker')
      .eq('user_id', user.id);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const existingTickers = existing?.map((s) => s.ticker) || [];

    // Check for duplicate
    if (existingTickers.includes(ticker)) {
      return NextResponse.json(
        { error: 'already_subscribed', message: 'You are already subscribed to this ticker' },
        { status: 400 },
      );
    }

    // Check limit
    const limitCheck = checkSubscriptionLimit(existingTickers);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'limit_exceeded',
          message: `You can only subscribe to ${limitCheck.limit} tickers`,
        },
        { status: 400 },
      );
    }

    // Create subscription
    const { error: insertError } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      ticker,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription created',
      remaining: limitCheck.remaining - 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

