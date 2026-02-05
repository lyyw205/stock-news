-- Social Media Schema Migration
-- Adds tables for tracking social media posts and their status

-- Create social_media_posts table to track posting requests
CREATE TABLE IF NOT EXISTS public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  platforms TEXT[] NOT NULL,  -- ['telegram', 'twitter', 'threads', 'toss']
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'partial_failure', 'failed')),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for social_media_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_article ON public.social_media_posts(article_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON public.social_media_posts(created_at DESC);

-- Create social_media_log table for detailed platform-specific logs
CREATE TABLE IF NOT EXISTS public.social_media_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'twitter', 'threads', 'toss')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  formatted_content TEXT,
  platform_response JSONB,
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Create indexes for social_media_log
CREATE INDEX IF NOT EXISTS idx_social_log_post ON public.social_media_log(post_id);
CREATE INDEX IF NOT EXISTS idx_social_log_platform ON public.social_media_log(platform);
CREATE INDEX IF NOT EXISTS idx_social_log_article ON public.social_media_log(article_id);
CREATE INDEX IF NOT EXISTS idx_social_log_status ON public.social_media_log(status);
CREATE INDEX IF NOT EXISTS idx_social_log_created ON public.social_media_log(created_at DESC);

-- Add social media tracking columns to summaries table
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS social_posted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS social_posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS social_post_count INTEGER DEFAULT 0;

-- Create index for efficient querying of useful news not yet posted
CREATE INDEX IF NOT EXISTS idx_summaries_social_posted ON public.summaries(social_posted, is_useful) WHERE is_useful = TRUE;

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_social_posts_updated_at ON public.social_media_posts;
CREATE TRIGGER trigger_social_posts_updated_at
  BEFORE UPDATE ON public.social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_posts_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.social_media_posts IS 'Tracks social media posting requests and their overall status';
COMMENT ON TABLE public.social_media_log IS 'Detailed logs for each platform in a posting request';
COMMENT ON COLUMN public.summaries.social_posted IS 'Whether this summary has been posted to social media';
COMMENT ON COLUMN public.summaries.social_posted_at IS 'When this summary was first posted to social media';
COMMENT ON COLUMN public.summaries.social_post_count IS 'Number of times this summary has been posted';
