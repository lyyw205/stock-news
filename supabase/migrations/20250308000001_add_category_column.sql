-- Add category column to news_articles for stock/crypto distinction
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'stock';

-- Add CHECK constraint
ALTER TABLE public.news_articles
  ADD CONSTRAINT chk_news_articles_category CHECK (category IN ('stock', 'crypto'));

-- Composite index for filtered queries (category + is_processed + pub_date)
CREATE INDEX IF NOT EXISTS idx_news_articles_category_processed_date
  ON public.news_articles(category, is_processed, pub_date DESC);
