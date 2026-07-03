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
- Server Actions for data mutations
- API routes for data fetching
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
- PostgreSQL database

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

5. Seed the database (optional):
```bash
npx prisma db seed
# or
curl http://localhost:3000/api/seed
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
| `type-check` | Run TypeScript type checking |
| `prisma:generate` | Generate Prisma client |
| `prisma:migrate` | Run database migrations |
| `prisma:studio` | Open Prisma Studio |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_API_URL` | API base URL | No (defaults to relative) |

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/branches` | GET | Get active branches |
| `/api/rooms` | GET | Get available rooms |
| `/api/menu-items` | GET | Get available menu items |
| `/api/bookings` | POST | Submit booking request |
| `/api/seed` | POST | Seed database with sample data |

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