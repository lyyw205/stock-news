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

export function formatFilterPrompt(title: string, description: string): string {
  return FILTER_PROMPT.replace('{title}', title).replace('{description}', description);
}

export function formatSummarizePrompt(title: string, description: string): string {
  return SUMMARIZE_PROMPT.replace('{title}', title).replace(
    '{description}',
    description,
  );
}
