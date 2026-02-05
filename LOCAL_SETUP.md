# 로컬 개발 환경 설정 가이드

## 1. 환경 변수 설정

```bash
# .env.local 파일 생성
cp .env.local.example .env.local
```

## 2. Supabase 설정 (필수)

### 프로젝트 생성
1. https://supabase.com 접속 후 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호 설정
4. Region은 "Northeast Asia (Seoul)" 선택

### API 키 가져오기
1. Project Settings > API 이동
2. 다음 값들을 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 데이터베이스 마이그레이션
1. SQL Editor 이동
2. `supabase/migrations/001_initial_schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행 (Run)

## 3. Google Gemini API 키 발급 (필수)

1. https://ai.google.dev 접속
2. "Get API key in Google AI Studio" 클릭
3. API 키 생성 후 복사
4. `.env.local`에 `GEMINI_API_KEY=` 에 붙여넣기

## 4. 선택적 설정

### Resend (이메일 알림) - 선택사항
1. https://resend.com 접속
2. 가입 후 API 키 생성
3. `.env.local`에 `RESEND_API_KEY=` 추가
4. **알림 기능을 테스트하지 않으면 생략 가능**

### Firebase (푸시 알림) - 선택사항
1. https://console.firebase.google.com 접속
2. 프로젝트 생성
3. Cloud Messaging 활성화
4. Service account 키 다운로드
5. `.env.local`에 Firebase 정보 추가
6. **푸시 알림을 테스트하지 않으면 생략 가능**

### Cron Secret
```bash
# 랜덤 문자열 생성
openssl rand -base64 32
```
생성된 값을 `CRON_SECRET=` 에 입력

## 5. 의존성 설치 및 실행

```bash
# 의존성 설치 (이미 되어있을 것)
npm install

# 개발 서버 실행
npm run dev
```

## 6. 접속

브라우저에서 http://localhost:3000 접속

## 7. 초기 데이터 테스트

### 수동으로 RSS 수집 실행
```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/fetch-rss
```

### AI 처리 실행
```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/process-articles
```

### 알림 발송 (선택)
```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/send-notifications
```

## 최소 설정으로 시작하기

**필수 항목만으로 시작:**
1. ✅ Supabase (데이터베이스 + 인증)
2. ✅ Gemini API (AI 처리)
3. ✅ CRON_SECRET (수동 실행용)

**선택 항목:**
- ❌ Resend (나중에 이메일 알림 테스트할 때)
- ❌ Firebase (나중에 푸시 알림 테스트할 때)

## 트러블슈팅

### "Unauthorized" 오류
→ Supabase 키가 올바른지 확인

### "GEMINI_API_KEY is not set" 오류
→ Gemini API 키가 `.env.local`에 설정되어 있는지 확인

### 뉴스가 안 보임
→ 먼저 RSS 수집 → AI 처리를 수동으로 실행해보세요

### 데이터베이스 오류
→ Supabase SQL Editor에서 마이그레이션이 제대로 실행되었는지 확인
