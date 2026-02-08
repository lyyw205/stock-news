/**
 * Report Generation API
 * POST: Generate analysis report for an article
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAnalysisReport, saveAnalysisReport, getReportByArticleId } from '@/lib/ai/report';
import type { GenerationType } from '@/lib/types/report';

export async function POST(request: NextRequest) {
  try {
    const { articleId, generationType = 'manual' } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if report already exists
    const existingReport = await getReportByArticleId(supabase, articleId);
    if (existingReport) {
      return NextResponse.json({
        success: true,
        reportId: existingReport.id,
        message: 'Report already exists',
        isNew: false,
      });
    }

    // Fetch article and summary
    const { data: article, error: articleError } = await supabase
      .from('news_articles')
      .select(`
        id,
        title,
        description,
        summaries!inner (
          id,
          summary_text,
          total_score
        )
      `)
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const summary = Array.isArray(article.summaries)
      ? article.summaries[0]
      : article.summaries;

    // Generate report
    const { report, processingTimeMs } = await generateAnalysisReport(
      article.title,
      article.description || '',
      summary.summary_text,
    );

    // Save report
    const { id: reportId } = await saveAnalysisReport(
      supabase,
      articleId,
      summary.id,
      report,
      generationType as GenerationType,
      processingTimeMs,
    );

    return NextResponse.json({
      success: true,
      reportId,
      processingTimeMs,
      isNew: true,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
