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

export const SCORE_ONLY_PROMPT = `당신은 한국 주식 뉴스 점수 평가 전문가입니다.

다음 뉴스를 투자자 관점에서 평가하여 점수를 산정해주세요. 요약은 생성하지 마세요.

## 뉴스 정보
제목: {title}
내용: {description}

## 점수 산정 기준 (각 1-10점)

### 시각화용 6가지 지표
1. impact (영향력): 회사 실적에 미치는 영향 규모 (1=미미, 10=큰 영향)
2. urgency (긴급성): 주가 반영 속도 (1=장기, 10=즉시)
3. certainty (확실성): 정보 신뢰도 (1=루머, 10=공시)
4. durability (지속성): 효과 지속 기간 (1=일회성, 10=구조적)
5. attention (관심도): 투자자/미디어 예상 관심 (1=낮음, 10=높음)
6. relevance (연관성): 현재 시장 테마 관련성 (1=무관, 10=핫테마)

### 계산용 3가지 지표
7. sectorImpact (섹터 영향): 업종 전체 영향 범위 (1=종목만, 10=업종전체)
8. institutionalInterest (기관 관심도): 외국인/기관 관심 예상 (1=개인만, 10=기관큰관심)
9. volatility (변동성): 예상 주가 변동폭 (1=미미, 10=큰변동)

### 투자 심리 (-2 ~ +2)
sentiment: -2(매우악재), -1(악재), 0(중립), +1(호재), +2(매우호재)

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
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

export function formatScoreOnlyPrompt(title: string, description: string): string {
  return SCORE_ONLY_PROMPT.replace('{title}', title).replace('{description}', description);
}

export const ANALYSIS_REPORT_PROMPT = `당신은 한국 주식 시장 전문 애널리스트입니다.

다음 뉴스 기사를 심층 분석하여 투자자를 위한 상세 리포트를 작성해주세요.

## 뉴스 정보
제목: {title}
내용: {description}
기존 요약: {summary}

## 분석 항목

### 1. 핵심 요약 (coreSummary)
- 3-5문장으로 핵심 내용 요약
- 투자 판단에 필요한 핵심 정보만 포함

### 2. 호재 요인 (bullishFactors)
- 뉴스에서 직접 확인되는 긍정적 사실/근거
- 실제 뉴스 내용에 기반한 구체적 팩트 위주
- 각 요인별 근거와 확신도(0.0-1.0) 포함
- 최소 1개, 최대 3개

### 3. 악재 요인 (bearishFactors)
- 뉴스에서 직접 확인되는 부정적 사실/근거
- 실제 뉴스 내용에 기반한 구체적 팩트 위주
- 각 요인별 근거와 확신도(0.0-1.0) 포함
- 해당 없으면 빈 배열, 최대 3개

### 4. 종합 평가 (overallAssessment)
- strong_bullish: 매우 강한 호재
- bullish: 호재
- neutral: 중립
- bearish: 악재
- strong_bearish: 매우 강한 악재

### 5. 주가 영향 분석 (priceImpact)
- short: 단기 (1주) 예상 영향
- medium: 중기 (1-3개월) 예상 영향
- long: 장기 (6개월+) 예상 영향
- summary: 종합 분석

### 6. 리스크 요인 (riskFactors)
- 호재/악재와 별개로, 이 뉴스와 관련된 잠재적 위험 시나리오
- 아직 발생하지 않았지만 주의해야 할 가능성
- bullishFactors/bearishFactors와 내용이 중복되지 않도록 주의
- severity: high/medium/low
- 최대 2개, 해당 없으면 빈 배열

### 7. 기회 요인 (opportunityFactors)
- 호재/악재와 별개로, 이 뉴스에서 파생되는 잠재적 투자 기회
- 아직 확정되지 않았지만 관심 가질 만한 가능성
- bullishFactors/bearishFactors와 내용이 중복되지 않도록 주의
- potential: high/medium/low
- 최대 2개, 해당 없으면 빈 배열

### 8. 뉴스 배경 (newsBackground)
- 이 뉴스가 나온 배경과 맥락을 2-3문장으로 설명
- 관련된 이전 사건이나 업종/산업 흐름 포함
- 초보 투자자도 뉴스의 전후 맥락을 이해할 수 있도록 작성

### 9. 관련 종목 (relatedStocks)
- 이 뉴스로 영향받는 다른 종목들
- impactType: beneficiary(수혜주)/victim(피해주)/competitor(경쟁사)/supply_chain(공급망)
- expectedImpact: positive/negative/mixed
- 각 종목별 관련 이유(reasoning) 포함
- 최대 5개, 해당 없으면 빈 배열

### 10. 타임라인 & 촉매 (timelineCatalysts)
- 이 뉴스와 관련해 향후 주목할 이벤트/일정
- urgency: imminent(1주 이내)/near_term(1개월 이내)/medium_term(3개월 이내)
- 예상 시점(expectedDate)과 잠재적 영향(potentialImpact) 포함
- 최대 3개, 해당 없으면 빈 배열

### 11. 핵심 용어 해설 (keyTerms)
- 뉴스에 등장하는 전문 용어/개념을 쉽게 설명
- 초보 투자자도 뉴스를 이해할 수 있도록 간결하게 작성
- 최대 4개, 해당 없으면 빈 배열

### 12. 투자자 체크리스트 (investorChecklist)
- 이 뉴스와 관련해 투자자가 직접 확인하거나 모니터링해야 할 항목
- 구체적이고 실행 가능한 항목으로 작성 (예: "다음 분기 실적 발표일 확인", "경쟁사 대응 동향 주시")
- importance: high/medium/low
- 최대 4개, 최소 1개

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "coreSummary": "핵심 요약 (3-5문장)",
  "bullishFactors": [
    {"factor": "요인명", "reasoning": "근거 설명", "confidence": 0.8}
  ],
  "bearishFactors": [
    {"factor": "요인명", "reasoning": "근거 설명", "confidence": 0.7}
  ],
  "overallAssessment": "bullish",
  "priceImpact": {
    "short": "단기 영향 분석",
    "medium": "중기 영향 분석",
    "long": "장기 영향 분석",
    "summary": "종합 분석"
  },
  "riskFactors": [
    {"factor": "리스크명", "severity": "high", "description": "설명"}
  ],
  "opportunityFactors": [
    {"factor": "기회명", "potential": "high", "description": "설명"}
  ],
  "newsBackground": "뉴스 배경 설명 (2-3문장)",
  "relatedStocks": [
    {"name": "종목명", "ticker": "000000", "impactType": "beneficiary", "reasoning": "관련 이유", "expectedImpact": "positive"}
  ],
  "timelineCatalysts": [
    {"event": "이벤트명", "expectedDate": "2025년 3월", "urgency": "near_term", "potentialImpact": "잠재적 영향 설명"}
  ],
  "keyTerms": [
    {"term": "용어", "definition": "쉬운 설명"}
  ],
  "investorChecklist": [
    {"item": "확인/모니터링 항목", "importance": "high"}
  ]
}`;

export function formatAnalysisReportPrompt(
  title: string,
  description: string,
  summary: string | null,
): string {
  return ANALYSIS_REPORT_PROMPT
    .replace('{title}', title)
    .replace('{description}', description)
    .replace('{summary}', summary || '(요약 없음)');
}
