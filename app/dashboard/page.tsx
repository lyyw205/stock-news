import NewsFeed from '@/components/NewsFeed';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 주식 뉴스 대시보드</h1>
              <p className="text-gray-600 mt-1">구독한 종목의 최신 뉴스를 확인하세요</p>
            </div>
            <nav className="flex gap-3">
              <a
                href="/subscriptions"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                구독 관리
              </a>
              <a
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                대시보드
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <NewsFeed />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>주식 뉴스 요약 서비스 · AI 기반 뉴스 필터링 및 요약</p>
        </div>
      </footer>
    </div>
  );
}
