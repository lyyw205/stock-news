# API 감사 수정 구현 계획 (v2 -- Architect/Critic 피드백 반영)

**생성일:** 2026-03-09
**개정일:** 2026-03-09
**범위:** 20개 이슈 (CRITICAL 2, HIGH 3, MEDIUM 7, LOW 4, Error Contract 3, 프론트엔드 1)
**예상 복잡도:** MEDIUM
**대상 파일:** ~14개 파일, ~350줄 변경

---

## Phase 0: 프론트엔드 인증 인프라 + API 인증 추가 (우선순위 최상)

### 목표
프론트엔드가 인증 헤더 없이 API를 호출하고 있으므로, 인증 인프라를 먼저 구축한 뒤 API에 인증을 추가한다. 순서를 지키지 않으면 대시보드가 즉시 401로 깨진다.

### 배경
현재 `dashboard-unified/page.tsx`의 모든 fetch 호출에 Authorization 헤더가 없다:
- 30행: `fetch('/api/news/unified?${params}')` -- 헤더 없음
- 48행: `fetch('/api/summaries/generate', {...})` -- Content-Type만
- 76행: `fetch('/api/social-media/publish', {...})` -- Content-Type만

### 수정 대상 및 변경 내용

#### Step 0-1: 인증된 fetch 유틸리티 생성
- **새 파일:** `lib/auth/authenticated-fetch.ts`
- **내용:** Supabase 클라이언트에서 세션 토큰을 가져와 Authorization 헤더에 포함하는 래퍼 함수
  ```typescript
  import { getSupabaseClient } from './supabase-client';

  export async function authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(options.headers);
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    return fetch(url, { ...options, headers });
  }
  ```

#### Step 0-2: 대시보드 fetch 호출에 인증 헤더 적용
- **파일:** `app/dashboard-unified/page.tsx`
- **변경:** 모든 `fetch()` 호출을 `authenticatedFetch()`로 교체
  - 30행: `fetch('/api/news/unified?...')` -> `authenticatedFetch('/api/news/unified?...')`
  - 48행: `fetch('/api/summaries/generate', {...})` -> `authenticatedFetch('/api/summaries/generate', {...})`
  - 76행: `fetch('/api/social-media/publish', {...})` -> `authenticatedFetch('/api/social-media/publish', {...})`

#### Step 0-3: 프론트엔드 publish 요청 페이로드 버그 수정
- **파일:** `app/dashboard-unified/page.tsx` (79행)
- **현재 문제:** `{ articleId, platforms }` (단일 문자열)를 전송하지만 API(`app/api/social-media/publish/route.ts:25`)는 `{ articleIds: [] }` (배열)을 기대
- **변경:**
  ```typescript
  // 기존
  body: JSON.stringify({ articleId, platforms }),

  // 수정
  body: JSON.stringify({ articleIds: [articleId], platforms }),
  ```
- **참고:** 97행의 응답 처리도 배열 기반 응답 형식에 맞게 수정 필요
  ```typescript
  // 기존
  alert(`발행 완료: ${data.summary.successCount}/${platforms.length} 플랫폼`);

  // 수정
  alert(`발행 완료: ${data.totalSuccessCount}/${platforms.length} 플랫폼`);
  ```

#### Step 0-4: 4개 공개 엔드포인트에 인증 추가 (H-1)
- **파일들:**
  - `app/api/news/unified/route.ts` -- 읽기 전용이지만 데이터 노출
  - `app/api/summaries/generate/route.ts` -- AI 호출로 비용 발생
  - `app/api/reports/generate/route.ts` -- AI 호출로 비용 발생
  - `app/api/reports/[articleId]/route.ts` -- 데이터 노출
- **변경:** 각 엔드포인트 상단에 `getUserFromRequest` 인증 체크 추가
  ```typescript
  import { getUserFromRequest } from '@/lib/auth/supabase-server';

  // 핸들러 함수 최상단
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ```
- **주의:** `reports/[articleId]/route.ts`의 404 응답에서 `exists: false` 필드를 반드시 유지할 것 (56-59행). `app/reports/[id]/page.tsx:134`가 `data.exists`에 의존함.

### 예상 변경 규모
- 새 파일 1개, 기존 파일 5개, ~100줄 수정/추가

### 검증 방법
- 인증 없이 4개 엔드포인트 호출 시 401 반환 확인
- 대시보드에서 뉴스 목록 로드, 요약 생성, 발행이 정상 동작하는지 확인
- publish 요청이 `articleIds` 배열로 전송되는지 확인
- `npm run type-check` 통과

---

## Phase 1: CRITICAL 버그수정 + Cron 인증 통일 + batchSize (우선순위 높음)

### 목표
발행 기능을 차단하는 런타임 버그 수정, 모든 cron 엔드포인트 인증 패턴을 "CRON_SECRET 미설정 시 500 반환"으로 통일, 리소스 고갈 방지

### 수정 대상 및 변경 내용

#### Step 1-1: dispatcher.ts summary -> summary_text 컬럼명 수정 (L-4 승격)
- **파일:** `lib/social-media/dispatcher.ts`
- **현재 문제:** 73행에서 `summary` 컬럼을 선택하지만 실제 DB 컬럼은 `summary_text`. 이로 인해 발행 기능 전체가 런타임 에러 발생.
- **변경 (1줄):**
  ```typescript
  // 기존 (73행)
  summaries!inner (id, summary, is_useful)

  // 수정
  summaries!inner (id, summary_text, is_useful)
  ```
- **연쇄 수정 (98행):**
  ```typescript
  // 기존
  summary: summary.summary,

  // 수정
  summary: summary.summary_text,
  ```

#### Step 1-2: 5개 cron 엔드포인트 인증 패턴 통일
사용자 결정: **CRON_SECRET 미설정 시 500 반환**. 현재 파일별 패턴이 다르므로 모두 동일한 새 패턴으로 변경.

**목표 패턴 (모든 cron 공통):**
```typescript
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  console.error('[cron-name] CRON_SECRET not configured');
  return NextResponse.json(
    { success: false, error: 'server_configuration_error', message: 'CRON_SECRET not configured' },
    { status: 500 }
  );
}

if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**파일별 현재 패턴 -> 목표 패턴:**

| 파일 | 현재 패턴 | 변경 사항 |
|------|-----------|-----------|
| `app/api/cron/fetch-rss/route.ts` (10-14행) | `if (cronSecret && authHeader !== ...)` -- 미설정 시 인증 스킵 | `if (!cronSecret) return 500` + `if (authHeader !== ...) return 401` |
| `app/api/cron/process-articles/route.ts` (10-15행) | `if (cronSecret && authHeader !== ...)` -- 미설정 시 인증 스킵 | 동일하게 변경 |
| `app/api/cron/send-notifications/route.ts` (10-15행) | `if (cronSecret && authHeader !== ...)` -- 미설정 시 인증 스킵 | 동일하게 변경 |
| `app/api/cron/run-pipeline/route.ts` (199-204행) | `if (cronSecret && authHeader !== ...)` -- 미설정 시 인증 스킵 | 동일하게 변경 |
| `app/api/cron/update-posts/route.ts` (14-18행) | try 내부에서 `if (authHeader !== Bearer ${process.env.CRON_SECRET})` -- 미설정 시 `Bearer undefined`와 비교 | try 밖으로 이동 + 동일 패턴 적용 |

#### Step 1-3: batchSize 상한값 설정 (H-2)
- **파일:** `app/api/cron/run-pipeline/route.ts` (216행)
- **현재 문제:** `batchSize` 파라미터에 상한이 없어 `?batchSize=99999`로 리소스 고갈 가능
- **변경:**
  ```typescript
  // 기존
  const batchSize = batchSizeParam ? parseInt(batchSizeParam) || 30 : 30;

  // 수정
  const MAX_BATCH_SIZE = 100;
  const parsedBatchSize = batchSizeParam ? parseInt(batchSizeParam) || 30 : 30;
  const batchSize = Math.min(Math.max(1, parsedBatchSize), MAX_BATCH_SIZE);
  ```

#### Step 1-4: subscriptions 에러 응답에서 내부 메시지 제거 (H-3)
- **파일:** `app/api/subscriptions/route.ts` (34-35행, 99-100행)
- **현재 문제:** DB 에러 시 `fetchError.message`를 그대로 노출
- **변경:**
  ```typescript
  // 기존
  return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // 수정
  console.error('Subscription DB error:', fetchError);
  return NextResponse.json(
    { success: false, error: 'database_error', message: 'Failed to process subscription' },
    { status: 500 }
  );
  ```

#### Step 1-5: CLAUDE.md cron 인증 정책 문서 업데이트
- **파일:** `CLAUDE.md`
- **변경:** "미설정 시 인증 스킵" 문구를 "미설정 시 500 반환"으로 수정
  ```markdown
  // 기존
  - `CRON_SECRET` 환경변수로 인증 (미설정 시 인증 스킵)

  // 수정
  - `CRON_SECRET` 환경변수로 인증 (필수 -- 미설정 시 500 에러 반환)
  ```

### 예상 변경 규모
- 파일 7개, ~100줄 수정/추가

### 검증 방법
- dispatcher가 `summary_text` 컬럼을 정상 조회하는지 확인
- `CRON_SECRET` 미설정 상태에서 5개 cron 엔드포인트 호출 시 모두 500 반환 확인
- `CRON_SECRET` 설정 + 잘못된 토큰 시 401 반환 확인
- `CRON_SECRET` 설정 + 올바른 토큰 시 정상 동작 확인
- `?batchSize=999` 전달 시 100으로 클램핑 확인
- subscriptions 에러 응답에 내부 메시지 미포함 확인
- `npm run type-check` 통과

---

## Phase 2: MEDIUM 이슈 수정 -- 안정성 및 정합성

### 목표
사일런트 실패, 파라미터 검증 누락, 데이터 불일치 등 운영 안정성 문제 해소

### 수정 대상 및 변경 내용

#### M-1: analysis_reports 조인 실패 시 로깅 추가
- **파일:** `app/api/news/unified/route.ts` (69행)
- **변경:** 폴백 시 `console.warn` 로깅 추가
  ```typescript
  if (result.error && result.error.message?.includes('analysis_reports')) {
    console.warn('[unified] analysis_reports table not found, falling back:', result.error.message);
    hasReportsTable = false;
  }
  ```

#### M-2: unified route limit 상한값 설정
- **파일:** `app/api/news/unified/route.ts` (14행)
- **변경:**
  ```typescript
  const MAX_LIMIT = 500;
  const rawLimit = parseInt(searchParams.get('limit') || '100');
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
  ```

#### M-3: any 캐스트 제거
- **파일:** `app/api/news/unified/route.ts` (21행, 127행)
- **변경:** Supabase 쿼리 결과에 적절한 타입 인터페이스 정의하여 `any` 제거

#### M-4: run-pipeline 응답 형식 -- 기존 유지 (breaking change 회피)
- **파일:** `app/api/cron/run-pipeline/route.ts` (224행)
- **현재:** `{ success: true, ...result }` (플랫 구조)
- **결정:** **기존 플랫 구조 유지.** 중첩 구조로 바꾸면 `CLAUDE.md`에 명시된 cron API 연동 및 `scripts/pipeline.ts` 호출자가 깨짐. 대신 다른 cron도 플랫 구조를 사용하는 것으로 문서화.
- **변경:** 수정 없음. 주석으로 의도 명시만 추가.
  ```typescript
  // NOTE: 기존 연동 호환성을 위해 플랫 구조 유지 ({ success, ...result })
  return NextResponse.json({ success: true, ...result });
  ```

#### M-5: remaining 카운트 -- 가독성 개선
- **파일:** `app/api/subscriptions/route.ts` (73행)
- **결론:** 현재 로직은 정확하나 가독성 나쁨. 명시적 주석 추가.
  ```typescript
  // 구독 추가 완료 후 남은 슬롯 수 (limitCheck.remaining은 추가 전 기준)
  const remainingAfterInsert = limitCheck.remaining - 1;
  ```

#### M-6: 중복 발행 방지
- **파일:** `lib/social-media/dispatcher.ts`
- **변경:** `publishToSocialMedia` 함수에서 발행 전 기존 포스트 확인
  ```typescript
  const { data: existingPost } = await supabase
    .from('social_media_posts')
    .select('id, status')
    .eq('article_id', articleId)
    .in('status', ['completed', 'processing'])
    .maybeSingle();

  if (existingPost) {
    return { postId: existingPost.id, articleId, status: 'already_published', ... };
  }
  ```

#### M-7: DELETE 404 미반환 수정
- **파일:** `app/api/subscriptions/[id]/route.ts`
- **변경:** 삭제 전 존재 확인
  ```typescript
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  ```

### 예상 변경 규모
- 파일 5개, ~120줄 수정/추가

### 검증 방법
- analysis_reports 없는 환경에서 unified route 호출 시 warn 로그 출력 확인
- `?limit=9999` 전달 시 500으로 클램핑 확인
- `npm run type-check` 통과 (any 제거 후)
- 동일 기사 2회 발행 시 중복 방지 확인
- 존재하지 않는 구독 삭제 시 404 반환 확인

---

## Phase 3: LOW + Error Contract -- 코드 품질 및 에러 계약

### 목표
에러 응답 일관성 확보, 코드 품질 개선

### 수정 대상 및 변경 내용

#### L-1: unified route에 dynamic export 추가
- **파일:** `app/api/news/unified/route.ts`
- **변경:** 파일 상단에 `export const dynamic = 'force-dynamic';` 추가

#### L-2: batchSize camelCase -> batch_size fallback 추가
- **파일:** `app/api/cron/run-pipeline/route.ts`
- **변경:**
  ```typescript
  const batchSizeParam = searchParams.get('batchSize') || searchParams.get('batch_size');
  ```

#### L-3: generationType 검증
- **파일:** `app/api/reports/generate/route.ts` (13행, 85행)
- **변경:**
  ```typescript
  const validTypes: GenerationType[] = ['auto', 'manual'];
  const generationType: GenerationType = validTypes.includes(body.generationType)
    ? body.generationType
    : 'manual';
  ```

#### E-1: 내부 에러 메시지 클라이언트 노출 차단
- **파일:** 여러 파일의 catch 블록
  - `app/api/cron/update-posts/route.ts` (36행)
  - `app/api/cron/run-pipeline/route.ts` (228행)
  - `app/api/reports/generate/route.ts` (98행)
  - `app/api/subscriptions/route.ts` (76행, 107행)
  - `app/api/subscriptions/[id]/route.ts` (37행)
- **변경:** 모든 500 에러 응답에서 `error.message`를 제거하고 일반 메시지 사용
  ```typescript
  // 기존
  { error: error instanceof Error ? error.message : 'Unknown error' }

  // 수정
  console.error('[endpoint-name] Error:', error);
  { success: false, error: 'internal_error', message: 'Internal server error' }
  ```

#### E-2: 500 응답 형식 통일
- **파일:** 모든 API route (E-1 수정과 함께 진행)
- **표준 형식:**
  ```typescript
  // 성공
  { success: true, ...data }

  // 클라이언트 에러 (4xx)
  { error: 'error_code', message: 'Human-readable message' }

  // 서버 에러 (5xx)
  { success: false, error: 'internal_error', message: 'Internal server error' }
  ```
- **주의:** `reports/[articleId]/route.ts`의 404 응답에서 `exists: false` 필드를 반드시 유지. `app/reports/[id]/page.tsx:134`가 `data.exists`에 의존.
  ```typescript
  // reports/[articleId] 404는 기존 형식 유지
  { error: 'Report not found', exists: false }
  ```

#### E-3: summaries/generate에서 정상 상태에 404 반환 수정
- **파일:** `app/api/summaries/generate/route.ts` (77-80행)
- **변경:** 422 (Unprocessable Entity)로 변경
  ```typescript
  return NextResponse.json(
    { error: 'not_scored', message: 'Article has not been scored yet. Score the article first.' },
    { status: 422 }
  );
  ```

### 예상 변경 규모
- 파일 8개, ~100줄 수정

### 검증 방법
- `npm run type-check` 통과
- `npm run lint` 통과
- 모든 500 에러 응답이 통일된 형식인지 확인
- `reports/[articleId]` 404 응답에 `exists: false` 유지 확인
- 미채점 기사에 summary 생성 요청 시 422 반환 확인

---

## 전체 성공 기준

1. **보안:** 모든 공개 엔드포인트에 인증 적용, CRON_SECRET 미설정 시 모든 cron 500 반환
2. **프론트엔드:** 대시보드가 인증 추가 후에도 정상 동작, publish 페이로드 버그 수정
3. **안정성:** 파라미터 상한값 적용, 중복 발행 방지, 404 정확 반환, 컬럼명 불일치 수정
4. **일관성:** 에러 응답 형식 통일, cron 인증 패턴 통일
5. **호환성:** run-pipeline 응답 플랫 구조 유지 (breaking change 없음), reports `exists` 필드 유지
6. **문서:** CLAUDE.md cron 인증 정책 업데이트
7. **빌드:** `npm run type-check && npm run lint && npm test` 전체 통과

## 실행 순서

```
Phase 0 (프론트엔드 인프라 + 인증) -> Phase 1 (CRITICAL 버그 + cron 통일) -> Phase 2 (MEDIUM) -> Phase 3 (LOW + Error Contract)
```

**중요:** Phase 0과 Phase 1은 반드시 순서를 지켜야 한다. Phase 0에서 프론트엔드 인증 인프라를 먼저 구축하지 않으면, Phase 1의 API 인증 추가 시 대시보드가 깨진다. Phase 2와 Phase 3은 독립적이므로 순서 무관.

각 Phase 완료 후 `npm run type-check`로 중간 검증 수행.

## 참고: 공통 유틸리티 추출 검토

Phase 0-3 수정 과정에서 반복되는 패턴이 보이면, 아래 유틸리티 추출을 고려:
- `lib/api/auth-guard.ts` -- cron 인증 헬퍼 함수 (5개 cron에서 동일 패턴 반복)
- `lib/api/error-response.ts` -- 표준 에러 응답 생성 함수

단, 이 추출은 별도 리팩터링 작업으로 분리. 이번 계획에서는 각 파일을 개별 수정하는 것이 안전함.
