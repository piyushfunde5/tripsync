# TripSync

## Project
Group travel planning web app. Mobile-first (640px max-width). Next.js App Router + TypeScript + Tailwind CSS + Supabase + Prisma + Resend.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prisma generate` — regenerate Prisma client
- `npx prisma db push` — push schema to Supabase

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/components/ui/` — reusable design system components
- `src/components/trip/` — trip-specific feature components
- `src/components/layout/` — shell, nav, containers
- `src/lib/` — Supabase client, utils, helpers
- `src/hooks/` — custom React hooks
- `src/types/` — TypeScript type definitions
- `prisma/schema.prisma` — database schema

## Conventions
- Path alias: `@/*` maps to `./src/*`
- Colors: Blue-600 primary, Green-600 success, Amber-500 warning, Red-600 danger
- Font: Inter (Google Fonts)
- Max container width: 640px centered
- All API routes under `src/app/api/`
- Supabase Auth with Google OAuth for all users
- Every trip has a unique slug for shareable URLs: `/t/[slug]`
