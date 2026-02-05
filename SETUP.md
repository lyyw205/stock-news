# Setup Guide

## Phase 1: Data Pipeline Foundation ✅

### What's Implemented

- ✅ RSS feed parsing from multiple Korean news sources
- ✅ Automatic ticker extraction (supports multiple formats)
- ✅ URL deduplication using SHA-256 hashing
- ✅ PostgreSQL database schema (Supabase)
- ✅ Cron job for periodic RSS fetching (every 5 minutes)
- ✅ Comprehensive test suite (25 tests, 92%+ coverage on core modules)

### Setup Steps

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Set Up Supabase

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Go to SQL Editor and run the migration:
   - Open `supabase/migrations/001_initial_schema.sql`
   - Copy and paste the SQL into Supabase SQL Editor
   - Click "Run"

4. Get your credentials:
   - Go to Project Settings > API
   - Copy the Project URL and anon/public key
   - Go to Project Settings > Database
   - Copy the service_role key (keep this secret!)

#### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=generate-a-random-string
```

#### 4. Test the Setup

Run all tests:
```bash
npm test
```

Build the project:
```bash
npm run build
```

Start development server:
```bash
npm run dev
```

#### 5. Test RSS Fetching Manually

Open your browser to:
```
http://localhost:3000/api/cron/fetch-rss
```

Or use curl with the cron secret:
```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/fetch-rss
```

Check your Supabase dashboard to verify articles were inserted into `news_articles` table.

### Database Tables Created

- `users` - User accounts (extends Supabase auth)
- `news_articles` - Fetched news articles with tickers
- `subscriptions` - User stock subscriptions
- `summaries` - AI-generated summaries (Phase 2)
- `notification_log` - Notification history (Phase 4)

### RSS Sources Configured

1. Naver Finance - 증권
2. Naver Finance - 종목
3. Hankyung - 증권
4. Daum Finance

### Quality Gates Status

✅ All tests passing (25/25)
✅ Build successful
✅ No linting errors
✅ No type errors
✅ Core modules 92%+ coverage

### Next Steps

Phase 2 will implement:
- Google Gemini AI integration
- News filtering (useful vs not useful)
- Korean summarization (2-3 sentences)
- Automatic processing pipeline

---

## Troubleshooting

### Tests Failing

Make sure dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

Check TypeScript configuration:
```bash
npm run type-check
```

### RSS Fetching Not Working

1. Check environment variables are set correctly
2. Verify Supabase credentials
3. Check network connectivity
4. Look at console logs for specific errors

### Database Connection Issues

1. Verify Supabase URL and keys in `.env.local`
2. Check if database migration was run successfully
3. Verify Row Level Security policies in Supabase dashboard
