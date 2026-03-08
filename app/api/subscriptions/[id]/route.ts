import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserFromRequest } from '@/lib/auth/supabase-server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const supabase = createServerSupabaseClient();

    const { data: deleted, error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id');

    if (!error && (!deleted || deleted.length === 0)) {
      return NextResponse.json(
        { error: 'not_found', message: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (error) {
      console.error('[subscriptions] DB error deleting:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to delete subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted',
    });
  } catch (error) {
    console.error('[subscriptions] DELETE error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
