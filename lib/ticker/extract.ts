import type { NewsCategory } from '@/lib/rss/fetcher';

// 코인 심볼 → 표준 티커 매핑
const CRYPTO_KOREAN_NAMES: Record<string, string> = {
  비트코인: 'BTC',
  이더리움: 'ETH',
  리플: 'XRP',
  솔라나: 'SOL',
  에이다: 'ADA',
  도지코인: 'DOGE',
  도지: 'DOGE',
  아발란체: 'AVAX',
  폴카닷: 'DOT',
  폴리곤: 'MATIC',
  체인링크: 'LINK',
  유니스왑: 'UNI',
  코스모스: 'ATOM',
  라이트코인: 'LTC',
  스텔라: 'XLM',
  카르다노: 'ADA',
  트론: 'TRX',
  시바이누: 'SHIB',
  수이: 'SUI',
  앱토스: 'APT',
  아비트럼: 'ARB',
  옵티미즘: 'OP',
  톤코인: 'TON',
  니어: 'NEAR',
  헤데라: 'HBAR',
};

// 알려진 코인 심볼 목록 (대문자 2-5자)
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'XLM', 'TRX', 'SHIB', 'SUI', 'APT',
  'ARB', 'OP', 'TON', 'NEAR', 'HBAR', 'FIL', 'ICP', 'AAVE', 'MKR',
  'CRV', 'SNX', 'COMP', 'SAND', 'MANA', 'AXS', 'FTM', 'ALGO', 'EGLD',
  'THETA', 'VET', 'KLAY', 'EOS', 'XTZ', 'FLOW', 'GALA', 'ENJ', 'IMX',
  'RUNE', 'INJ', 'SEI', 'TIA', 'JUP', 'PYTH', 'WLD', 'STRK', 'PEPE',
  'BONK', 'WIF', 'RENDER', 'TAO', 'FET', 'ONDO', 'PENDLE',
]);

/**
 * 코인 티커 추출 (crypto 카테고리 전용)
 */
function extractCryptoTicker(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // 1. 한국어 코인 이름 매칭
  for (const [koreanName, symbol] of Object.entries(CRYPTO_KOREAN_NAMES)) {
    if (text.includes(koreanName)) {
      return symbol;
    }
  }

  // 2. 영어 심볼 매칭 ($BTC, BTC 등)
  const symbolPattern = /\$?([A-Z]{2,5})\b/g;
  let match;
  while ((match = symbolPattern.exec(text)) !== null) {
    const symbol = match[1];
    if (CRYPTO_SYMBOLS.has(symbol)) {
      return symbol;
    }
  }

  // 3. 소문자에서도 검색 (bitcoin, ethereum 등)
  const textLower = text.toLowerCase();
  if (textLower.includes('bitcoin')) return 'BTC';
  if (textLower.includes('ethereum') || textLower.includes('ether')) return 'ETH';
  if (textLower.includes('ripple')) return 'XRP';
  if (textLower.includes('solana')) return 'SOL';
  if (textLower.includes('dogecoin')) return 'DOGE';
  if (textLower.includes('cardano')) return 'ADA';

  return null;
}

/**
 * 주식 티커 추출 (stock 카테고리 전용)
 */
function extractStockTicker(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Pattern 1: 종목명(XXXXXX) format
  const parenthesesPattern = /\((\d{6})\)/;
  const parenthesesMatch = text.match(parenthesesPattern);
  if (parenthesesMatch) {
    return parenthesesMatch[1];
  }

  // Pattern 2: 종목코드: XXXXXX format
  const colonPattern = /종목코드:\s*(\d{6})/;
  const colonMatch = text.match(colonPattern);
  if (colonMatch) {
    return colonMatch[1];
  }

  // Pattern 3: [종목] XXXXXX format
  const bracketPattern = /\[종목\]\s*(\d{6})/;
  const bracketMatch = text.match(bracketPattern);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // Pattern 4: Standalone 6-digit number (but not part of larger numbers)
  const standalonePattern = /(?:^|[^\d])(\d{6})(?:[^\d]|$)/;
  const standaloneMatch = text.match(standalonePattern);
  if (standaloneMatch) {
    return standaloneMatch[1];
  }

  return null;
}

/**
 * 티커 추출 (카테고리 기반 라우팅)
 * - stock: 6자리 한국 주식 코드
 * - crypto: 코인 심볼 (BTC, ETH 등)
 */
export function extractTicker(text: string, category?: NewsCategory): string | null {
  if (category === 'crypto') {
    return extractCryptoTicker(text);
  }
  return extractStockTicker(text);
}
