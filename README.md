# Korean Stock News Service (주식 뉴스 요약 서비스)

AI-powered Korean stock news aggregation and summarization service.

## Features

- 📰 Automatic RSS news fetching every 5 minutes
- 🤖 AI-powered news filtering and summarization
- 🔔 Real-time email and push notifications
- 📊 Clean dashboard with summarized news
- 🎯 Subscribe to up to 5 stock tickers

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini Flash 2.0
- **Email**: Resend
- **Push Notifications**: Firebase Cloud Messaging
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Google Gemini API key
- Resend API key (for email)
- Firebase project (for push notifications)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd korean-stock-news
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
cp .env.example .env.local
```

4. Set up Supabase:
- Create a new Supabase project
- Run the migration in `supabase/migrations/001_initial_schema.sql`
- Copy your Supabase URL and keys to `.env.local`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Run specific test file:
```bash
npm test -- tests/unit/rss/parser.test.ts
```

## Project Structure

```
korean-stock-news/
├── app/                      # Next.js app directory
│   ├── api/
│   │   ├── cron/            # Cron job endpoints
│   │   └── ...
│   └── ...
├── lib/                      # Core business logic
│   ├── rss/                 # RSS fetching and parsing
│   ├── ai/                  # AI filtering and summarization
│   ├── ticker/              # Ticker extraction
│   ├── notifications/       # Email and push notifications
│   └── utils/               # Utility functions
├── components/               # React components
├── tests/                    # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── supabase/
│   └── migrations/          # Database migrations
└── ...
```

## Development Phases

- [x] Phase 1: Data Pipeline Foundation (RSS fetching)
- [ ] Phase 2: AI Integration (filtering and summarization)
- [ ] Phase 3: User Auth & Subscriptions
- [ ] Phase 4: Notification System
- [ ] Phase 5: Dashboard UI

## License

MIT
