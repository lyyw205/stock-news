/**
 * Report Fetch API
 * GET: Fetch analysis report by article ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch report with article and summary info (including visual scores)
    const { data: report, error } = await supabase
      .from('analysis_reports')
      .select(`
        *,
        news_articles!inner (
          ticker,
          title,
          url,
          pub_date
        ),
        summaries!inner (
          summary_text,
          total_score,
          sentiment,
          score_impact,
          score_urgency,
          score_certainty,
          score_durability,
          score_attention,
          score_relevance,
          score_sector_impact,
          score_institutional_interest,
          score_volatility
        )
      `)
      .eq('article_id', articleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Report not found', exists: false },
          { status: 404 }
        );
      }
      throw error;
    }

    // Transform to camelCase
    const transformedReport = {
      id: report.id,
      articleId: report.article_id,
      summaryId: report.summary_id,
      generationType: report.generation_type,
      coreSummary: report.core_summary,
      bullishFactors: report.bullish_factors,
      bearishFactors: report.bearish_factors,
      overallAssessment: report.overall_assessment,
      priceImpact: {
        short: report.price_impact_short,
        medium: report.price_impact_medium,
        long: report.price_impact_long,
        summary: report.price_impact_summary,
      },
      riskFactors: report.risk_factors,
      opportunityFactors: report.opportunity_factors,
      newsBackground: report.news_background || null,
      relatedStocks: report.related_stocks || [],
      timelineCatalysts: report.timeline_catalysts || [],
      keyTerms: report.key_terms || [],
      investorChecklist: report.investor_checklist || [],
      processingTimeMs: report.processing_time_ms,
      createdAt: report.created_at,
      article: {
        ticker: report.news_articles.ticker,
        title: report.news_articles.title,
        url: report.news_articles.url,
        pubDate: report.news_articles.pub_date,
      },
      summary: {
        summaryText: report.summaries.summary_text,
        totalScore: report.summaries.total_score,
        sentiment: report.summaries.sentiment,
      },
      scores: {
        visual: {
          impact: report.summaries.score_impact,
          urgency: report.summaries.score_urgency,
          certainty: report.summaries.score_certainty,
          durability: report.summaries.score_durability,
          attention: report.summaries.score_attention,
          relevance: report.summaries.score_relevance,
        },
        hidden: {
          sectorImpact: report.summaries.score_sector_impact,
          institutionalInterest: report.summaries.score_institutional_interest,
          volatility: report.summaries.score_volatility,
        },
      },
    };

    return NextResponse.json({
      success: true,
      report: transformedReport,
      exists: true,
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
