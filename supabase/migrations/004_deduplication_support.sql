-- 중복 제거 및 신뢰도 추적을 위한 스키마 업데이트

-- news_articles 테이블에 출처 수 컬럼 추가
ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS source_count INTEGER DEFAULT 1;

-- news_articles 테이블에 원본 URL 목록 저장 (JSONB)
ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS source_urls JSONB DEFAULT '[]'::jsonb;

-- summaries 테이블에 신뢰도 컬럼 추가 (source_count 기반)
ALTER TABLE summaries
ADD COLUMN IF NOT EXISTS credibility DECIMAL(3, 2) DEFAULT 0.5;

-- social_media_posts 테이블에 news_article 연결 추가
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS news_article_id UUID REFERENCES news_articles(id) ON DELETE SET NULL;

-- 뉴스 업데이트 시 소셜미디어 포스트도 업데이트할 수 있도록 상태 추가
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS needs_update BOOLEAN DEFAULT FALSE;

-- 중복 뉴스 추적을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_news_articles_ticker_pubdate
ON news_articles(ticker, pub_date DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_source_count
ON news_articles(source_count DESC);

-- 소셜미디어 포스트 업데이트 추적 인덱스
CREATE INDEX IF NOT EXISTS idx_social_media_posts_needs_update
ON social_media_posts(needs_update)
WHERE needs_update = TRUE;

CREATE INDEX IF NOT EXISTS idx_social_media_posts_news_article
ON social_media_posts(news_article_id)
WHERE news_article_id IS NOT NULL;

-- 뉴스 신뢰도 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_news_credibility()
RETURNS TRIGGER AS $$
BEGIN
  -- source_count에 따라 credibility 자동 계산
  UPDATE summaries
  SET credibility = CASE
    WHEN NEW.source_count >= 4 THEN 0.95
    WHEN NEW.source_count = 3 THEN 0.85
    WHEN NEW.source_count = 2 THEN 0.70
    ELSE 0.50
  END
  WHERE news_article_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_news_credibility ON news_articles;
CREATE TRIGGER trigger_update_news_credibility
  AFTER INSERT OR UPDATE OF source_count ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_news_credibility();

-- 주석
COMMENT ON COLUMN news_articles.source_count IS '동일 뉴스를 보도한 출처 수 (중복 제거 시 증가)';
COMMENT ON COLUMN news_articles.source_urls IS '중복 뉴스의 모든 원본 URL 목록';
COMMENT ON COLUMN summaries.credibility IS '뉴스 신뢰도 (0.5-0.95, source_count 기반 자동 계산)';
COMMENT ON COLUMN social_media_posts.news_article_id IS '연결된 뉴스 기사 ID';
COMMENT ON COLUMN social_media_posts.needs_update IS '뉴스 내용 변경 시 포스트 업데이트 필요 여부';
