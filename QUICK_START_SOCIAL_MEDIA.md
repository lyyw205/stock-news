# 소셜 미디어 자동 게시 시스템 - 빠른 시작 가이드

## 🚀 5분 안에 시작하기

### 1단계: 데이터베이스 설정 (1분)

Supabase 대시보드에서:

1. SQL Editor 열기
2. `supabase/migrations/002_social_media_schema.sql` 파일 내용 복사
3. 실행 (Run)

### 2단계: 개발 서버 실행 (30초)

```bash
npm run dev
```

### 3단계: 관리자 대시보드 접속 (30초)

브라우저에서:
```
http://localhost:3000/dashboard-admin
```

### 4단계: 뉴스 게시 (1분)

1. ☑️ 유용한 뉴스 선택 (체크박스 클릭)
2. ☑️ 플랫폼 선택 (텔레그램, 트위터, Threads, 토스주식)
3. 🚀 "게시하기" 버튼 클릭
4. ✅ 결과 확인

## 📊 데이터 확인

Supabase 대시보드에서 테이블 확인:

```sql
-- 최근 게시 내역
SELECT * FROM social_media_posts ORDER BY created_at DESC LIMIT 10;

-- 플랫폼별 로그
SELECT * FROM social_media_log ORDER BY created_at DESC LIMIT 10;
```

## 🎯 주요 특징

- ✅ Mock 모드 (실제 게시 없음)
- ✅ 4개 플랫폼 지원
- ✅ 플랫폼별 최적화
- ✅ 성공/실패 로깅
- ✅ 병렬 게시

## 📁 주요 파일

- 대시보드: `app/dashboard-admin/page.tsx`
- API: `app/api/social-media/publish/route.ts`
- 라이브러리: `lib/social-media/`
- 테스트: `tests/unit/social-media/`

## 🧪 테스트

```bash
npm test tests/unit/social-media/
```

## 📚 상세 문서

- [전체 구현 문서](./SOCIAL_MEDIA_IMPLEMENTATION.md)
- [라이브러리 README](./lib/social-media/README.md)

## ⚠️ 중요

현재는 **Mock 모드**로 동작합니다. 실제 소셜 미디어에 게시되지 않습니다.

실제 API 연동 방법은 `lib/social-media/README.md`를 참조하세요.
