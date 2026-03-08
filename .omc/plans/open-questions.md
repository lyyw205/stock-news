# Open Questions

## add-crypto-news - 2026-03-08
- [ ] Should crypto and stock news have separate auto-publish thresholds? Currently both use score >= 80. Crypto markets are more volatile so the threshold might need tuning. -- Affects auto-publish volume for crypto news.
- [ ] Should international crypto RSS feeds (CoinTelegraph, CoinDesk) be filtered to Korean-language articles only, or should English articles also be ingested? -- Affects AI prompt language and summary output language.
- [ ] Are the 4 selected crypto RSS sources sufficient, or should additional sources (e.g., The Block, Decrypt) be included? -- Affects news coverage breadth.
- [ ] Should the crypto ticker symbol list be hardcoded or fetched from an external API (e.g., CoinGecko top 100)? Hardcoded is simpler but requires manual updates. -- Affects ticker extraction accuracy over time as new coins emerge.
- [ ] Should the social media formatters have crypto-specific formatting (e.g., adding $ prefix to tickers like $BTC)? -- Affects social media post appearance.

## team-agent-pipeline - 2026-03-08
- [ ] Claude API key availability: Is there a Claude API key in the environment, or should the Claude scoring path be deferred? -- Blocks Step 1 (scoring adapter) for the Claude path.
- [ ] Cost budget for cross-verification: Verification doubles API cost for high-score articles. Is there a monthly budget cap? -- Determines whether Step 4 (verification) should default to on or off.
- [ ] Pipeline vs existing crons: Should the new pipeline cron replace `fetch-rss` + `process-articles`, or run alongside? Running both causes duplicate processing unless guarded. -- Affects Step 5 (cron route) design and rollout strategy.
- [ ] Notification channel for verification disagreements: When cross-verification flags a score disagreement, should it log only, or also notify via Telegram/email? -- Affects Step 4 scope.

## api-audit-fixes - 2026-03-09 (v2 개정)
- [x] H-1 인증 범위: 모든 엔드포인트에 인증 추가 (사용자 확정). Phase 0에서 프론트엔드 인증 인프라를 먼저 구축하여 대시보드 파괴 방지.
- [x] CRON_SECRET 미설정 정책: 미설정 시 500 반환 (사용자 확정). 5개 cron 엔드포인트 모두 동일 패턴으로 통일.
- [ ] M-6 중복 발행 판단 기준: `processing` 상태인 기존 포스트가 있을 때 차단할지, `completed`만 차단할지 결정 필요 -- 네트워크 실패 후 재시도가 차단될 수 있음
- [ ] E-2 에러 응답 표준: 프론트엔드에서 현재 에러 응답 형식에 의존하는 코드가 있는지 확인 필요 -- 형식 변경 시 프론트엔드 에러 핸들링이 깨질 수 있음
- [ ] 공통 유틸리티 추출 시점: cron 인증 헬퍼와 에러 응답 헬퍼를 이번 작업에 포함할지, 별도 후속 작업으로 분리할지 -- 코드 중복 vs 변경 범위 최소화 트레이드오프
- [ ] Supabase Auth 로그인 플로우: `authenticatedFetch` 유틸리티가 세션 토큰을 가져오려면 사용자가 로그인해야 함. 현재 대시보드에 로그인 UI가 있는지, 없다면 Phase 0에서 로그인 플로우도 구현해야 하는지 확인 필요 -- Phase 0 범위에 직접 영향
- [ ] handlePublish 응답 처리: publish API가 배열 기반 응답(`summaries[]`)을 반환하는데, 단일 기사 발행 시 `data.summary.successCount` 대신 `data.totalSuccessCount`로 바꾸면 충분한지, 아니면 개별 결과도 표시해야 하는지 -- UX 영향
