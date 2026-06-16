# Aivory Website (avry-website)

The marketing website and homepage for Aivory — AI-Powered Business Transformation platform.

Built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, and **TypeScript**.

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── about/              # Company/About page
│   ├── api/exchange-rate/  # USD→IDR exchange rate API
│   ├── blog/               # Blog listing & articles
│   ├── careers/            # Careers listing & detail
│   ├── contact/            # Contact form
│   ├── diagnostic/         # AI Readiness Diagnostic flow
│   ├── login/              # Authentication
│   ├── payment/            # Payment processing
│   ├── privacy/            # Privacy Policy
│   ├── product/            # Product showcase
│   └── terms/              # Terms of Service
├── components/
│   ├── auth/               # Login modal, auth UI
│   ├── blog/               # Blog components
│   ├── careers/            # Careers components
│   ├── diagnostic/         # Diagnostic results UI
│   ├── layout/             # Homepage sections, navbar, footer
│   ├── payment/            # Midtrans payment modal, history
│   └── ui/                 # Reusable UI primitives (Button, Card, Modal)
├── contexts/               # React contexts (Translation/Language)
├── hooks/                  # Custom hooks (useScrollAnimation)
├── lib/                    # Business logic, API clients, utilities
│   ├── auth.ts             # Supabase auth integration
│   ├── config.ts           # URL resolution (dashboard, marketing)
│   ├── payment.ts          # Midtrans Snap SDK integration
│   ├── pricing.ts          # Product catalog (single source of truth)
│   ├── services.ts         # Microservice URL configuration
│   └── translations.ts     # i18n (EN/ID)
├── styles/                 # Additional CSS
└── types/                  # TypeScript type definitions
```

## Features

- **Multi-language support** — English/Indonesian with live IDR currency conversion
- **Midtrans payment integration** — Snap SDK for Indonesian payment gateway
- **Supabase authentication** — Login/signup with JWT tokens
- **AI Readiness Diagnostic** — Interactive questionnaire with scoring
- **Responsive design** — Mobile-first with Tailwind CSS v4
- **SEO optimized** — OpenGraph, Twitter cards, structured metadata
- **Scroll animations** — IntersectionObserver-based reveal effects

## Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Midtrans
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your-client-key
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false

# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081

# Dashboard URLs (optional)
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:9002
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server (port 9000)
npm run dev

# Run tests
npm run test

# Lint
npm run lint

# Build for production
npm run build
```

The dev server runs at `http://localhost:9000`.

## Docker

### Build & Run

```bash
# Build the image
docker build -t avry-website .

# Run the container
docker run -p 9000:3000 --env-file .env.local avry-website
```

### Docker Compose

```bash
docker compose up -d
```

### Production Build

The Dockerfile uses multi-stage build with Next.js standalone output:

```dockerfile
# Stage 1: Install dependencies
# Stage 2: Build the application
# Stage 3: Production runner (minimal image)
```

## VPS Deployment

1. Clone the repo on your VPS:
   ```bash
   git clone https://github.com/ClementHansel/avry-website.git
   cd avry-website
   ```

2. Create `.env.local` with production values.

3. Build and start with Docker:
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

4. The app runs on port 9000. Configure your reverse proxy (Nginx/Traefik) to route to it.

## Related Services

| Service | Repository | Port |
|---------|-----------|------|
| Backend API | [avry-backend](https://github.com/ClementHansel/avry-backend) | 8081 |
| User Dashboard | [avry-user-dashboard](https://github.com/ClementHansel/avry-user-dashboard) | 9001 |
| Admin Dashboard | [avry-admin-dashboards](https://github.com/ClementHansel/avry-admin-dashboards) | 9002 |
| Payments | [avry-payments](https://github.com/ClementHansel/avry-payments) | 8085 |
| Diagnostics | [avry-diagnostics](https://github.com/ClementHansel/avry-diagnostics) | 8082 |
| All Services | [aivory](https://github.com/ClementHansel/aivory) | — |

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

## License

Proprietary — Aivory © 2026. All rights reserved.
