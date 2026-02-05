-- Migration: Auto-Publish Support
-- Makes summary_text nullable for on-demand generation
-- Adds auto-publish tracking columns

-- 1. Make summary_text nullable (for lazy generation)
ALTER TABLE public.summaries
ALTER COLUMN summary_text DROP NOT NULL;

-- 2. Add auto-publish tracking columns
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS auto_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_published_at TIMESTAMPTZ;

-- 3. Add comments for documentation
COMMENT ON COLUMN public.summaries.summary_text IS 'Article summary text. NULL means summary not generated yet (lazy loading for token optimization)';
COMMENT ON COLUMN public.summaries.auto_published IS 'Whether article was auto-published (totalScore >= 80)';
COMMENT ON COLUMN public.summaries.auto_published_at IS 'Timestamp when article was auto-published';

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_summaries_auto_published
ON public.summaries(auto_published)
WHERE auto_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_summaries_needs_summary
ON public.summaries(article_id, total_score)
WHERE summary_text IS NULL AND total_score < 80;

CREATE INDEX IF NOT EXISTS idx_summaries_total_score
ON public.summaries(total_score DESC);

-- 5. Add check constraint for auto_published_at consistency
ALTER TABLE public.summaries
DROP CONSTRAINT IF EXISTS check_auto_published_consistency;
ALTER TABLE public.summaries
ADD CONSTRAINT check_auto_published_consistency
CHECK (
  (auto_published = FALSE AND auto_published_at IS NULL) OR
  (auto_published = TRUE AND auto_published_at IS NOT NULL)
);

-- Migration Notes:
-- - Existing articles retain their summary_text (backward compatible)
-- - New articles will have summary_text = NULL initially
-- - Auto-publish tracking allows dashboard filtering
-- - Indexes optimize queries for:
--   1. Finding auto-published articles
--   2. Finding articles needing manual summary generation
--   3. Sorting by score
