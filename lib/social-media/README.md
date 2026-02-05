# Social Media Auto-Posting System

소셜 미디어 자동 게시 시스템 - Mock 구현

## 개요

이 시스템은 AI 요약된 뉴스를 여러 소셜 미디어 플랫폼(텔레그램, 트위터, Threads, 토스주식)에 자동으로 게시하는 기능을 제공합니다. 현재는 Mock 구현으로, 실제 API 호출 없이 성공/실패를 시뮬레이션합니다.

## 구조

```
lib/social-media/
├── types.ts                     # 공통 타입 정의
├── platforms/                   # 플랫폼별 Mock 구현
│   ├── telegram.ts             # 텔레그램 (성공률 95%)
│   ├── twitter.ts              # 트위터 (성공률 90%)
│   ├── threads.ts              # Threads (성공률 92%)
│   └── toss.ts                 # 토스주식 (성공률 88%)
├── formatters/                  # 플랫폼별 포맷터
│   ├── telegram-formatter.ts   # Markdown + 이모지
│   ├── twitter-formatter.ts    # 280자 제한 + 해시태그
│   ├── threads-formatter.ts    # 시각적 구분선 + 이모지
│   └── toss-formatter.ts       # 간결한 커뮤니티 스타일
└── dispatcher.ts                # 게시 오케스트레이터
```

## 주요 기능

### 1. 플랫폼별 포맷팅

각 플랫폼에 최적화된 형식으로 뉴스를 포맷:

- **텔레그램**: Markdown 지원, 이모지 풍부
- **트위터**: 280자 제한, 해시태그 3개
- **Threads**: Instagram 스타일, 구분선 사용
- **토스주식**: 간결한 커뮤니티 포맷

### 2. Mock 시뮬레이션

실제 API 없이 현실적인 성공/실패 시나리오 테스트:

- 플랫폼별 차등 성공률 (88-95%)
- 네트워크 지연 시뮬레이션 (100-700ms)
- 다양한 에러 코드 (`RATE_LIMIT`, `NETWORK_ERROR`, 등)

### 3. 병렬 게시

여러 플랫폼에 동시에 게시하여 효율성 극대화

### 4. 상세 로깅

`social_media_posts` 및 `social_media_log` 테이블에 모든 게시 시도 기록

## 사용법

### API를 통한 게시

```typescript
// POST /api/social-media/publish
const response = await fetch('/api/social-media/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    articleIds: ['article-id-1', 'article-id-2'],
    platforms: ['telegram', 'twitter', 'threads', 'toss'],
  }),
});
```

### 프로그래밍 방식

```typescript
import { publishToSocialMedia } from '@/lib/social-media';

const result = await publishToSocialMedia({
  articleId: 'article-id',
  platforms: ['telegram', 'twitter'],
  retryFailures: false,
});

console.log(`성공: ${result.successCount}, 실패: ${result.failureCount}`);
```

### 관리자 대시보드

브라우저에서 `/dashboard-admin` 접속:

1. 유용한 뉴스 선택
2. 게시할 플랫폼 선택
3. "게시하기" 버튼 클릭

## 데이터베이스 스키마

### social_media_posts

게시 요청 전체 기록:

- `article_id`: 뉴스 기사 ID
- `summary_id`: AI 요약 ID
- `platforms`: 선택된 플랫폼 목록
- `status`: pending | processing | completed | partial_failure | failed
- `success_count`: 성공한 플랫폼 수
- `failure_count`: 실패한 플랫폼 수

### social_media_log

플랫폼별 상세 로그:

- `post_id`: 게시 요청 ID
- `platform`: telegram | twitter | threads | toss
- `status`: pending | sent | failed | retrying
- `formatted_content`: 포맷된 텍스트
- `platform_response`: 플랫폼 응답 (Mock 데이터)
- `error_message`: 에러 메시지
- `error_code`: 에러 코드

### summaries (수정)

소셜 미디어 게시 추적:

- `social_posted`: 게시 여부
- `social_posted_at`: 최초 게시 시각
- `social_post_count`: 총 게시 횟수

## 테스트

```bash
# 전체 테스트 실행
npm test tests/unit/social-media/

# 개별 테스트
npm test tests/unit/social-media/telegram.test.ts
npm test tests/unit/social-media/twitter.test.ts
npm test tests/unit/social-media/formatters.test.ts
npm test tests/unit/social-media/dispatcher.test.ts
```

## Mock 특징

### 성공률

- 텔레그램: 95%
- 트위터: 90%
- Threads: 92%
- 토스주식: 88%

### 에러 시나리오

- `RATE_LIMIT`: API 호출 제한 초과
- `NETWORK_ERROR`: 네트워크 오류
- `INVALID_CONTENT`: 유효하지 않은 콘텐츠
- `DUPLICATE_POST`: 중복 게시물
- `AUTH_FAILED`: 인증 실패
- `CONTENT_TOO_LONG`: 콘텐츠 길이 초과

## 실제 API로 전환하기

각 플랫폼의 `publish()` 메서드를 실제 API 호출로 교체:

### 1. 텔레그램

```typescript
// lib/social-media/platforms/telegram.ts
async publish(content: FormattedContent): Promise<PublishResult> {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: content.text,
        parse_mode: 'Markdown',
      }),
    }
  );
  // ... handle response
}
```

### 2. 트위터

```typescript
// lib/social-media/platforms/twitter.ts
import { TwitterApi } from 'twitter-api-v2';

async publish(content: FormattedContent): Promise<PublishResult> {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });

  const tweet = await client.v2.tweet(content.text);
  // ... handle response
}
```

### 3. Threads & 토스주식

각 플랫폼의 공식 API 문서를 참고하여 구현

## 모니터링

게시 성공률 및 에러 추적:

```sql
-- 플랫폼별 성공률
SELECT
  platform,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM social_media_log
GROUP BY platform;

-- 최근 실패 로그
SELECT *
FROM social_media_log
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## 주의사항

- 현재는 Mock 구현으로 실제 게시되지 않습니다
- 실제 API 연동 시 환경변수에 인증 정보 필요
- 플랫폼별 API 사용 제한 확인 필요
- 프로덕션 환경에서는 재시도 로직 강화 권장

## 라이선스

이 프로젝트의 라이선스를 따릅니다.
