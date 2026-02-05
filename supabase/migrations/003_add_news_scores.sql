-- Add news analysis scores to summaries table
-- These scores help investors quickly assess news importance and impact

-- Visual metrics (displayed in radar chart) - 1 to 10 scale
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS score_impact INTEGER CHECK (score_impact >= 1 AND score_impact <= 10),
ADD COLUMN IF NOT EXISTS score_urgency INTEGER CHECK (score_urgency >= 1 AND score_urgency <= 10),
ADD COLUMN IF NOT EXISTS score_certainty INTEGER CHECK (score_certainty >= 1 AND score_certainty <= 10),
ADD COLUMN IF NOT EXISTS score_durability INTEGER CHECK (score_durability >= 1 AND score_durability <= 10),
ADD COLUMN IF NOT EXISTS score_attention INTEGER CHECK (score_attention >= 1 AND score_attention <= 10),
ADD COLUMN IF NOT EXISTS score_relevance INTEGER CHECK (score_relevance >= 1 AND score_relevance <= 10);

-- Hidden calculation factors (not displayed, used for total score) - 1 to 10 scale
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS score_sector_impact INTEGER CHECK (score_sector_impact >= 1 AND score_sector_impact <= 10),
ADD COLUMN IF NOT EXISTS score_institutional_interest INTEGER CHECK (score_institutional_interest >= 1 AND score_institutional_interest <= 10),
ADD COLUMN IF NOT EXISTS score_volatility INTEGER CHECK (score_volatility >= 1 AND score_volatility <= 10);

-- Sentiment: -2 (very negative) to +2 (very positive)
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS sentiment INTEGER CHECK (sentiment >= -2 AND sentiment <= 2);

-- Total calculated score: 1 to 100
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS total_score INTEGER CHECK (total_score >= 1 AND total_score <= 100);

-- Reasoning for the scores (optional, for debugging/transparency)
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS score_reasoning TEXT;

-- Index for efficient sorting by total score
CREATE INDEX IF NOT EXISTS idx_summaries_total_score ON public.summaries(total_score DESC);

-- Index for filtering by sentiment
CREATE INDEX IF NOT EXISTS idx_summaries_sentiment ON public.summaries(sentiment);

-- Composite index for useful news sorted by score
CREATE INDEX IF NOT EXISTS idx_summaries_useful_score ON public.summaries(is_useful, total_score DESC)
WHERE is_useful = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN public.summaries.score_impact IS '영향력: 회사 실적에 미치는 영향 규모 (1-10)';
COMMENT ON COLUMN public.summaries.score_urgency IS '긴급성: 주가 반영 속도 (1=장기, 10=즉시)';
COMMENT ON COLUMN public.summaries.score_certainty IS '확실성: 정보 신뢰도 (1=루머, 10=공시)';
COMMENT ON COLUMN public.summaries.score_durability IS '지속성: 효과 지속 기간 (1=일회성, 10=구조적)';
COMMENT ON COLUMN public.summaries.score_attention IS '관심도: 투자자/미디어 예상 관심 (1-10)';
COMMENT ON COLUMN public.summaries.score_relevance IS '연관성: 현재 시장 테마 관련성 (1-10)';
COMMENT ON COLUMN public.summaries.score_sector_impact IS '섹터 영향: 업종 전체 영향 여부 (1=종목만, 10=업종전체)';
COMMENT ON COLUMN public.summaries.score_institutional_interest IS '기관 관심도: 외국인/기관 관심 예상 (1-10)';
COMMENT ON COLUMN public.summaries.score_volatility IS '변동성 예측: 예상 주가 변동폭 (1=미미, 10=급등락)';
COMMENT ON COLUMN public.summaries.sentiment IS '투자심리: 호재/악재 (-2=매우악재, +2=매우호재)';
COMMENT ON COLUMN public.summaries.total_score IS '종합점수: 뉴스 중요도 종합 (1-100)';
COMMENT ON COLUMN public.summaries.score_reasoning IS '점수 산출 근거';
