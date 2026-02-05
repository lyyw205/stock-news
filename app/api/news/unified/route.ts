/**
 * Unified News API
 * Returns all articles with scores (summary may be NULL for non-auto-published articles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const includeAutoPublished = searchParams.get('includeAutoPublished') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = createServerSupabaseClient();

    // Build query
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

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unified news:', error);
      return NextResponse.json(
        { error: 'Failed to fetch news' },
        { status: 500 }
      );
    }

    // Transform data
    const articles = (data || []).map((article: any) => {
      const summary = Array.isArray(article.summaries)
        ? article.summaries[0]
        : article.summaries;

      return {
        id: article.id,
        summaryId: summary.id,
        ticker: article.ticker,
        title: article.title,
        summary: summary.summary_text, // May be NULL
        url: article.url,
        pubDate: article.pub_date,
        sourceCount: article.source_count,
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
      };
    });

    // Filter by auto-publish status if requested
    const filtered = includeAutoPublished
      ? articles
      : articles.filter((a: any) => !a.autoPublished);

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
