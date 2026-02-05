import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  getUserFromRequest,
} from '@/lib/auth/supabase-server';
import { getMockNews, MOCK_TICKERS } from '@/lib/mock/news-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const ticker = searchParams.get('ticker'); // Optional: filter by specific ticker

    // DEMO MODE: Return mock data without authentication
    if (process.env.DEMO_MODE === 'true') {
      const mockData = getMockNews({ page, limit, ticker: ticker || undefined });

      return NextResponse.json({
        news: mockData.news,
        total: mockData.total,
        page,
        limit,
        hasMore: mockData.hasMore,
        tickers: MOCK_TICKERS,
      });
    }

    // PRODUCTION MODE: Require authentication
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // First, get user's subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('ticker')
      .eq('user_id', user.id);

    if (subsError) {
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        news: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      });
    }

    const subscribedTickers = subscriptions.map((s) => s.ticker);

    // Build query for news articles with summaries
    let query = supabase
      .from('news_articles')
      .select(
        `
        id,
        url,
        title,
        description,
        pub_date,
        ticker,
        created_at,
        summaries!inner (
          summary_text,
          is_useful,
          confidence,
          score_impact,
          score_urgency,
          score_certainty,
          score_durability,
          score_attention,
          score_relevance,
          sentiment,
          total_score
        )
      `,
        { count: 'exact' },
      )
      .in('ticker', subscribedTickers)
      .eq('summaries.is_useful', true)
      .order('pub_date', { ascending: false });

    // Optional ticker filter
    if (ticker && subscribedTickers.includes(ticker)) {
      query = query.eq('ticker', ticker);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: news, error: newsError, count } = await query;

    if (newsError) {
      return NextResponse.json({ error: newsError.message }, { status: 500 });
    }

    // Transform data to flatten summaries
    const transformedNews = (news || []).map((article) => {
      const summary = (article as any).summaries?.[0];
      return {
        id: article.id,
        url: article.url,
        title: article.title,
        description: article.description,
        pubDate: article.pub_date,
        ticker: article.ticker,
        summary: summary?.summary_text || '',
        confidence: summary?.confidence || 0,
        createdAt: article.created_at,
        scores: summary?.total_score
          ? {
              visual: {
                impact: summary.score_impact ?? 5,
                urgency: summary.score_urgency ?? 5,
                certainty: summary.score_certainty ?? 5,
                durability: summary.score_durability ?? 5,
                attention: summary.score_attention ?? 5,
                relevance: summary.score_relevance ?? 5,
              },
              sentiment: summary.sentiment ?? 0,
              totalScore: summary.total_score,
            }
          : undefined,
      };
    });

    const total = count || 0;
    const hasMore = to < total - 1;

    return NextResponse.json({
      news: transformedNews,
      total,
      page,
      limit,
      hasMore,
      tickers: subscribedTickers,
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
