/**
 * CLI: Claude Code 분석 결과 저장
 * Usage: npx tsx scripts/cli-save.ts '<JSON>'
 *
 * Claude Code가 분석한 점수와 요약을 DB에 저장합니다.
 *
 * JSON 형식:
 * {
 *   "articleId": "uuid",
 *   "scores": {
 *     "impact": 1-10,
 *     "urgency": 1-10,
 *     "certainty": 1-10,
 *     "durability": 1-10,
 *     "attention": 1-10,
 *     "relevance": 1-10,
 *     "sectorImpact": 1-10,
 *     "institutionalInterest": 1-10,
 *     "volatility": 1-10,
 *     "sentiment": -2 ~ +2
 *   },
 *   "summary": "요약문 (2-3문장)",
 *   "reasoning": "점수 산정 근거"
 * }
 *
 * 여러 기사를 한번에 저장하려면 배열로 전달:
 * [{ "articleId": "...", ... }, { "articleId": "...", ... }]
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { calculateTotalScore } from '../lib/types/scores';

interface AnalysisInput {
  articleId: string;
  scores: {
    impact: number;
    urgency: number;
    certainty: number;
    durability: number;
    attention: number;
    relevance: number;
    sectorImpact: number;
    institutionalInterest: number;
    volatility: number;
    sentiment: number;
  };
  summary: string;
  reasoning?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function saveAnalysis(supabase: any, input: AnalysisInput): Promise<boolean> {
  const { articleId, scores, summary, reasoning } = input;

  // Validate and clamp scores
  const visual = {
    impact: clamp(scores.impact, 1, 10),
    urgency: clamp(scores.urgency, 1, 10),
    certainty: clamp(scores.certainty, 1, 10),
    durability: clamp(scores.durability, 1, 10),
    attention: clamp(scores.attention, 1, 10),
    relevance: clamp(scores.relevance, 1, 10),
  };

  const hidden = {
    sectorImpact: clamp(scores.sectorImpact, 1, 10),
    institutionalInterest: clamp(scores.institutionalInterest, 1, 10),
    volatility: clamp(scores.volatility, 1, 10),
  };

  const sentiment = clamp(scores.sentiment, -2, 2);
  const totalScore = calculateTotalScore(visual, hidden, sentiment as any);

  // Save to summaries table
  const { data: summaryData, error: summaryError } = await supabase
    .from('summaries')
    .insert({
      article_id: articleId,
      summary_text: summary || null,
      is_useful: true,
      confidence: 1.0,
      score_impact: visual.impact,
      score_urgency: visual.urgency,
      score_certainty: visual.certainty,
      score_durability: visual.durability,
      score_attention: visual.attention,
      score_relevance: visual.relevance,
      score_sector_impact: hidden.sectorImpact,
      score_institutional_interest: hidden.institutionalInterest,
      score_volatility: hidden.volatility,
      sentiment: sentiment,
      total_score: totalScore,
      score_reasoning: reasoning || null,
      auto_published: false,
    })
    .select('id')
    .single();

  if (summaryError) {
    console.error(`기사 ${articleId} 저장 실패:`, summaryError.message);
    return false;
  }

  // Mark article as processed
  await supabase
    .from('news_articles')
    .update({
      is_processed: true,
      source_count: 1,
    })
    .eq('id', articleId);

  // Get score grade
  let grade = 'D';
  if (totalScore >= 80) grade = 'S';
  else if (totalScore >= 65) grade = 'A';
  else if (totalScore >= 50) grade = 'B';
  else if (totalScore >= 35) grade = 'C';

  console.log(`  저장 완료: 총점 ${totalScore}점 (${grade}등급)`);

  // Notify for high scores (actual publishing is handled separately)
  if (totalScore >= 80) {
    console.log(`  ⚡ S등급! 자동 발행을 원하면 대시보드에서 처리하세요.`);
  }

  return true;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not configured');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read JSON from CLI argument or stdin
  let jsonInput = process.argv[2];

  if (!jsonInput) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    jsonInput = Buffer.concat(chunks).toString('utf-8');
  }

  if (!jsonInput || jsonInput.trim().length === 0) {
    console.error('사용법: npx tsx scripts/cli-save.ts \'<JSON>\'');
    console.error('또는: echo \'<JSON>\' | npx tsx scripts/cli-save.ts');
    process.exit(1);
  }

  let inputs: AnalysisInput[];

  try {
    const parsed = JSON.parse(jsonInput);
    inputs = Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error('JSON 파싱 실패:', (e as Error).message);
    process.exit(1);
  }

  console.log(`\n=== ${inputs.length}개 기사 분석 결과 저장 ===\n`);

  let success = 0;
  let failed = 0;

  for (const input of inputs) {
    console.log(`기사 ${input.articleId}:`);
    const ok = await saveAnalysis(supabase, input);
    if (ok) success++;
    else failed++;
  }

  console.log(`\n=== 완료: 성공 ${success}개, 실패 ${failed}개 ===`);

  // Output summary JSON
  console.log(JSON.stringify({ success, failed, total: inputs.length }));
}

main();
