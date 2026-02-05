import { POST, GET } from '@/app/api/subscriptions/route';
import { DELETE } from '@/app/api/subscriptions/[id]/route';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

describe('Subscriptions API', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/subscriptions', () => {
    it('should create a new subscription', async () => {
      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: '005930',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('should reject duplicate subscription', async () => {
      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          ticker: '005930',
        }),
      });

      // First subscription should succeed
      await POST(request);

      // Second subscription should fail
      const response2 = await POST(request);
      const data2 = await response2.json();

      expect(data2.error).toContain('already_subscribed');
    });

    it('should reject 6th subscription (limit exceeded)', async () => {
      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          ticker: '123456',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toContain('limit_exceeded');
    });

    it('should validate ticker format', async () => {
      const request = new NextRequest('http://localhost/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          ticker: 'invalid',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/subscriptions', () => {
    it('should return user subscriptions', async () => {
      const request = new NextRequest('http://localhost/api/subscriptions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('subscriptions');
      expect(Array.isArray(data.subscriptions)).toBe(true);
    });
  });

  describe('DELETE /api/subscriptions/:id', () => {
    it('should delete a subscription', async () => {
      const subscriptionId = 'test-subscription-id';
      const request = new NextRequest(
        `http://localhost/api/subscriptions/${subscriptionId}`,
        {
          method: 'DELETE',
        },
      );

      const response = await DELETE(request, { params: { id: subscriptionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });
  });
});
