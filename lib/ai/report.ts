/**
 * Analysis Report Generation
 * 고득점 뉴스에 대한 상세 AI 분석 리포트 생성
 */

import { generateContent } from './gemini';
import { formatAnalysisReportPrompt } from './prompts';
import type { AIReportResponse, GenerationType } from '@/lib/types/report';

/**
 * Parse AI response JSON
 */
function parseReportResponse(text: string): AIReportResponse {
  // Remove markdown code blocks if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  const parsed = JSON.parse(cleanText);

  // Validate required fields
  if (!parsed.coreSummary || typeof parsed.coreSummary !== 'string') {
    throw new Error('Missing or invalid coreSummary');
  }
  if (!Array.isArray(parsed.bullishFactors)) {
    throw new Error('Missing or invalid bullishFactors');
  }
  if (!Array.isArray(parsed.bearishFactors)) {
    throw new Error('Missing or invalid bearishFactors');
  }
  if (!parsed.overallAssessment) {
    throw new Error('Missing overallAssessment');
  }
  if (!parsed.priceImpact || typeof parsed.priceImpact !== 'object') {
    throw new Error('Missing or invalid priceImpact');
  }
  if (!Array.isArray(parsed.riskFactors)) {
    throw new Error('Missing or invalid riskFactors');
  }
  if (!Array.isArray(parsed.opportunityFactors)) {
    throw new Error('Missing or invalid opportunityFactors');
  }

  // Validate overallAssessment value
  const validAssessments = ['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish'];
  if (!validAssessments.includes(parsed.overallAssessment)) {
    throw new Error(`Invalid overallAssessment: ${parsed.overallAssessment}`);
  }

  // New fields with fallbacks for backward compatibility
  if (!parsed.newsBackground || typeof parsed.newsBackground !== 'string') {
    parsed.newsBackground = '';
  }
  if (!Array.isArray(parsed.relatedStocks)) {
    parsed.relatedStocks = [];
  }
  if (!Array.isArray(parsed.timelineCatalysts)) {
    parsed.timelineCatalysts = [];
  }
  if (!Array.isArray(parsed.keyTerms)) {
    parsed.keyTerms = [];
  }
  if (!Array.isArray(parsed.investorChecklist)) {
    parsed.investorChecklist = [];
  }

  return parsed as AIReportResponse;
}

/**
 * Generate analysis report for an article
 */
export async function generateAnalysisReport(
  title: string,
  description: string,
  summary: string | null,
): Promise<{ report: AIReportResponse; processingTimeMs: number }> {
  const startTime = Date.now();

  const prompt = formatAnalysisReportPrompt(title, description, summary);
  const response = await generateContent(prompt);
  const report = parseReportResponse(response);

  const processingTimeMs = Date.now() - startTime;

  return { report, processingTimeMs };
}

/**
 * Save report to database
 */
export async function saveAnalysisReport(
  supabase: any,
  articleId: string,
  summaryId: string,
  report: AIReportResponse,
  generationType: GenerationType,
  processingTimeMs: number,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('analysis_reports')
    .insert({
      article_id: articleId,
      summary_id: summaryId,
      generation_type: generationType,
      core_summary: report.coreSummary,
      bullish_factors: report.bullishFactors,
      bearish_factors: report.bearishFactors,
      overall_assessment: report.overallAssessment,
      price_impact_short: report.priceImpact.short,
      price_impact_medium: report.priceImpact.medium,
      price_impact_long: report.priceImpact.long,
      price_impact_summary: report.priceImpact.summary,
      risk_factors: report.riskFactors,
      opportunity_factors: report.opportunityFactors,
      news_background: report.newsBackground || null,
      related_stocks: report.relatedStocks || [],
      timeline_catalysts: report.timelineCatalysts || [],
      key_terms: report.keyTerms || [],
      investor_checklist: report.investorChecklist || [],
      processing_time_ms: processingTimeMs,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`);
  }

  return { id: data.id };
}

/**
 * Check if report exists for article
 */
export async function getReportByArticleId(
  supabase: any,
  articleId: string,
): Promise<any | null> {
  const { data, error } = await supabase
    .from('analysis_reports')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  return data || null;
}
