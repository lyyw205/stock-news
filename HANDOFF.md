# HANDOFF

## Current [1772977117]
- **Task**: Claude Code CLI 뉴스 분석 워크플로우 구현 + 코인/주식 분리
- **Completed**:
  - 프로젝트 구조 분석 완료
  - 암호화폐 뉴스 지원 추가 (RSS 소스 4개, 티커 추출, 프롬프트, UI 카테고리 필터)
  - CLI 스크립트 3개 생성 (`scripts/cli-fetch.ts`, `scripts/cli-list.ts`, `scripts/cli-save.ts`)
  - `cli-fetch.ts`에 `--category stock|crypto` 옵션 추가로 수집 분리
  - `cli-list.ts`에 `--category` 필터 지원
  - `lib/rss/fetcher.ts`에 `fetchAllRSSSources(category?)` 카테고리 필터 파라미터 추가
  - CLAUDE.md에 CLI 워크플로우 문서 추가
  - Architect 검증 통과 (auto_published 플래그 수정 포함)
  - `npm run build` 성공 확인
  - Supabase MCP 서버 설정 (`sxhtnkxulfrqykrtwxjx` 프로젝트)
- **Next Steps**:
  - `.env.local` Supabase URL/키를 새 프로젝트(`sxhtnkxulfrqykrtwxjx`)로 업데이트
  - Supabase MCP로 필요한 테이블 생성 (news_articles, summaries 등)
  - Claude Code 재시작하여 Supabase MCP 활성화
  - `npx tsx scripts/cli-fetch.ts --category crypto` 실행하여 코인 뉴스 수집 테스트
  - Web 토글 UI 구현 (주식/코인 ON/OFF)
- **Blockers**: WSL2에서 이전 Supabase 프로젝트(`opumwzybnjglxnyksxmo`) DNS 접속 불가 (paused 상태 추정). 새 active 프로젝트(`sxhtnkxulfrqykrtwxjx`)로 마이그레이션 필요.
- **Related Files**:
  - `scripts/cli-fetch.ts` — RSS 수집 (--category 지원)
  - `scripts/cli-list.ts` — 미처리 기사 조회 (--category 지원)
  - `scripts/cli-save.ts` — 분석 결과 저장
  - `lib/rss/fetcher.ts` — RSS 소스 정의 + fetchAllRSSSources()
  - `CLAUDE.md` — CLI 워크플로우 문서
  - `.env.local` — Supabase 환경변수 (업데이트 필요)
  - `supabase/migrations/` — DB 마이그레이션 SQL 파일들
