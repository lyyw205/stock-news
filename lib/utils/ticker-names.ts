/**
 * 종목 코드 → 회사명 매핑
 */

export const TICKER_NAMES: Record<string, string> = {
  // 전자/반도체
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '051910': 'LG화학',
  '006400': '삼성SDI',
  '000270': '기아',

  // IT/인터넷
  '035420': '네이버',
  '035720': '카카오',
  '376300': '카카오페이',
  '352820': '카카오게임즈',
  '018260': '삼성에스디에스',

  // 자동차
  '005380': '현대차',
  '012330': '현대모비스',

  // 배터리/에너지
  '373220': 'LG에너지솔루션',
  '096770': 'SK이노베이션',

  // 바이오/제약
  '068270': '셀트리온',
  '207940': '삼성바이오로직스',
  '326030': 'SK바이오팜',

  // 철강/화학
  '005490': '포스코홀딩스',

  // 금융
  '055550': '신한지주',
  '105560': 'KB금융',
  '086790': '하나금융지주',

  // 기타
  '017670': 'SK텔레콤',
  '030200': 'KT',
  '032640': 'LG유플러스',
};

/**
 * 티커 코드로 회사명 가져오기
 * @param ticker 종목 코드
 * @returns 회사명 (매핑 없으면 티커 코드 그대로 반환)
 */
export function getCompanyName(ticker: string): string {
  return TICKER_NAMES[ticker] || ticker;
}

/**
 * 회사명으로 티커 코드 찾기
 * @param name 회사명
 * @returns 티커 코드 (없으면 undefined)
 */
export function getTickerByName(name: string): string | undefined {
  const entry = Object.entries(TICKER_NAMES).find(([, n]) => n === name);
  return entry?.[0];
}
