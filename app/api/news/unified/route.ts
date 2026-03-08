/**
 * Unified News API
 * Returns all articles with scores (summary may be NULL for non-auto-published articles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserFromRequest } from '@/lib/auth/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const includeAutoPublished = searchParams.get('includeAutoPublished') !== 'false';
    const MAX_LIMIT = 500;
    const rawLimit = parseInt(searchParams.get('limit') || '100') || 100;
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
    const category = searchParams.get('category') || null; // 'stock' | 'crypto' | null (all)

    const supabase = createServerSupabaseClient();

    // Try query with analysis_reports table first
    let data: Record<string, unknown>[] | null = null;
    let error: { message?: string; code?: string } | null = null;
    let hasReportsTable = true;

    // First attempt: with analysis_reports
    let query = supabase
      .from('news_articles')
      .select(
        `
        id,
        ticker,
        title,
        url,
        pub_date,
        source_count,
        category,
        summaries!inner (
          id,
          summary_text,
          total_score,
          sentiment,
          auto_published,
          auto_published_at,
          social_posted,
          social_posted_at,
          score_impact,
          score_urgency,
          score_certainty,
          score_durability,
          score_attention,
          score_relevance
        ),
        analysis_reports (
          id
        )
      `
      )
      .eq('is_processed', true)
      .gte('summaries.total_score', minScore)
      .order('pub_date', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const result = await query;

    // If analysis_reports table doesn't exist, retry without it
    if (result.error && result.error.message?.includes('analysis_reports')) {
      console.warn('[unified] analysis_reports table not found, falling back:', result.error.message);
      hasReportsTable = false;
      let fallbackQuery = supabase
        .from('news_articles')
        .select(
          `
          id,
          ticker,
          title,
          url,
          pub_date,
          source_count,
          category,
          summaries!inner (
            id,
            summary_text,
            total_score,
            sentiment,
            auto_published,
            auto_published_at,
            social_posted,
            social_posted_at,
            score_impact,
            score_urgency,
            score_certainty,
            score_durability,
            score_attention,
            score_relevance
          )
        `
        )
        .eq('is_processed', true)
        .gte('summaries.total_score', minScore)
        .order('pub_date', { ascending: false })
        .limit(limit);

      if (category) {
        fallbackQuery = fallbackQuery.eq('category', category);
      }

      const fallbackResult = await fallbackQuery;

      data = fallbackResult.data;
      error = fallbackResult.error;
    } else {
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching unified news:', error);
      return NextResponse.json(
        { error: 'Failed to fetch news' },
        { status: 500 }
      );
    }

    // Transform data
    const articles = (data || []).map((article: Record<string, unknown>) => {
      const summaries = article.summaries as Record<string, unknown> | Record<string, unknown>[];
      const summary = Array.isArray(summaries) ? summaries[0] : summaries;

      // Check if analysis report exists (only if table exists)
      const reports = article.analysis_reports as Record<string, unknown>[] | Record<string, unknown> | undefined;
      const hasReport = hasReportsTable
        ? (Array.isArray(reports)
            ? reports.length > 0
            : !!reports)
        : false;

      return {
        id: article.id,
        summaryId: (summary as Record<string, unknown>).id,
        ticker: article.ticker,
        title: article.title,
        summary: (summary as Record<string, unknown>).summary_text, // May be NULL
        url: article.url,
        pubDate: article.pub_date,
        sourceCount: article.source_count,
        category: (article.category as string) || 'stock',
        scores: {
          visual: {
            impact: summary.score_impact,
            urgency: summary.score_urgency,
            certainty: summary.score_certainty,
            durability: summary.score_durability,
            attention: summary.score_attention,
            relevance: summary.score_relevance,
          },
          sentiment: summary.sentiment,
          totalScore: summary.total_score,
        },
        autoPublished: summary.auto_published,
        autoPublishedAt: summary.auto_published_at,
        socialPosted: summary.social_posted,
        socialPostedAt: summary.social_posted_at,
        hasReport,
      };
    });

    // Filter by auto-publish status if requested
    const filtered = includeAutoPublished
      ? articles
      : articles.filter((a) => !a.autoPublished);

    return NextResponse.json({
      success: true,
      articles: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error in unified news API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
