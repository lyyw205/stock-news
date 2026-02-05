# 중복 뉴스 처리 및 포스트 업데이트 시스템

## 📋 개요

뉴스 중복 제거 및 신뢰도 기반 업데이트 시스템이 구현되었습니다.

### 주요 기능

1. **중복 뉴스 자동 감지** - 유사한 제목/내용의 뉴스를 자동으로 탐지
2. **신뢰도 스코어링** - 출처 수에 따라 뉴스 신뢰도 자동 계산
3. **소셜미디어 포스트 자동 업데이트** - 내용 변경 시 기존 포스트 수정

---

## 🔍 중복 감지 시스템

### 작동 방식

1. **텍스트 유사도 계산**
   - 자카드 유사도 (단어 집합 비교)
   - 레벤슈타인 거리 (편집 거리)
   - 종합 유사도 = 자카드 70% + 레벤슈타인 30%

2. **중복 판단 기준**
   ```typescript
   DUPLICATE_THRESHOLD = 0.75  // 75% 이상 유사하면 중복
   SIMILAR_THRESHOLD = 0.6     // 60% 이상 유사하면 관련 뉴스
   ```

3. **중복 처리 로직**
   - 새 뉴스 입력 시 최근 7일 내 동일 종목 뉴스와 비교
   - 중복 발견 시:
     - 기존 뉴스의 `source_count` +1
     - `source_urls` 배열에 새 URL 추가
     - 신뢰도 자동 재계산
     - 소셜미디어 포스트 업데이트 플래그 설정

### 예시

```
원본 뉴스: "삼성전자, 4분기 실적 발표"
새 뉴스: "삼성전자 4분기 영업이익 발표"
→ 유사도 87% → 중복으로 판단
→ source_count: 1 → 2
→ credibility: 0.5 → 0.7
```

---

## 📊 신뢰도 스코어링

### 신뢰도 계산 공식

| 출처 수 | 신뢰도 | 의미 |
|--------|--------|------|
| 1개 | 0.50 | 단일 출처 |
| 2개 | 0.70 | 복수 출처 확인 |
| 3개 | 0.85 | 높은 신뢰도 |
| 4개 이상 | 0.95 | 매우 높은 신뢰도 |

### DB 자동 업데이트

```sql
-- source_count 변경 시 자동으로 credibility 계산
CREATE TRIGGER trigger_update_news_credibility
  AFTER UPDATE OF source_count ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_news_credibility();
```

---

## 🔄 소셜미디어 포스트 업데이트

### 업데이트 플로우

```
1. 중복 뉴스 발견
   ↓
2. source_count 증가
   ↓
3. credibility 재계산
   ↓
4. social_media_posts.needs_update = true 설정
   ↓
5. Cron 작업 (매 시간마다)
   ↓
6. 플랫폼별 포스트 수정 API 호출
   ↓
7. needs_update = false, 업데이트 완료
```

### 업데이트되는 내용

```
✅ [업데이트] 삼성전자, 4분기 영업이익 6.5조원 기록

삼성전자가 2024년 4분기 영업이익 6.5조원을 기록...
📰 3개 출처에서 보도

📊 점수: 85점 (S등급)
🟢 투자심리

🔗 https://example.com/news
```

### 플랫폼별 지원

| 플랫폼 | 포스트 수정 | 비고 |
|--------|------------|------|
| Telegram | ✅ 지원 | editMessageText API |
| Threads | ✅ 지원 | Update API |
| Toss | ✅ 지원 | Edit API |
| Twitter/X | ❌ 미지원 | 삭제 후 재작성 필요 |

---

## 🗄️ DB 스키마 변경

### news_articles 테이블

```sql
ALTER TABLE news_articles
ADD COLUMN source_count INTEGER DEFAULT 1;

ALTER TABLE news_articles
ADD COLUMN source_urls JSONB DEFAULT '[]'::jsonb;
```

### summaries 테이블

```sql
ALTER TABLE summaries
ADD COLUMN credibility DECIMAL(3, 2) DEFAULT 0.5;
```

### social_media_posts 테이블

```sql
ALTER TABLE social_media_posts
ADD COLUMN news_article_id UUID REFERENCES news_articles(id);

ALTER TABLE social_media_posts
ADD COLUMN needs_update BOOLEAN DEFAULT FALSE;
```

---

## 🔧 사용 방법

### 1. 마이그레이션 실행

```bash
# Supabase에서 마이그레이션 실행
psql -h <host> -U postgres -d postgres -f supabase/migrations/004_deduplication_support.sql
```

### 2. Cron 작업 설정

`vercel.json`에 이미 추가됨:

```json
{
  "path": "/api/cron/update-posts",
  "schedule": "0 * * * *"  // 매 시간마다
}
```

### 3. 수동으로 중복 체크

```typescript
import { deduplicateNews } from '@/lib/services/deduplication';

const articles = [/* ... */];
const deduplicated = deduplicateNews(articles);
```

### 4. 포스트 수동 업데이트

```typescript
import { updateOutdatedPosts } from '@/lib/services/post-updater';

const result = await updateOutdatedPosts();
console.log(`Updated: ${result.updated}, Failed: ${result.failed}`);
```

---

## 📈 모니터링

### 처리 결과 확인

```typescript
// Cron 작업 로그
{
  processed: 10,      // 처리된 뉴스
  filtered: 8,        // 유용한 뉴스
  summarized: 6,      // 요약 생성
  deduplicated: 2,    // 중복 제거
  errors: 0
}

// 포스트 업데이트 로그
{
  updated: 5,         // 업데이트 성공
  failed: 0,          // 업데이트 실패
  errors: []
}
```

### DB 쿼리

```sql
-- 신뢰도 높은 뉴스 조회
SELECT title, source_count, credibility
FROM news_articles a
JOIN summaries s ON a.id = s.article_id
WHERE credibility >= 0.85
ORDER BY source_count DESC;

-- 업데이트 대기 중인 포스트
SELECT COUNT(*)
FROM social_media_posts
WHERE needs_update = true
  AND status = 'published';
```

---

## ⚙️ 설정

### 유사도 임계값 조정

`lib/utils/text-similarity.ts`:

```typescript
export const DUPLICATE_THRESHOLD = 0.75;  // 기본값 75%
export const SIMILAR_THRESHOLD = 0.6;     // 기본값 60%
```

### 신뢰도 공식 변경

`lib/services/deduplication.ts`:

```typescript
export function calculateCredibility(sourceCount: number): number {
  if (sourceCount >= 4) return 0.95;
  if (sourceCount === 3) return 0.85;
  if (sourceCount === 2) return 0.7;
  return 0.5;
}
```

---

## 🧪 테스트

```bash
# 중복 감지 테스트
npm test lib/utils/text-similarity.test.ts

# 통합 테스트
npm test lib/services/deduplication.test.ts
```

---

## 📝 주의사항

1. **Twitter/X 제한**
   - Twitter는 포스트 수정 API가 없어 업데이트 불가
   - 향후 삭제 후 재작성 로직 추가 예정

2. **유사도 계산 성능**
   - 많은 뉴스 비교 시 O(n²) 복잡도
   - 최근 7일 뉴스로 제한하여 성능 최적화

3. **동시성 처리**
   - 중복 체크 중 새 뉴스 입력 시 race condition 가능
   - DB 트랜잭션으로 해결

---

## 🚀 향후 개선 계획

- [ ] AI 기반 유사도 계산 (임베딩 사용)
- [ ] 실시간 중복 알림
- [ ] 포스트 업데이트 이력 추적
- [ ] Twitter 삭제 후 재작성 기능
- [ ] 중복 뉴스 대시보드
