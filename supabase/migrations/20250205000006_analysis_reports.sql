-- Analysis Reports Table for detailed AI analysis of high-score news
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,

  generation_type TEXT NOT NULL CHECK (generation_type IN ('auto', 'manual')),

  -- Core summary (3-5 sentences)
  core_summary TEXT NOT NULL,

  -- Bullish/Bearish factors as JSONB arrays
  -- Format: [{factor, reasoning, confidence}]
  bullish_factors JSONB NOT NULL DEFAULT '[]',
  bearish_factors JSONB NOT NULL DEFAULT '[]',

  -- Overall assessment
  overall_assessment TEXT NOT NULL CHECK (overall_assessment IN ('strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish')),

  -- Price impact analysis
  price_impact_short TEXT NOT NULL,   -- Short term (1 week)
  price_impact_medium TEXT NOT NULL,  -- Medium term (1-3 months)
  price_impact_long TEXT NOT NULL,    -- Long term (6+ months)
  price_impact_summary TEXT NOT NULL, -- Overall summary

  -- Risk and opportunity factors as JSONB arrays
  -- Risk: [{factor, severity, description}]
  -- Opportunity: [{factor, potential, description}]
  risk_factors JSONB NOT NULL DEFAULT '[]',
  opportunity_factors JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one report per article
  UNIQUE(article_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_analysis_reports_article_id ON public.analysis_reports(article_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON public.analysis_reports(created_at DESC);

-- RLS policies - reports are readable by authenticated users
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.analysis_reports;
CREATE POLICY "Authenticated users can view reports" ON public.analysis_reports
  FOR SELECT USING (auth.role() = 'authenticated');
