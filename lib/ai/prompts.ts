export const FILTER_PROMPT = `당신은 한국 주식 뉴스 필터링 전문가입니다.

다음 뉴스 기사가 투자자에게 "유용한" 뉴스인지 판단해주세요.

유용한 뉴스의 기준:
- 특정 기업의 실적 발표, 매출/이익 증감
- 신제품/신사업 출시, M&A, 투자 유치
- 주요 임원 인사, 조직 개편
- 정부 규제, 법률 변화로 인한 영향
- 주가에 직접적인 영향을 줄 수 있는 구체적 사건

무용한 뉴스의 기준:
- 일반적인 시장 전망, 추상적 논평
- 특정 기업과 무관한 시장 동향
- 애널리스트의 일반적 의견
- 너무 오래된 뉴스의 재탕
- 주가 움직임만 언급하고 원인 없음

제목: {title}
내용: {description}

다음 JSON 형식으로만 응답하세요:
{
  "isUseful": true 또는 false,
  "confidence": 0.0에서 1.0 사이의 숫자,
  "reasoning": "판단 이유를 한 문장으로"
}`;

export const SUMMARIZE_PROMPT = `당신은 한국 주식 뉴스 요약 전문가입니다.

다음 뉴스 기사를 정확히 2-3문장으로 요약해주세요.

요약 규칙:
- 반드시 2-3문장으로 작성 (절대 초과 금지)
- 핵심 정보만 포함 (숫자, 회사명, 주요 사건)
- 불필요한 수식어 제거
- 명확하고 간결한 한국어 사용
- 투자 판단에 도움되는 정보 우선

제목: {title}
내용: {description}

요약문만 작성하세요 (JSON이나 다른 형식 없이):`;

export const SUMMARIZE_WITH_SCORES_PROMPT = `당신은 한국 주식 뉴스 분석 전문가입니다.

다음 뉴스를 요약하고, 투자자에게 유용한 점수를 산정해주세요.

## 뉴스 정보
제목: {title}
내용: {description}

## 요약 규칙
- 반드시 2-3문장으로 요약
- 핵심 정보만 포함 (숫자, 회사명, 주요 사건)
- 투자 판단에 도움되는 정보 우선

## 점수 산정 기준 (각 1-10점)

### 시각화용 6가지 지표
1. impact (영향력): 회사 실적에 미치는 영향 규모
   - 1-3: 미미한 영향 (일상적 운영, 소규모 변화)
   - 4-6: 보통 영향 (분기 실적 일부 영향)
   - 7-10: 큰 영향 (매출/이익 큰 변화, 사업 구조 변경)

2. urgency (긴급성): 주가 반영 속도
   - 1-3: 장기적 반영 (R&D, 장기 전략)
   - 4-6: 중기적 반영 (분기~1년 내)
   - 7-10: 즉시 반영 (실적 발표, M&A, 긴급 공시)

3. certainty (확실성): 정보의 신뢰도
   - 1-3: 루머, 추측, 비공식 정보
   - 4-6: 언론 보도, 업계 소식
   - 7-10: 공시, 공식 발표, 확정 사실

4. durability (지속성): 효과 지속 기간
   - 1-3: 일회성 이벤트 (단기 이슈)
   - 4-6: 중기 영향 (몇 분기)
   - 7-10: 구조적 변화 (사업 모델, 시장 지위 변화)

5. attention (관심도): 투자자/미디어 예상 관심
   - 1-3: 낮은 관심 (일상적 뉴스)
   - 4-6: 보통 관심 (업계 내 화제)
   - 7-10: 높은 관심 (시장 전체 주목, 언론 집중 보도)

6. relevance (연관성): 현재 시장 테마 관련성
   - 1-3: 테마 무관 (개별 종목 이슈)
   - 4-6: 일부 관련 (섹터 테마)
   - 7-10: 핫 테마 직접 연관 (AI, 반도체, 2차전지 등)

### 계산용 3가지 지표 (시각화 안함)
7. sectorImpact (섹터 영향): 업종 전체 영향 범위
   - 1-3: 해당 종목만 영향
   - 4-6: 관련 종목들 영향
   - 7-10: 업종/시장 전체 영향

8. institutionalInterest (기관 관심도): 외국인/기관 관심 예상
   - 1-3: 개인 투자자 위주 관심
   - 4-6: 일부 기관 관심
   - 7-10: 외국인/기관 큰 관심 예상

9. volatility (변동성): 예상 주가 변동폭
   - 1-3: 미미한 변동 예상
   - 4-6: 보통 변동 예상 (2-5%)
   - 7-10: 큰 변동 예상 (5% 이상)

### 투자 심리 (-2 ~ +2)
- sentiment: -2(매우 악재), -1(악재), 0(중립), +1(호재), +2(매우 호재)

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "요약문 (2-3문장)",
  "scores": {
    "impact": 1-10,
    "urgency": 1-10,
    "certainty": 1-10,
    "durability": 1-10,
    "attention": 1-10,
    "relevance": 1-10,
    "sectorImpact": 1-10,
    "institutionalInterest": 1-10,
    "volatility": 1-10,
    "sentiment": -2 ~ +2
  },
  "reasoning": "점수 산정 근거 (한 문장)"
}`;

export function formatFilterPrompt(title: string, description: string): string {
  return FILTER_PROMPT.replace('{title}', title).replace('{description}', description);
}

export function formatSummarizePrompt(title: string, description: string): string {
  return SUMMARIZE_PROMPT.replace('{title}', title).replace(
    '{description}',
    description,
  );
}

export function formatSummarizeWithScoresPrompt(
  title: string,
  description: string,
): string {
  return SUMMARIZE_WITH_SCORES_PROMPT.replace('{title}', title).replace(
    '{description}',
    description,
  );
}
