/**
 * On-Demand Summary Generation API
 * Generates summaries only when needed (token optimization)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUserFromRequest } from '@/lib/auth/supabase-server';
import { summarizeNews } from '@/lib/ai/summarize';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. Fetch article from database
    const { data: article, error: articleError } = await supabase
      .from('news_articles')
      .select('id, title, description, category')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 2. Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('summaries')
      .select('id, summary_text')
      .eq('article_id', articleId)
      .single();

    if (existingSummary?.summary_text) {
      // Return cached summary
      return NextResponse.json({
        success: true,
        summary: existingSummary.summary_text,
        cached: true,
      });
    }

    // 3. Generate new summary
    const summaryResult = await summarizeNews(
      article.title,
      article.description || '',
      article.category || 'stock',
    );

    // 4. Update database with generated summary
    if (existingSummary) {
      // Update existing summary record
      const { error: updateError } = await supabase
        .from('summaries')
        .update({ summary_text: summaryResult.summary })
        .eq('id', existingSummary.id);

      if (updateError) {
        console.error('Error updating summary:', updateError);
        return NextResponse.json(
          { error: 'Failed to save summary' },
          { status: 500 }
        );
      }
    } else {
      // Article exists but has no score record yet
      return NextResponse.json(
        { error: 'not_scored', message: 'Article has not been scored yet. Score the article first.' },
        { status: 422 }
      );
    }

    // 5. Return generated summary
    return NextResponse.json({
      success: true,
      summary: summaryResult.summary,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
