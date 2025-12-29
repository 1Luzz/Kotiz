# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Caisse Noire** is a mobile app for managing team fines (penalty pot). Built with React Native/Expo frontend and a self-hosted Fastify + PostgreSQL backend. The app is primarily in French.

## Development Commands

### Backend (server/)

```bash
cd server

npm run dev          # Start with hot-reload (tsx watch)
npm run build        # Compile TypeScript
npm start            # Production start
npx prisma studio    # Database GUI
npx prisma migrate dev --name migration_name  # Create migration
```

### Frontend (app/)

```bash
cd app

npm start           # or: npx expo start
npm run ios         # iOS simulator
npm run android     # Android emulator
npm run web         # Web browser
npm run lint        # ESLint
npm run typecheck   # TypeScript checking
```

## Architecture

### Backend (server/)

**Fastify API** with Prisma ORM:
- `src/routes/` - API routes (auth, teams, fines, disputes, notifications, etc.)
- `src/services/` - Business logic
- `src/middleware/` - Authentication (JWT) and authorization
- `src/config/` - Environment config
- `src/utils/` - Utilities (token, serializer)
- `prisma/schema.prisma` - Database schema

**Key Services**:
- `auth.service.ts` - Registration, login, JWT tokens
- `team.service.ts` - Team CRUD, members, stats, leaderboard
- `fine.service.ts` - Rules, fines, payments
- `dispute.service.ts` - Fine disputes and voting
- `notification.service.ts` - User notifications

### Frontend (app/)

**Expo Router** file-based routing in `app/app/`:
- `_layout.tsx` - Root layout with providers
- `(auth)/` - Auth screens (login, register)
- `(tabs)/` - Tab navigation (home, activity, profile)
- `team/[id].tsx` - Team detail page
- Modal screens: `add-fine.tsx`, `create-team.tsx`, etc.

**State Management**:
- **Zustand** stores in `src/lib/store.ts`: `useAuthStore`, `useTeamStore`, `useUIStore`
- **TanStack Query** for server state in `src/lib/queryClient.ts`

**Data Layer**:
- API client at `src/lib/api.ts` with JWT token management
- Custom hooks in `src/hooks/`: `useAuth`, `useTeams`, `useFines`, `useActivity`
- TypeScript types in `src/types/database.ts`

**Path Aliases** (tsconfig.json):
- `@/*` -> `src/*`
- `@components/*`, `@hooks/*`, `@lib/*`, `@types/*`, `@constants/*`

## Database Schema (Prisma)

**Main Tables**:
- `users` - User accounts with hashed passwords
- `teams` - Teams with settings
- `team_members` - Team membership with roles
- `fine_rules` - Predefined fine rules
- `fines` - Issued fines
- `payments` - Payment records
- `activity_log` - Activity history
- `fine_disputes` - Dispute records
- `notifications` - User notifications

**Enums**: `TeamRole`, `FineStatus`, `FineCategory`, `DisputeStatus`, `ActivityType`

## Environment Setup

### Backend (server/.env)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/caisse_noire"
JWT_ACCESS_SECRET="your-secret-min-32-chars"
JWT_REFRESH_SECRET="your-secret-min-32-chars"
PORT=3000
NODE_ENV=development
```

### Frontend (app/.env)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Key Patterns

- API responses use camelCase, frontend types use snake_case - transformation in hooks
- Prisma Decimal fields serialized via `serializeDecimal()` utility
- JWT access tokens expire in 15min, refresh tokens in 7 days
- All protected routes use `authenticate` middleware
- Team routes use `requireTeamMember()` or `requireTeamAdmin()` middleware
- All DB mutations use TanStack Query's `useMutation` with cache invalidation

## API Routes Summary

| Prefix | Description |
|--------|-------------|
| `/auth` | Authentication (register, login, logout, refresh) |
| `/users` | User profile management |
| `/teams` | Team CRUD and membership |
| `/teams/:id/rules` | Fine rules |
| `/teams/:id/fines` | Fines |
| `/teams/:id/members/:userId/payments` | Payments |
| `/disputes` | Fine disputes |
| `/notifications` | User notifications |
| `/teams/:id/expenses` | Team expenses |
