'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCompanyName } from '@/lib/utils/ticker-names';
import {
  ASSESSMENT_LABELS,
  SEVERITY_LABELS,
  POTENTIAL_LABELS,
  STOCK_IMPACT_LABELS,
  STOCK_IMPACT_COLORS,
  CATALYST_URGENCY_LABELS,
  CATALYST_URGENCY_COLORS,
  CHECK_IMPORTANCE_COLORS,
  type OverallAssessment,
  type Factor,
  type RiskFactor,
  type OpportunityFactor,
  type RelatedStock,
  type CatalystEvent,
  type KeyTerm,
  type InvestorCheckItem,
  type VisualScores,
} from '@/lib/types/report';
import type { ReportWithArticle } from '@/lib/types/report';
import { SENTIMENT_LABELS } from '@/lib/types/scores';
import { ResponsiveRadar } from '@nivo/radar';

// ============================================
// Animation Hooks & Utilities
// ============================================

// Count-up animation hook for score numbers
function useCountUp(target: number, duration = 1500, delay = 0): number {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return count;
}

// Staggered mount hook for card animations
function useStaggeredMount(delay: number): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return mounted;
}

// Progress animation hook (0 to target with easing)
function useAnimatedProgress(target: number, duration = 1000, delay = 0): number {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const ratio = Math.min(elapsed / duration, 1);

        // Ease-out quad
        const eased = 1 - (1 - ratio) * (1 - ratio);
        setProgress(eased * target);

        if (ratio < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return progress;
}

// Assessment badge styles
const ASSESSMENT_STYLES: Record<OverallAssessment, { bg: string; text: string; dot: string }> = {
  strong_bullish: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  bullish: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  neutral: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  bearish: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  strong_bearish: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [report, setReport] = useState<ReportWithArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/reports/${articleId}`);
        const data = await response.json();
        if (data.exists && data.report) {
          setReport(data.report);
        } else {
          setError('not_found');
        }
      } catch {
        setError('fetch_error');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [articleId]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, generationType: 'manual' }),
      });
      const data = await response.json();
      if (data.success) {
        window.location.reload();
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch {
      setError('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
          </div>
          <p className="text-slate-500 text-sm">리포트 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Not Found
  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">분석 리포트 없음</h1>
          <p className="text-slate-500 text-sm mb-6">이 뉴스에 대한 AI 분석 리포트가 아직 생성되지 않았습니다.</p>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="w-full bg-violet-500 hover:bg-violet-600 text-white font-medium py-3 px-6 rounded-xl
                       transition-all duration-200 disabled:bg-slate-300
                       hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                생성 중...
              </span>
            ) : 'AI 분석 리포트 생성'}
          </button>
          <button
            onClick={() => router.back()}
            className="mt-4 text-slate-500 hover:text-slate-700 text-sm transition-colors duration-200 hover:underline"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Error
  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center animate-fade-in-up">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-red-600 mb-2">오류 발생</h1>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-violet-500 hover:text-violet-600 text-sm font-medium transition-all duration-200 hover:underline"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const assessmentStyle = ASSESSMENT_STYLES[report.overallAssessment];
  const companyName = getCompanyName(report.article.ticker);

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header with entrance animation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 animate-fade-in-up">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center
                           hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm
                           active:scale-95 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-900">{report.article.ticker}</span>
                  <span className="text-slate-500">{companyName}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {report.generationType === 'auto' ? '자동 생성' : '수동 생성'} · {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-transform duration-200 hover:scale-105 ${assessmentStyle.bg}`}>
              <div className={`w-2 h-2 rounded-full ${assessmentStyle.dot} animate-pulse`} />
              <span className={`text-sm font-medium ${assessmentStyle.text}`}>{ASSESSMENT_LABELS[report.overallAssessment]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Score Overview */}
        {/* Score Cards */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* 왼쪽: 종합점수 + 보조지표 세로 스택 */}
          <div className="lg:w-96 flex flex-col gap-6">
            <AnimatedCard delay={0} className="flex-1">
              <div className="p-6 flex flex-col items-center justify-center h-full">
                <div className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">종합 점수</div>
                <ScoreGauge score={report.summary.totalScore} sentiment={report.summary.sentiment} />
                <AnimatedBadge delay={800} className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ${assessmentStyle.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${assessmentStyle.dot} animate-pulse`} />
                  <span className={`text-sm font-semibold ${assessmentStyle.text}`}>{ASSESSMENT_LABELS[report.overallAssessment]}</span>
                </AnimatedBadge>
              </div>
            </AnimatedCard>
            <AnimatedCard delay={200}>
              <div className="p-5">
                <HiddenScoreDonuts hidden={report.scores.hidden} />
              </div>
            </AnimatedCard>
          </div>

          {/* 오른쪽: 주요 지표 레이더 */}
          <AnimatedCard delay={100} className="flex-1">
            <div className="p-6">
              <ScoreRadarChart scores={report.scores.visual} />
            </div>
          </AnimatedCard>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Article */}
            <AnimatedCard delay={300}>
              <CardHeader title="원본 뉴스" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>} />
              <div className="p-5">
                <h3 className="text-slate-900 font-medium leading-relaxed mb-3">{report.article.title}</h3>
                <AnimatedButton href={report.article.url}>
                  원문 보기
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </AnimatedButton>
              </div>
            </AnimatedCard>

            {/* News Analysis (merged: 핵심 요약 + 뉴스 배경) */}
            <AnimatedCard delay={400}>
              <CardHeader title="뉴스 분석" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />핵심 요약
                  </div>
                  <p className="text-slate-600 leading-relaxed">{report.coreSummary}</p>
                </div>
                {report.newsBackground && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />배경 & 맥락
                    </div>
                    <p className="text-slate-500 leading-relaxed text-sm">{report.newsBackground}</p>
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* Price Impact */}
            <AnimatedCard delay={500}>
              <CardHeader title="주가 영향 분석" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>} />
              <div className="p-5">
                <div className="grid md:grid-cols-3 gap-4 mb-5">
                  <AnimatedTimeBlock label="단기" period="1주" content={report.priceImpact.short} color="blue" delay={600} />
                  <AnimatedTimeBlock label="중기" period="1-3개월" content={report.priceImpact.medium} color="violet" delay={700} />
                  <AnimatedTimeBlock label="장기" period="6개월+" content={report.priceImpact.long} color="indigo" delay={800} />
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium mb-2">종합 분석</div>
                  <p className="text-slate-700 text-sm leading-relaxed">{report.priceImpact.summary}</p>
                </div>
              </div>
            </AnimatedCard>

            {/* Timeline & Catalysts */}
            {report.timelineCatalysts && report.timelineCatalysts.length > 0 && (
              <AnimatedCard delay={600}>
                <CardHeader title="타임라인 & 촉매" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                <div className="p-5">
                  <div className="relative">
                    {report.timelineCatalysts.map((catalyst: CatalystEvent, idx: number) => {
                      const urgencyColor = CATALYST_URGENCY_COLORS[catalyst.urgency];
                      const isLast = idx === report.timelineCatalysts.length - 1;
                      return (
                        <div key={idx} className="flex gap-4 relative">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${urgencyColor.dot} shrink-0 mt-1.5`} />
                            {!isLast && <div className={`w-px flex-1 border-l-2 ${urgencyColor.line} border-dashed my-1`} />}
                          </div>
                          <div className="pb-5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-900">{catalyst.event}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${urgencyColor.dot} text-white`}>
                                {CATALYST_URGENCY_LABELS[catalyst.urgency]}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mb-1">{catalyst.expectedDate}</div>
                            <p className="text-slate-600 text-sm leading-relaxed">{catalyst.potentialImpact}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* Investor Checklist */}
            {report.investorChecklist && report.investorChecklist.length > 0 && (
              <AnimatedCard delay={650}>
                <CardHeader title="투자자 체크리스트" icon={<svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} />
                <div className="p-5">
                  <div className="space-y-2.5">
                    {report.investorChecklist.map((check: InvestorCheckItem, idx: number) => {
                      const importanceColor = CHECK_IMPORTANCE_COLORS[check.importance];
                      return (
                        <div key={idx} className="flex items-start gap-3 group">
                          <div className={`w-2 h-2 rounded-full ${importanceColor.dot} shrink-0 mt-1.5`} />
                          <span className="text-sm text-slate-700 leading-relaxed">{check.item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AnimatedCard>
            )}
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Bullish & Opportunity (merged: 호재 요인 + 기회 요인) */}
            <AnimatedCard delay={350}>
              <CardHeader title="호재 & 기회" icon={<svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>} badge={report.bullishFactors.length + report.opportunityFactors.length} badgeColor="emerald" />
              <div className="p-4 space-y-3">
                {report.bullishFactors.length > 0 ? report.bullishFactors.map((factor: Factor, idx: number) => (
                  <AnimatedFactorItem key={`b-${idx}`} factor={factor} type="bullish" delay={450 + idx * 100} />
                )) : <p className="text-slate-400 text-sm text-center py-2">호재 요인 없음</p>}
                {report.opportunityFactors.length > 0 && (
                  <div className="pt-2 border-t border-emerald-100/50">
                    <div className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wider">잠재 기회</div>
                    {report.opportunityFactors.map((opp: OpportunityFactor, idx: number) => (
                      <div key={`o-${idx}`} className="bg-cyan-50/50 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-cyan-700">{opp.factor}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700">{POTENTIAL_LABELS[opp.potential]}</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{opp.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* Bearish & Risk (merged: 악재 요인 + 리스크 요인) */}
            <AnimatedCard delay={450}>
              <CardHeader title="악재 & 리스크" icon={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>} badge={report.bearishFactors.length + report.riskFactors.length} badgeColor="red" />
              <div className="p-4 space-y-3">
                {report.bearishFactors.length > 0 ? report.bearishFactors.map((factor: Factor, idx: number) => (
                  <AnimatedFactorItem key={`br-${idx}`} factor={factor} type="bearish" delay={550 + idx * 100} />
                )) : <p className="text-slate-400 text-sm text-center py-2">악재 요인 없음</p>}
                {report.riskFactors.length > 0 && (
                  <div className="pt-2 border-t border-red-100/50">
                    <div className="text-[10px] text-slate-400 font-medium mb-2 uppercase tracking-wider">잠재 리스크</div>
                    {report.riskFactors.map((risk: RiskFactor, idx: number) => (
                      <div key={`r-${idx}`} className="bg-orange-50/50 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-orange-700">{risk.factor}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{SEVERITY_LABELS[risk.severity]}</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                {report.bearishFactors.length === 0 && report.riskFactors.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-2">악재/리스크 없음</p>
                )}
              </div>
            </AnimatedCard>

            {/* Related Stocks */}
            {report.relatedStocks && report.relatedStocks.length > 0 && (
              <AnimatedCard delay={500}>
                <CardHeader title="관련 종목" icon={<svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} badge={report.relatedStocks.length} badgeColor="amber" />
                <div className="p-4 space-y-2.5">
                  {report.relatedStocks.map((stock: RelatedStock, idx: number) => {
                    const impactColor = STOCK_IMPACT_COLORS[stock.impactType];
                    const impactIcon = stock.expectedImpact === 'positive' ? '↑' : stock.expectedImpact === 'negative' ? '↓' : '↕';
                    return (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors duration-200">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium text-slate-900">{stock.name}</span>
                          {stock.ticker && <span className="text-[10px] text-slate-400">{stock.ticker}</span>}
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${impactColor.bg} ${impactColor.text}`}>
                            {impactIcon} {STOCK_IMPACT_LABELS[stock.impactType]}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{stock.reasoning}</p>
                      </div>
                    );
                  })}
                </div>
              </AnimatedCard>
            )}

            {/* Key Terms */}
            {report.keyTerms && report.keyTerms.length > 0 && (
              <AnimatedCard delay={550}>
                <CardHeader title="핵심 용어 해설" icon={<svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} />
                <div className="p-4 space-y-3">
                  {report.keyTerms.map((item: KeyTerm, idx: number) => (
                    <div key={idx} className="bg-indigo-50/50 rounded-lg p-3">
                      <div className="text-sm font-medium text-indigo-700 mb-1">{item.term}</div>
                      <p className="text-slate-600 text-xs leading-relaxed">{item.definition}</p>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center text-slate-400 text-xs opacity-0 animate-fade-in-delayed">AI 분석 리포트 · 투자 결정의 참고 자료로만 활용하세요</footer>
      </main>
    </div>
  );
}

// Score Gauge Component with animated counter and circular progress
function ScoreGauge({ score, sentiment }: { score: number; sentiment: number }) {
  const circumference = 2 * Math.PI * 54;
  const animatedScore = useCountUp(score, 1500, 300);
  const animatedProgress = useAnimatedProgress(score, 1500, 300);
  const offset = circumference - (animatedProgress / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#10B981';
    if (s >= 60) return '#8B5CF6';
    if (s >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const sentimentLabel = SENTIMENT_LABELS[sentiment as -2 | -1 | 0 | 1 | 2] || '중립';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-36 h-36 transform -rotate-90">
        <circle cx="72" cy="72" r="54" stroke="#E2E8F0" strokeWidth="12" fill="none" />
        <circle
          cx="72"
          cy="72"
          r="54"
          stroke={getScoreColor(score)}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-900 tabular-nums">{animatedScore}</span>
        <span className="text-xs text-slate-500">{sentimentLabel}</span>
      </div>
    </div>
  );
}

// ============================================
// Score Radar Charts — Visual (6-axis) + Hidden (3-axis)
// ============================================

const VISUAL_SCORE_META: Record<string, { desc: string; color: string }> = {
  '영향력': { desc: '시장 영향도', color: '#8B5CF6' },
  '긴급성': { desc: '즉각 대응 필요성', color: '#3B82F6' },
  '확실성': { desc: '정보 신뢰도', color: '#10B981' },
  '지속성': { desc: '영향 지속 기간', color: '#F59E0B' },
  '관심도': { desc: '시장 관심 수준', color: '#F43F5E' },
  '연관성': { desc: '종목 연관도', color: '#06B6D4' },
};

const HIDDEN_SCORE_META: Record<string, { desc: string; color: string }> = {
  '섹터 영향': { desc: '업종 전반 파급력', color: '#64748B' },
  '기관 관심': { desc: '기관투자자 관심도', color: '#818CF8' },
  '변동성': { desc: '주가 변동 가능성', color: '#F97316' },
};

// 6-axis Radar: Visual Scores
function ScoreRadarChart({ scores }: { scores: VisualScores }) {
  const data = [
    { axis: '영향력', score: scores.impact },
    { axis: '긴급성', score: scores.urgency },
    { axis: '확실성', score: scores.certainty },
    { axis: '지속성', score: scores.durability },
    { axis: '관심도', score: scores.attention },
    { axis: '연관성', score: scores.relevance },
  ];
  const scoreMap = Object.fromEntries(data.map((d) => [d.axis, d.score]));

  return (
    <div>
      <div className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">주요 지표</div>
      <div style={{ height: 360 }}>
        <ResponsiveRadar
          data={data}
          keys={['score']}
          indexBy="axis"
          maxValue={10}
          margin={{ top: 55, right: 95, bottom: 55, left: 95 }}
          curve="linearClosed"
          borderWidth={2}
          borderColor="#8B5CF6"
          gridLevels={4}
          gridShape="circular"
          gridLabelOffset={24}
          enableDots={true}
          dotSize={8}
          dotColor="#ffffff"
          dotBorderWidth={2.5}
          dotBorderColor="#8B5CF6"
          colors={['rgba(139, 92, 246, 0.15)']}
          fillOpacity={1}
          blendMode="normal"
          animate={true}
          motionConfig="gentle"
          gridLabel={(props: { id: string | number; anchor: 'start' | 'middle' | 'end'; x: number; y: number }) => {
            const id = String(props.id);
            const meta = VISUAL_SCORE_META[id];
            const val = scoreMap[id];
            return (
              <g transform={`translate(${props.x}, ${props.y})`}>
                <text
                  textAnchor={props.anchor}
                  dominantBaseline="central"
                  style={{ fontSize: 12, fontWeight: 700, fill: meta?.color || '#334155' }}
                >
                  {id} {val}
                </text>
                <text
                  textAnchor={props.anchor}
                  dy={15}
                  dominantBaseline="central"
                  style={{ fontSize: 9, fontWeight: 400, fill: '#94A3B8' }}
                >
                  {meta?.desc || ''}
                </text>
              </g>
            );
          }}
          theme={{
            text: { fontSize: 11, fill: '#64748B' },
            grid: { line: { stroke: '#E2E8F0', strokeWidth: 0.8 } },
          }}
        />
      </div>
    </div>
  );
}

// 3 Mini Donuts: Hidden/Auxiliary Scores
function HiddenScoreDonuts({
  hidden,
}: {
  hidden: { sectorImpact: number; institutionalInterest: number; volatility: number };
}) {
  const items = [
    { label: '섹터 영향', desc: '업종 전반 파급력', value: hidden.sectorImpact, color: '#64748B' },
    { label: '기관 관심', desc: '기관투자자 관심도', value: hidden.institutionalInterest, color: '#818CF8' },
    { label: '변동성', desc: '주가 변동 가능성', value: hidden.volatility, color: '#F97316' },
  ];

  return (
    <div>
      <div className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">보조 지표</div>
      <div className="flex justify-around">
        {items.map((item, i) => (
          <MiniDonut key={i} {...item} delay={300 + i * 150} />
        ))}
      </div>
    </div>
  );
}

function MiniDonut({
  label,
  desc,
  value,
  color,
  delay,
}: {
  label: string;
  desc: string;
  value: number;
  color: string;
  delay: number;
}) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const animatedValue = useAnimatedProgress(value, 1000, delay);
  const offset = circumference - (animatedValue / 10) * circumference;

  return (
    <div className="flex flex-col items-center text-center">
      <svg width="56" height="56" className="shrink-0">
        <circle cx="28" cy="28" r={r} stroke="#F1F5F9" strokeWidth="5" fill="none" />
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
        />
        <text
          x="28"
          y="28"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: 14, fontWeight: 700, fill: color }}
        >
          {Math.round(animatedValue)}
        </text>
      </svg>
      <div className="mt-1.5">
        <div className="text-[11px] font-semibold text-slate-700">{label}</div>
        <div className="text-[10px] text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

// Animated Card Component with staggered fade-in and hover lift effect
function AnimatedCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const mounted = useStaggeredMount(delay);

  return (
    <div
      className={`
        bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden
        transform transition-all duration-500 ease-out
        hover:shadow-lg hover:-translate-y-1 hover:border-slate-300
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, icon, badge, badgeColor }: { title: string; icon: React.ReactNode; badge?: number; badgeColor?: string }) {
  const badgeColors: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="text-slate-400">{icon}</div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {badge !== undefined && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColors[badgeColor || 'emerald']}`}>{badge}</span>}
    </div>
  );
}

// Animated TimeBlock with staggered fade-in
function AnimatedTimeBlock({ label, period, content, color, delay }: { label: string; period: string; content: string; color: string; delay: number }) {
  const mounted = useStaggeredMount(delay);
  const colors: Record<string, string> = { blue: 'border-blue-200 bg-blue-50', violet: 'border-violet-200 bg-violet-50', indigo: 'border-indigo-200 bg-indigo-50' };

  return (
    <div
      className={`rounded-xl p-4 border ${colors[color]} transform transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <span className="text-xs text-slate-400">({period})</span>
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{content}</p>
    </div>
  );
}

// Animated Factor Item with confidence bar animation
function AnimatedFactorItem({ factor, type, delay }: { factor: Factor; type: 'bullish' | 'bearish'; delay: number }) {
  const mounted = useStaggeredMount(delay);
  const confidence = Math.round(factor.confidence * 100);
  const animatedConfidence = useAnimatedProgress(confidence, 600, delay + 200);
  const colors = type === 'bullish'
    ? { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' }
    : { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' };

  return (
    <div
      className={`${colors.bg} rounded-xl p-3 transform transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`${colors.text} text-sm font-medium`}>{factor.factor}</span>
        <span className="text-slate-400 text-xs tabular-nums">{Math.round(animatedConfidence)}%</span>
      </div>
      <div className="w-full h-1 bg-white/50 rounded-full mb-2 overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
          style={{ width: `${animatedConfidence}%` }}
        />
      </div>
      <p className="text-slate-600 text-xs leading-relaxed">{factor.reasoning}</p>
    </div>
  );
}

// Animated Badge with pulse effect on load
function AnimatedBadge({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  const mounted = useStaggeredMount(delay);

  return (
    <div
      className={`transform transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      } ${className || ''}`}
    >
      {children}
    </div>
  );
}

// Animated Button with micro-interaction
function AnimatedButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-600 font-medium
                 transform transition-all duration-200 hover:translate-x-1
                 active:scale-95"
    >
      {children}
    </a>
  );
}
