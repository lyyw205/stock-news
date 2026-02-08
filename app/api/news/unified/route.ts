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

    // Try query with analysis_reports table first
    let data: any[] | null = null;
    let error: any = null;
    let hasReportsTable = true;

    // First attempt: with analysis_reports
    const result = await supabase
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

    // If analysis_reports table doesn't exist, retry without it
    if (result.error && result.error.message?.includes('analysis_reports')) {
      hasReportsTable = false;
      const fallbackResult = await supabase
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
    const articles = (data || []).map((article: any) => {
      const summary = Array.isArray(article.summaries)
        ? article.summaries[0]
        : article.summaries;

      // Check if analysis report exists (only if table exists)
      const hasReport = hasReportsTable
        ? (Array.isArray(article.analysis_reports)
            ? article.analysis_reports.length > 0
            : !!article.analysis_reports)
        : false;

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
        hasReport,
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
