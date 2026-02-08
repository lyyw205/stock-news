'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCompanyName } from '@/lib/utils/ticker-names';
import {
  ASSESSMENT_LABELS,
  SEVERITY_LABELS,
  POTENTIAL_LABELS,
  type OverallAssessment,
  type Factor,
  type RiskFactor,
  type OpportunityFactor,
  type VisualScores,
} from '@/lib/types/report';
import type { ReportWithArticle } from '@/lib/types/report';
import { SENTIMENT_LABELS } from '@/lib/types/scores';

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

// Score labels for radar chart
const SCORE_LABELS: Record<keyof VisualScores, string> = {
  impact: '영향력',
  urgency: '긴급성',
  certainty: '확실성',
  durability: '지속성',
  attention: '관심도',
  relevance: '연관성',
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
        {/* Score Overview Section */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Main Score Card */}
          <AnimatedCard className="lg:col-span-1" delay={0}>
            <div className="p-6 text-center">
              <div className="text-xs text-slate-500 font-medium mb-4 uppercase tracking-wider">종합 점수</div>
              <ScoreGauge score={report.summary.totalScore} sentiment={report.summary.sentiment} />
              <div className="mt-4">
                <AnimatedBadge delay={800} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${assessmentStyle.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${assessmentStyle.dot} animate-pulse`} />
                  <span className={`text-sm font-semibold ${assessmentStyle.text}`}>{ASSESSMENT_LABELS[report.overallAssessment]}</span>
                </AnimatedBadge>
              </div>
            </div>
          </AnimatedCard>

          {/* Radar Chart */}
          <AnimatedCard className="lg:col-span-1" delay={100}>
            <div className="p-6">
              <div className="text-xs text-slate-500 font-medium mb-4 uppercase tracking-wider text-center">6축 분석 차트</div>
              <RadarChart scores={report.scores.visual} />
            </div>
          </AnimatedCard>

          {/* Score Breakdown */}
          <AnimatedCard className="lg:col-span-1" delay={200}>
            <div className="p-6">
              <div className="text-xs text-slate-500 font-medium mb-4 uppercase tracking-wider">점수 상세</div>
              <ScoreBreakdown scores={report.scores.visual} hidden={report.scores.hidden} />
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

            {/* Executive Summary */}
            <AnimatedCard delay={400}>
              <CardHeader title="핵심 요약" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
              <div className="p-5">
                <p className="text-slate-600 leading-relaxed">{report.coreSummary}</p>
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
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Bullish Factors */}
            <AnimatedCard delay={350}>
              <CardHeader title="호재 요인" icon={<svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>} badge={report.bullishFactors.length} badgeColor="emerald" />
              <div className="p-4 space-y-3">
                {report.bullishFactors.length > 0 ? report.bullishFactors.map((factor: Factor, idx: number) => (
                  <AnimatedFactorItem key={idx} factor={factor} type="bullish" delay={450 + idx * 100} />
                )) : <p className="text-slate-400 text-sm text-center py-4">호재 요인 없음</p>}
              </div>
            </AnimatedCard>

            {/* Bearish Factors */}
            <AnimatedCard delay={450}>
              <CardHeader title="악재 요인" icon={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>} badge={report.bearishFactors.length} badgeColor="red" />
              <div className="p-4 space-y-3">
                {report.bearishFactors.length > 0 ? report.bearishFactors.map((factor: Factor, idx: number) => (
                  <AnimatedFactorItem key={idx} factor={factor} type="bearish" delay={550 + idx * 100} />
                )) : <p className="text-slate-400 text-sm text-center py-4">악재 요인 없음</p>}
              </div>
            </AnimatedCard>

            {/* Risk & Opportunity */}
            <AnimatedCard delay={550}>
              <CardHeader title="리스크 & 기회" icon={<svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
              <div className="p-4 space-y-4">
                {report.riskFactors.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />리스크
                    </div>
                    <div className="space-y-2">
                      {report.riskFactors.map((risk: RiskFactor, idx: number) => <AnimatedRiskItem key={idx} risk={risk} delay={650 + idx * 100} />)}
                    </div>
                  </div>
                )}
                {report.opportunityFactors.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />기회
                    </div>
                    <div className="space-y-2">
                      {report.opportunityFactors.map((opp: OpportunityFactor, idx: number) => <AnimatedOpportunityItem key={idx} opportunity={opp} delay={750 + idx * 100} />)}
                    </div>
                  </div>
                )}
                {report.riskFactors.length === 0 && report.opportunityFactors.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">특이사항 없음</p>
                )}
              </div>
            </AnimatedCard>
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

// Radar Chart Component with drawing animation
function RadarChart({ scores }: { scores: VisualScores }) {
  const labels = Object.keys(scores) as (keyof VisualScores)[];
  const values = labels.map(k => scores[k]);
  const max = 10;
  const size = 140;
  const center = size / 2;
  const radius = 50;

  // Animate expansion from center
  const animationProgress = useAnimatedProgress(1, 1200, 500);

  const getPoint = (index: number, value: number, scale = 1) => {
    const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
    const r = (value / max) * radius * scale;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const animatedPoints = values.map((v, i) => getPoint(i, v, animationProgress));
  const pathD = animatedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid */}
        {gridLevels.map((level, i) => {
          const gridPoints = labels.map((_, idx) => getPoint(idx, max * level));
          const gridPath = gridPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return <path key={i} d={gridPath} fill="none" stroke="#E2E8F0" strokeWidth="1" />;
        })}
        {/* Axis lines */}
        {labels.map((_, i) => {
          const end = getPoint(i, max);
          return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#E2E8F0" strokeWidth="1" />;
        })}
        {/* Data polygon with animation */}
        <path
          d={pathD}
          fill="rgba(139, 92, 246, 0.2)"
          stroke="#8B5CF6"
          strokeWidth="2"
          style={{
            opacity: animationProgress,
            transition: 'opacity 0.3s ease',
          }}
        />
        {/* Data points with animation */}
        {animatedPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4 * animationProgress}
            fill="#8B5CF6"
            style={{
              opacity: animationProgress,
              transition: 'opacity 0.3s ease',
            }}
          />
        ))}
        {/* Labels */}
        {labels.map((label, i) => {
          const labelPoint = getPoint(i, max + 2.5);
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-slate-500"
            >
              {SCORE_LABELS[label]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// Animated Progress Bar for Score Breakdown
function AnimatedProgressBar({ value, color, delay }: { value: number; color: string; delay: number }) {
  const animatedWidth = useAnimatedProgress((value / 10) * 100, 800, delay);

  return (
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${animatedWidth}%`,
          backgroundColor: getColorValue(color),
        }}
      />
    </div>
  );
}

// Individual Score Row Component (to properly use hooks)
function AnimatedScoreRow({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const animatedValue = useCountUp(value, 800, delay);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-14 shrink-0">{label}</span>
      <AnimatedProgressBar value={value} color={color} delay={delay} />
      <span className="text-xs font-medium text-slate-700 w-6 text-right tabular-nums">{animatedValue}</span>
    </div>
  );
}

// Individual Hidden Score Component (to properly use hooks)
function AnimatedHiddenScore({ label, value, delay }: { label: string; value: number; delay: number }) {
  const animatedValue = useCountUp(value, 800, delay);

  return (
    <div className="text-center">
      <div className="text-lg font-semibold text-slate-700 tabular-nums">{animatedValue}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

// Score Breakdown Component with staggered progress bar animations
function ScoreBreakdown({ scores, hidden }: { scores: VisualScores; hidden: { sectorImpact: number; institutionalInterest: number; volatility: number } }) {
  const allScores = [
    { label: '영향력', value: scores.impact, color: 'violet' },
    { label: '긴급성', value: scores.urgency, color: 'blue' },
    { label: '확실성', value: scores.certainty, color: 'emerald' },
    { label: '지속성', value: scores.durability, color: 'amber' },
    { label: '관심도', value: scores.attention, color: 'rose' },
    { label: '연관성', value: scores.relevance, color: 'cyan' },
  ];

  const hiddenScores = [
    { label: '섹터 영향', value: hidden.sectorImpact },
    { label: '기관 관심', value: hidden.institutionalInterest },
    { label: '변동성', value: hidden.volatility },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {allScores.map((item, i) => (
          <AnimatedScoreRow
            key={i}
            label={item.label}
            value={item.value}
            color={item.color}
            delay={600 + i * 50}
          />
        ))}
      </div>
      <div className="pt-3 border-t border-slate-100">
        <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">숨겨진 지표</div>
        <div className="grid grid-cols-3 gap-2">
          {hiddenScores.map((item, i) => (
            <AnimatedHiddenScore
              key={i}
              label={item.label}
              value={item.value}
              delay={900 + i * 100}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getColorValue(color: string): string {
  const colors: Record<string, string> = {
    violet: '#8B5CF6',
    blue: '#3B82F6',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    cyan: '#06B6D4',
  };
  return colors[color] || '#8B5CF6';
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

// Static Card (for backwards compatibility)
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 transform transition-all duration-300 ${className}`}>{children}</div>;
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

function TimeBlock({ label, period, content, color }: { label: string; period: string; content: string; color: string }) {
  const colors: Record<string, string> = { blue: 'border-blue-200 bg-blue-50', violet: 'border-violet-200 bg-violet-50', indigo: 'border-indigo-200 bg-indigo-50' };
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <span className="text-xs text-slate-400">({period})</span>
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{content}</p>
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

function FactorItem({ factor, type }: { factor: Factor; type: 'bullish' | 'bearish' }) {
  const confidence = Math.round(factor.confidence * 100);
  const colors = type === 'bullish' ? { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' } : { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' };
  return (
    <div className={`${colors.bg} rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`${colors.text} text-sm font-medium`}>{factor.factor}</span>
        <span className="text-slate-400 text-xs">{confidence}%</span>
      </div>
      <div className="w-full h-1 bg-white/50 rounded-full mb-2">
        <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${confidence}%` }} />
      </div>
      <p className="text-slate-600 text-xs leading-relaxed">{factor.reasoning}</p>
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

function RiskItem({ risk }: { risk: RiskFactor }) {
  const severityColors: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-900 text-sm font-medium">{risk.factor}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[risk.severity]}`}>{SEVERITY_LABELS[risk.severity]}</span>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">{risk.description}</p>
    </div>
  );
}

// Animated Risk Item
function AnimatedRiskItem({ risk, delay }: { risk: RiskFactor; delay: number }) {
  const mounted = useStaggeredMount(delay);
  const severityColors: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };

  return (
    <div
      className={`bg-slate-50 rounded-lg p-3 transform transition-all duration-500 ease-out hover:bg-slate-100 ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-900 text-sm font-medium">{risk.factor}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full transition-transform duration-200 hover:scale-105 ${severityColors[risk.severity]}`}>
          {SEVERITY_LABELS[risk.severity]}
        </span>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">{risk.description}</p>
    </div>
  );
}

function OpportunityItem({ opportunity }: { opportunity: OpportunityFactor }) {
  const potentialColors: Record<string, string> = { high: 'bg-emerald-100 text-emerald-700', medium: 'bg-cyan-100 text-cyan-700', low: 'bg-slate-100 text-slate-600' };
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-900 text-sm font-medium">{opportunity.factor}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${potentialColors[opportunity.potential]}`}>{POTENTIAL_LABELS[opportunity.potential]}</span>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">{opportunity.description}</p>
    </div>
  );
}

// Animated Opportunity Item
function AnimatedOpportunityItem({ opportunity, delay }: { opportunity: OpportunityFactor; delay: number }) {
  const mounted = useStaggeredMount(delay);
  const potentialColors: Record<string, string> = { high: 'bg-emerald-100 text-emerald-700', medium: 'bg-cyan-100 text-cyan-700', low: 'bg-slate-100 text-slate-600' };

  return (
    <div
      className={`bg-slate-50 rounded-lg p-3 transform transition-all duration-500 ease-out hover:bg-slate-100 ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-900 text-sm font-medium">{opportunity.factor}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full transition-transform duration-200 hover:scale-105 ${potentialColors[opportunity.potential]}`}>
          {POTENTIAL_LABELS[opportunity.potential]}
        </span>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">{opportunity.description}</p>
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
