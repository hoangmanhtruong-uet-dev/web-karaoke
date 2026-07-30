# Royal Karaoke - Luxury Karaoke Booking Platform

A Next.js-based booking platform for Royal Karaoke, featuring modern UI with a gold-themed luxury design system.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Available Pages](#available-pages)
- [API Endpoints](#api-endpoints)
- [Design System](#design-system)
- [Development](#development)
- [Deployment](#deployment)

## Features

### Core Features
- **Room Booking System** - Full-featured booking flow with customer info, branch selection, date/time, and menu options
- **Branch Management** - Display and manage multiple karaoke branches
- **Room Management** - Browse and view available rooms by tier (Standard, VIP, Premium, Presidential)
- **Menu Preview** - View food and beverage options with categories
- **Gallery** - Visual showcase of karaoke spaces
- **Promotions** - Display current deals and offers
- **Contact Form** - Lead capture with concierge assistance

### Technical Features
- TypeScript for type safety
- Next.js 16 App Router
- Route Handlers for validated data mutations and fetching
- Responsive design (mobile, tablet, desktop)
- Loading states with skeleton UI
- Empty state handling
- Success/error feedback patterns
- Form validation (client-side and server-side)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + custom CSS
- **TypeScript**: Full TypeScript implementation
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Database**: Prisma ORM (PostgreSQL)
- **Icons**: Lucide React

## Project Structure

```
next-app/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── sections/       # Page sections (Hero, FeaturedRooms, etc.)
├── data/               # Static data (branches, rooms, menu items)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── prisma/             # Prisma schema and seeds
├── public/             # Static assets
├── src/
│   ├── app/            # App Router pages
│   │   ├── api/        # API routes
│   │   └── [page]/     # Page routes
│   ├── types/          # TypeScript type definitions
│   └── components/     # Component imports
├── components.json     # shadcn/ui configuration
├── eslint.config.mjs   # ESLint configuration
├── next.config.ts      # Next.js configuration
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or bun
- PostgreSQL 16+ installed and running locally, or access to a PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd next-app
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database connection string
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database (optional, CLI only):
```bash
npx prisma db seed
```

6. Start the development server:
```bash
npm run dev
# or
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server with Turbopack |
| `build` | Build production application |
| `start` | Start production server |
| `lint` | Run ESLint |
| `typecheck` | Run TypeScript type checking |
| `test` | Run the Vitest suite |
| `prisma:seed` | Seed sample data through the CLI |
| `test:integration` | Run PostgreSQL integration scenarios (requires an isolated `TEST_DATABASE_URL`) |
| `job:expire-bookings` | Expire due pending booking holds once |
| `job:create-reminders` | Create due reminder outbox events once |
| `job:process-outbox` | Process one bounded outbox batch once |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DATABASE_SSL_CA_BASE64` / `DATABASE_SSL_CA_FILE` | Aiven/provider CA as base64 PEM or mounted secret file | Production |
| `DATABASE_SSL_ALLOW_UNVERIFIED` | Local/test escape hatch only; production rejects `true` | No |
| `TOTP_ENCRYPTION_KEY` | Base64-encoded 32-byte AES key for admin TOTP secrets | Production/admin 2FA |
| `RECOVERY_CODE_HASH_SECRET` | Independent pepper for one-time recovery-code hashes | Production/admin 2FA |
| `NEXT_PUBLIC_API_URL` | API base URL | No (defaults to relative) |
| `AUTH_SECRET` | Auth.js signing secret | Yes |
| `BOOKING_HOLD_MINUTES` | Pending hold duration | No (defaults to 15) |
| `BOOKING_REMINDER_MINUTES` | Reminder lead time | No (defaults to 120) |
| `JOB_BATCH_SIZE` | Maximum records per job invocation | No (defaults to 25) |
| `CRON_SECRET` | Bearer secret for internal job endpoints | Yes for HTTP cron |
| `EMAIL_PROVIDER` | `console` in development, `webhook` for delivery, or `disabled` to intentionally pause the outbox worker | Yes in production |
| `EMAIL_FROM` | Sender address | Yes for webhook notifications |
| `EMAIL_WEBHOOK_URL` | Notification provider endpoint | Yes for webhook notifications |
| `EMAIL_API_KEY` | Notification provider credential | Yes for webhook notifications |
| `ADMIN_NOTIFICATION_EMAIL` | Recipient of contact alerts | Yes for contact alerts |
| `ADMIN_SEED_EMAIL` | Initial admin email used only by CLI seed | Optional |
| `ADMIN_SEED_PASSWORD` | Initial admin password used only by CLI seed | Optional |

## Available Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with all sections |
| `/booking` | Room booking form |
| `/rooms` | All available rooms |
| `/branches` | Branch locations |
| `/menu` | Full menu list |
| `/gallery` | Gallery of spaces |
| `/promotions` | Current promotions |
| `/contact` | Contact form |
| `/admin/login` | Staff/admin sign in |
| `/admin` | Protected operations dashboard |
| `/admin/bookings` | Protected booking management |
| `/admin/contact-requests` | Protected contact management |
| `/admin/outbox` | Protected notification/dead-letter view |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/branches` | GET | Get active branches |
| `/api/rooms` | GET | Get available rooms |
| `/api/menu-items` | GET | Get available menu items |
| `/api/bookings` | POST | Submit booking request |
| `/api/contact` | POST | Persist a contact request |

## Production operations

Apply checked-in migrations from the `next-app` directory:

```bash
npx prisma migrate deploy
```

Create the first administrator by setting `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`
(minimum 12 characters), and optionally `ADMIN_SEED_NAME`, then run:

```bash
npm run prisma:seed
```

Run each job from a platform scheduler. The CLI commands are suitable for a worker
host. A serverless scheduler can instead `POST` to `/api/internal/jobs/expire-bookings`,
`/api/internal/jobs/create-reminders`, and `/api/internal/jobs/process-outbox` with
`Authorization: Bearer <CRON_SECRET>`. Job invocations are bounded and safe to overlap.

PostgreSQL integration tests must never target production. The runner requires an
explicit local `TEST_DATABASE_URL` and fails before Prisma when it is absent. Use the
dedicated Docker Compose service below; remote database targets are rejected.

### CI-first integration tests

Docker is optional. The authoritative integration run happens in GitHub Actions on PostgreSQL 16 with the isolated database `web_karaoke_ci_test`. The CI job guards the target, validates and generates Prisma, deploys all checked-in migrations, runs all four integration files, resets the same guarded CI database, reapplies migrations, and runs the suite a second time.

The CI suite includes the nine tests in `src/test/admin-branch-scope.integration.test.ts`, booking concurrency and exclusion, idempotency, availability, jobs/outbox, critical business scenarios, and migration verification. CI uses the verbose Vitest reporter so the branch-scope results are visible separately in the job log.

Local lint, typecheck, unit tests, and builds never invoke Docker:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

When a developer already has a local PostgreSQL test database, copy the example, adjust only the loopback credentials/port, and run:

```bash
cp .env.test.local.example .env.test.local
npm run test:integration:local
```

The local command checks reachability first and stops clearly when PostgreSQL is unavailable. It never starts Docker and never falls back to a remote target. `npm run test:integration` is the lower-level command for any already-running guarded test database. `npm run test:integration:ci` is suite-only and is reserved for CI after guard, validation, generation, and migration steps have succeeded.

Optional Docker Compose commands remain available for developers who want them:

```bash
npm run test:db:up
npm run test:db:wait
npm run test:db:reset
npm run test:db:down
```

The guard requires `NODE_ENV=test`, an explicit PostgreSQL `TEST_DATABASE_URL`, a database ending in `_test`, and localhost/127.0.0.1/IPv6 loopback. It rejects production mode, Aiven, Render, every other remote host, configured production host/port targets, and any target equal to `DATABASE_URL`. Integration Prisma commands do not load `.env`, and logs contain only normalized host, port, and database name.

The final CI metadata step checks the booking exclusion constraint, key Booking foreign keys, the availability index, and both PricingRule foreign keys. Missing PricingRule foreign keys are reported as DB-001 and fail the integration job after both suites run; this task does not modify the pricing migration.

### Branch protection

Configure a GitHub ruleset for `main` to require pull requests, block direct/force pushes, and require both workflow checks named `Lint, typecheck, unit tests, and build` and `PostgreSQL integration (two clean runs)`. Require the branch to be up to date before merging. Developers do not need Docker because the required integration check runs in GitHub Actions. This documentation does not claim those repository settings were changed.
## Design System

### Color Palette

| Color | Value | Usage |
|-------|-------|-------|
| Gold | `#d6b46a` | Primary accent |
| Gold Soft | `#f1dca3` | Secondary accent |
| Background | `#07080c` | Main background |
| Surface | `#10131b` | Card backgrounds |
| Foreground | `#f7f1e8` | Text color |
| Muted | `#a7a19a` | Muted text |

### Typography

- **Heading**: Playfair Display (font-heading)
- **Body**: Inter (font-sans)

### Components

- **Glass Panels**: Translucent backgrounds with blur effects
- **Luxury Cards**: Hover effects with gold borders
- **Gold Gradients**: Button and accent styling

## Development

### Adding New Components

1. Use `pnpm dlx shadcn@latest add [component]` to install shadcn/ui components
2. Follow the existing component structure in `components/sections/`
3. Use TypeScript interfaces for all props
4. Add proper accessibility attributes

### Responsive Design

The application uses mobile-first responsive design:

- **Mobile**: 375px - Base styles
- **Tablet**: 768px - sm: breakpoint
- **Desktop**: 1440px - lg: breakpoint

### State Management

- Client state: `useState` / `useReducer`
- Server state: React Query (if needed)
- Form state: Controlled inputs with validation

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## Known Limitations

- Booking confirmation requires manual phone call from concierge
- No payment processing integration yet
- Limited to 4 branch locations (configurable in data)

## Future Enhancements

- Payment gateway integration
- Customer dashboard
- Email notifications
- Calendar integration
- Real-time room availability
- Loyalty program

## License

MIT
