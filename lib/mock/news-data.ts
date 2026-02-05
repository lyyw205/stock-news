/**
 * Mock news data for development and demo purposes
 */

export interface MockNewsScores {
  visual: {
    impact: number;
    urgency: number;
    certainty: number;
    durability: number;
    attention: number;
    relevance: number;
  };
  sentiment: number;
  totalScore: number;
}

export interface MockNewsArticle {
  id: string;
  ticker: string;
  title: string;
  summary: string;
  url: string;
  pubDate: string;
  confidence: number;
  createdAt: string;
  scores: MockNewsScores;
}

// 샘플 뉴스 데이터 (최근 날짜로 생성)
const now = new Date();
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const MOCK_NEWS: MockNewsArticle[] = [
  // 삼성전자 (005930)
  {
    id: 'mock-1',
    ticker: '005930',
    title: '삼성전자, 4분기 영업이익 6.5조원 기록...반도체 부문 회복세',
    summary:
      '삼성전자가 2024년 4분기 영업이익 6.5조원을 기록했다고 발표했다. 메모리 반도체 가격 상승과 AI 칩 수요 증가로 반도체 부문이 흑자 전환했으며, 모바일과 가전 부문도 견조한 실적을 보였다.',
    url: 'https://example.com/news/samsung-q4-2024',
    pubDate: hoursAgo(2),
    confidence: 0.95,
    createdAt: hoursAgo(2),
    scores: {
      visual: { impact: 9, urgency: 8, certainty: 10, durability: 7, attention: 9, relevance: 8 },
      sentiment: 2,
      totalScore: 85,
    },
  },
  {
    id: 'mock-2',
    ticker: '005930',
    title: '삼성전자, HBM3E 양산 본격화...엔비디아 납품 확대',
    summary:
      '삼성전자가 차세대 고대역폭 메모리 HBM3E의 양산을 본격화한다. 엔비디아의 AI 가속기에 탑재될 예정이며, SK하이닉스와의 격차를 좁히는 계기가 될 전망이다.',
    url: 'https://example.com/news/samsung-hbm3e',
    pubDate: hoursAgo(5),
    confidence: 0.92,
    createdAt: hoursAgo(5),
    scores: {
      visual: { impact: 8, urgency: 7, certainty: 8, durability: 8, attention: 9, relevance: 10 },
      sentiment: 1,
      totalScore: 78,
    },
  },
  {
    id: 'mock-3',
    ticker: '005930',
    title: '삼성전자, 갤럭시 S25 시리즈 예약 판매 시작...AI 기능 대폭 강화',
    summary:
      '삼성전자가 갤럭시 S25 시리즈의 예약 판매를 시작했다. 온디바이스 AI 기능이 대폭 강화되었으며, 배터리 효율과 카메라 성능이 개선되었다. 출시 초기 예약 물량이 전작 대비 30% 증가했다.',
    url: 'https://example.com/news/galaxy-s25',
    pubDate: hoursAgo(8),
    confidence: 0.88,
    createdAt: hoursAgo(8),
    scores: {
      visual: { impact: 6, urgency: 6, certainty: 9, durability: 5, attention: 8, relevance: 7 },
      sentiment: 1,
      totalScore: 62,
    },
  },

  // SK하이닉스 (000660)
  {
    id: 'mock-4',
    ticker: '000660',
    title: 'SK하이닉스, 사상 최대 분기 실적 전망...HBM 효자 노릇',
    summary:
      'SK하이닉스가 1분기 사상 최대 실적을 낼 것으로 전망된다. HBM3 제품 공급 부족으로 프리미엄 가격이 형성되었고, AI 서버용 수요가 폭발적으로 증가하고 있다.',
    url: 'https://example.com/news/skhynix-record',
    pubDate: hoursAgo(3),
    confidence: 0.94,
    createdAt: hoursAgo(3),
    scores: {
      visual: { impact: 9, urgency: 9, certainty: 7, durability: 8, attention: 10, relevance: 10 },
      sentiment: 2,
      totalScore: 88,
    },
  },
  {
    id: 'mock-5',
    ticker: '000660',
    title: 'SK하이닉스, 용인 반도체 클러스터에 120조원 투자 계획 발표',
    summary:
      'SK하이닉스가 용인 반도체 클러스터 구축에 120조원을 투자한다고 밝혔다. AI 반도체 생산 능력을 대폭 확대하고 차세대 HBM4 양산 체제를 구축할 예정이다.',
    url: 'https://example.com/news/skhynix-investment',
    pubDate: hoursAgo(12),
    confidence: 0.91,
    createdAt: hoursAgo(12),
    scores: {
      visual: { impact: 10, urgency: 4, certainty: 9, durability: 10, attention: 8, relevance: 9 },
      sentiment: 1,
      totalScore: 75,
    },
  },

  // 네이버 (035420)
  {
    id: 'mock-6',
    ticker: '035420',
    title: '네이버, AI 검색 하이퍼클로바X 기반 서비스 확대',
    summary:
      '네이버가 자체 개발한 거대언어모델 하이퍼클로바X를 기반으로 AI 검색 서비스를 전면 개편한다. 기존 키워드 검색에서 대화형 AI 검색으로 전환하며, 쇼핑과 콘텐츠 추천 정확도가 크게 향상되었다.',
    url: 'https://example.com/news/naver-ai-search',
    pubDate: hoursAgo(4),
    confidence: 0.89,
    createdAt: hoursAgo(4),
    scores: {
      visual: { impact: 7, urgency: 6, certainty: 8, durability: 7, attention: 7, relevance: 9 },
      sentiment: 1,
      totalScore: 68,
    },
  },
  {
    id: 'mock-7',
    ticker: '035420',
    title: '네이버, 일본 라인야후와 AI 사업 협력 강화',
    summary:
      '네이버가 일본 라인야후와 AI 기술 협력을 강화한다. 양사는 AI 광고 플랫폼과 커머스 추천 시스템을 공동 개발하며, 아시아 지역 AI 시장 선점을 위한 전략적 제휴를 확대할 방침이다.',
    url: 'https://example.com/news/naver-line-ai',
    pubDate: hoursAgo(15),
    confidence: 0.86,
    createdAt: hoursAgo(15),
    scores: {
      visual: { impact: 6, urgency: 4, certainty: 7, durability: 6, attention: 5, relevance: 6 },
      sentiment: 0,
      totalScore: 52,
    },
  },

  // 카카오 (035720)
  {
    id: 'mock-8',
    ticker: '035720',
    title: '카카오, 카카오톡 채널 기반 AI 챗봇 서비스 출시',
    summary:
      '카카오가 카카오톡 채널에 AI 챗봇 서비스를 출시했다. 중소상공인과 크리에이터가 손쉽게 AI 고객 응대 시스템을 구축할 수 있으며, 월 구독료는 5만원부터 시작한다.',
    url: 'https://example.com/news/kakao-ai-chatbot',
    pubDate: hoursAgo(6),
    confidence: 0.87,
    createdAt: hoursAgo(6),
    scores: {
      visual: { impact: 5, urgency: 5, certainty: 9, durability: 6, attention: 6, relevance: 7 },
      sentiment: 1,
      totalScore: 55,
    },
  },
  {
    id: 'mock-9',
    ticker: '035720',
    title: '카카오페이, 금융 AI 서비스 본격화...투자 자문 기능 추가',
    summary:
      '카카오페이가 AI 기반 금융 서비스를 본격화한다. 개인 맞춤형 투자 자문과 소비 패턴 분석 서비스를 제공하며, 향후 자동화된 자산 배분 기능도 추가할 계획이다.',
    url: 'https://example.com/news/kakaopay-ai',
    pubDate: hoursAgo(18),
    confidence: 0.84,
    createdAt: hoursAgo(18),
    scores: {
      visual: { impact: 5, urgency: 4, certainty: 6, durability: 5, attention: 5, relevance: 6 },
      sentiment: 0,
      totalScore: 45,
    },
  },

  // 현대차 (005380)
  {
    id: 'mock-10',
    ticker: '005380',
    title: '현대차, 전기차 아이오닉 7 공개...항속거리 600km 달성',
    summary:
      '현대차가 대형 전기 SUV 아이오닉 7을 공개했다. 1회 충전 항속거리가 600km에 달하며, 초고속 충전 시 18분 만에 80% 충전이 가능하다. 하반기 출시 예정이며 가격은 7천만원대로 책정될 전망이다.',
    url: 'https://example.com/news/hyundai-ioniq7',
    pubDate: hoursAgo(7),
    confidence: 0.93,
    createdAt: hoursAgo(7),
    scores: {
      visual: { impact: 8, urgency: 5, certainty: 9, durability: 7, attention: 8, relevance: 8 },
      sentiment: 1,
      totalScore: 72,
    },
  },
  {
    id: 'mock-11',
    ticker: '005380',
    title: '현대차, 미국 전기차 공장 증설...IRA 보조금 최대 수혜',
    summary:
      '현대차가 미국 조지아주 전기차 공장을 증설한다. 연간 생산능력을 50만대에서 80만대로 확대하며, 미국 인플레이션 감축법(IRA) 보조금을 최대한 활용할 방침이다.',
    url: 'https://example.com/news/hyundai-us-plant',
    pubDate: hoursAgo(20),
    confidence: 0.90,
    createdAt: hoursAgo(20),
    scores: {
      visual: { impact: 7, urgency: 3, certainty: 8, durability: 8, attention: 6, relevance: 7 },
      sentiment: 1,
      totalScore: 65,
    },
  },

  // LG에너지솔루션 (373220)
  {
    id: 'mock-12',
    ticker: '373220',
    title: 'LG에너지솔루션, 전고체 배터리 파일럿 라인 구축 완료',
    summary:
      'LG에너지솔루션이 전고체 배터리 파일럿 생산 라인 구축을 완료했다. 2026년 소량 생산을 시작하고 2028년 양산 체제에 돌입할 계획이며, 기존 리튬이온 배터리 대비 에너지 밀도가 40% 향상되었다.',
    url: 'https://example.com/news/lg-solid-state',
    pubDate: hoursAgo(10),
    confidence: 0.92,
    createdAt: hoursAgo(10),
    scores: {
      visual: { impact: 8, urgency: 3, certainty: 8, durability: 9, attention: 7, relevance: 8 },
      sentiment: 1,
      totalScore: 70,
    },
  },
  {
    id: 'mock-13',
    ticker: '373220',
    title: 'LG에너지솔루션, 테슬라와 4680 배터리 공급 계약 체결',
    summary:
      'LG에너지솔루션이 테슬라와 4680 원통형 배터리 공급 계약을 체결했다. 2025년부터 연간 50GWh 규모를 공급하며, 테슬라 사이버트럭과 모델 Y에 탑재될 예정이다.',
    url: 'https://example.com/news/lg-tesla-4680',
    pubDate: hoursAgo(24),
    confidence: 0.89,
    createdAt: hoursAgo(24),
    scores: {
      visual: { impact: 9, urgency: 6, certainty: 9, durability: 8, attention: 9, relevance: 9 },
      sentiment: 2,
      totalScore: 82,
    },
  },

  // 셀트리온 (068270)
  {
    id: 'mock-14',
    ticker: '068270',
    title: '셀트리온, 바이오시밀러 신약 FDA 승인...북미 시장 본격 공략',
    summary:
      '셀트리온의 바이오시밀러 신약이 미국 FDA 승인을 받았다. 연간 5조원 규모의 북미 시장에 진출하며, 기존 오리지널 의약품 대비 30% 저렴한 가격으로 경쟁력을 확보했다.',
    url: 'https://example.com/news/celltrion-fda',
    pubDate: hoursAgo(9),
    confidence: 0.91,
    createdAt: hoursAgo(9),
    scores: {
      visual: { impact: 9, urgency: 8, certainty: 10, durability: 8, attention: 8, relevance: 7 },
      sentiment: 2,
      totalScore: 83,
    },
  },

  // 포스코홀딩스 (005490)
  {
    id: 'mock-15',
    ticker: '005490',
    title: '포스코, 리튬 생산 본격화...연간 4만톤 체제 구축',
    summary:
      '포스코홀딩스가 아르헨티나 리튬 염호에서 본격적인 생산을 시작한다. 연간 4만톤 규모의 수산화리튬을 생산하며, 국내 배터리 업체에 안정적으로 공급할 계획이다.',
    url: 'https://example.com/news/posco-lithium',
    pubDate: hoursAgo(14),
    confidence: 0.88,
    createdAt: hoursAgo(14),
    scores: {
      visual: { impact: 7, urgency: 5, certainty: 8, durability: 8, attention: 6, relevance: 8 },
      sentiment: 1,
      totalScore: 67,
    },
  },
];

/**
 * Get mock news with pagination
 */
export function getMockNews(options: {
  page?: number;
  limit?: number;
  ticker?: string;
}): {
  news: MockNewsArticle[];
  total: number;
  hasMore: boolean;
} {
  const { page = 1, limit = 20, ticker } = options;

  // Filter by ticker if specified
  let filtered = ticker
    ? MOCK_NEWS.filter((n) => n.ticker === ticker)
    : MOCK_NEWS;

  // Sort by date (newest first)
  filtered = filtered.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  const total = filtered.length;
  const from = (page - 1) * limit;
  const to = from + limit;

  const news = filtered.slice(from, to);
  const hasMore = to < total;

  return { news, total, hasMore };
}

/**
 * Get list of mock tickers (simulating user subscriptions)
 */
export const MOCK_TICKERS = [
  '005930', // 삼성전자
  '000660', // SK하이닉스
  '035420', // 네이버
  '035720', // 카카오
  '005380', // 현대차
  '373220', // LG에너지솔루션
  '068270', // 셀트리온
  '005490', // 포스코홀딩스
];
