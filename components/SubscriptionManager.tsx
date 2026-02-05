'use client';

import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  ticker: string;
  created_at: string;
}

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      const response = await fetch('/api/subscriptions');
      const data = await response.json();

      if (response.ok) {
        setSubscriptions(data.subscriptions);
      } else {
        setError(data.error || 'Failed to load subscriptions');
      }
    } catch (err) {
      setError('Failed to load subscriptions');
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Subscription added successfully');
        setTicker('');
        await loadSubscriptions();
      } else {
        setError(data.error || data.message || 'Failed to subscribe');
      }
    } catch (err) {
      setError('Failed to subscribe');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe(id: string) {
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Subscription removed');
        await loadSubscriptions();
      } else {
        setError(data.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      setError('Failed to unsubscribe');
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">구독 관리</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {message && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">{message}</div>
      )}

      <form onSubmit={handleSubscribe} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="종목 코드 입력 (6자리 숫자)"
            className="flex-1 px-4 py-2 border rounded"
            pattern="\d{6}"
            maxLength={6}
            required
          />
          <button
            type="submit"
            disabled={loading || subscriptions.length >= 5}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '추가 중...' : '구독 추가'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {subscriptions.length}/5 종목 구독 중
        </p>
      </form>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-4">구독 중인 종목</h3>
        {subscriptions.length === 0 ? (
          <p className="text-gray-500">구독 중인 종목이 없습니다.</p>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex justify-between items-center p-4 border rounded hover:bg-gray-50"
            >
              <div>
                <span className="font-mono font-bold">{sub.ticker}</span>
                <span className="ml-4 text-sm text-gray-500">
                  {new Date(sub.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <button
                onClick={() => handleUnsubscribe(sub.id)}
                className="px-4 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
