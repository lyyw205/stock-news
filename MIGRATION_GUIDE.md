# 마이그레이션 실행 가이드

중복 제거 시스템을 위한 데이터베이스 마이그레이션 실행 방법을 안내합니다.

---

## 🎯 방법 선택

### ✅ 방법 1: Supabase Dashboard (가장 쉬움, 권장)

1. **Supabase Dashboard 접속**
   - https://app.supabase.com 로그인
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭

3. **SQL 복사 & 붙여넣기**
   ```bash
   # 마이그레이션 파일 내용 보기
   cat supabase/migrations/004_deduplication_support.sql
   ```
   - 위 파일의 전체 내용을 복사
   - SQL Editor에 붙여넣기

4. **실행**
   - "Run" 버튼 클릭
   - 성공 메시지 확인

---

### ✅ 방법 2: npm 스크립트 (자동화)

**전제 조건:** `.env.local`에 실제 Supabase 정보 설정 필요

1. **환경 변수 확인**
   ```bash
   # .env.local 파일 열기
   nano .env.local
   ```

   다음 값들이 실제 값으로 설정되어 있는지 확인:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...실제키...
   ```

2. **마이그레이션 실행**
   ```bash
   npm run migrate:dedup
   ```

3. **결과 확인**
   - 성공 시: ✅ Migration completed successfully!
   - 실패 시: SQL을 수동으로 실행하라는 안내 표시

---

### ✅ 방법 3: PostgreSQL 클라이언트 (고급 사용자)

**전제 조건:** `psql` 설치 필요

1. **psql 설치**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-client

   # macOS
   brew install postgresql
   ```

2. **데이터베이스 정보 확인**
   - Supabase Dashboard > Settings > Database
   - Connection String 복사

3. **마이그레이션 실행**
   ```bash
   # 직접 연결
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" \
     -f supabase/migrations/004_deduplication_support.sql

   # 또는 스크립트 사용
   ./scripts/run-migration.sh
   ```

---

## 📋 마이그레이션 내용

이 마이그레이션은 다음을 추가합니다:

### 새 컬럼

```sql
-- news_articles
source_count      INTEGER      -- 출처 수 (기본값: 1)
source_urls       JSONB        -- 출처 URL 배열

-- summaries
credibility       DECIMAL(3,2) -- 신뢰도 (0.5-0.95)

-- social_media_posts
news_article_id   UUID         -- 뉴스 연결
needs_update      BOOLEAN      -- 업데이트 필요 여부
```

### 인덱스

```sql
-- 중복 검색 최적화
idx_news_articles_ticker_pubdate
idx_news_articles_source_count
idx_social_media_posts_needs_update
idx_social_media_posts_news_article
```

### 트리거 & 함수

```sql
-- source_count 변경 시 credibility 자동 계산
update_news_credibility()
trigger_update_news_credibility
```

---

## 🔍 마이그레이션 확인

마이그레이션이 성공적으로 실행되었는지 확인:

```sql
-- 1. 새 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'news_articles'
  AND column_name IN ('source_count', 'source_urls');

-- 2. 트리거 확인
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'news_articles';

-- 3. 테스트 데이터 삽입
INSERT INTO news_articles (
  ticker, title, description, url, pub_date, source_count
) VALUES (
  '005930',
  '테스트 뉴스',
  '테스트 설명',
  'https://test.com/1',
  NOW(),
  3
);

-- 4. credibility 자동 계산 확인
SELECT credibility
FROM summaries
WHERE article_id = (
  SELECT id FROM news_articles
  WHERE title = '테스트 뉴스'
);
-- 결과: 0.85 (출처 3개 = 85% 신뢰도)
```

---

## ❌ 문제 해결

### 문제: "relation already exists"

**원인:** 이미 마이그레이션이 실행됨

**해결:**
```sql
-- 이미 실행된 마이그레이션 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'news_articles'
  AND column_name = 'source_count';

-- 결과가 있으면 이미 실행된 것 (추가 실행 불필요)
```

---

### 문제: "permission denied"

**원인:** Service Role Key 권한 부족

**해결:**
1. Supabase Dashboard > Settings > API
2. Service Role Key 확인 (anon key가 아님!)
3. `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY` 업데이트

---

### 문제: "exec_sql function not found"

**원인:** Supabase 프로젝트에 exec_sql 함수가 없음

**해결:** 방법 1 (Dashboard) 사용 권장

---

## 🔄 롤백 (되돌리기)

마이그레이션을 되돌려야 하는 경우:

```sql
-- 컬럼 삭제
ALTER TABLE news_articles DROP COLUMN IF EXISTS source_count;
ALTER TABLE news_articles DROP COLUMN IF EXISTS source_urls;
ALTER TABLE summaries DROP COLUMN IF EXISTS credibility;
ALTER TABLE social_media_posts DROP COLUMN IF EXISTS news_article_id;
ALTER TABLE social_media_posts DROP COLUMN IF EXISTS needs_update;

-- 트리거 삭제
DROP TRIGGER IF EXISTS trigger_update_news_credibility ON news_articles;
DROP FUNCTION IF EXISTS update_news_credibility();

-- 인덱스 삭제
DROP INDEX IF EXISTS idx_news_articles_ticker_pubdate;
DROP INDEX IF EXISTS idx_news_articles_source_count;
DROP INDEX IF EXISTS idx_social_media_posts_needs_update;
DROP INDEX IF EXISTS idx_social_media_posts_news_article;
```

---

## 📞 추가 도움

- Supabase 문서: https://supabase.com/docs
- 프로젝트 이슈: https://github.com/your-repo/issues
- 상세 가이드: `DEDUPLICATION_GUIDE.md`
