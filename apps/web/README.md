# FlipFeeds Web Application

Next.js-based web application for FlipFeeds, deployed on Firebase App Hosting.

## Monorepo Configuration

This app is part of a pnpm workspace monorepo. **Important for Firebase App Hosting**:

- A **standalone** `pnpm-lock.yaml` is generated specifically for this app (not a copy of root)
- Automatically regenerated after `pnpm install` via postinstall hook
- Pre-push validation ensures lock file exists before pushing to GitHub
- Manual generation: Run `pnpm sync:lock` from the repo root
- The standalone lock file uses `--ignore-workspace` to match Firebase's build context

## Quick Start

### Development

```bash
# From project root
pnpm dev:web

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
# From project root
pnpm build:web

# Or from this directory
pnpm build
```

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local` with your Firebase configuration

3. For production deployment, set environment variables in `apphosting.yaml` or Firebase Console

## Deployment

### To Firebase App Hosting

See [APP_HOSTING_DEPLOYMENT.md](../../documents/APP_HOSTING_DEPLOYMENT.md) for detailed instructions.

Quick deploy:
```bash
# From project root
pnpm deploy:web
```

### Local Emulator

```bash
# From project root
firebase emulators:start

# Web app available at http://localhost:5003
```

## Configuration Files

- `next.config.ts` - Next.js configuration
- `apphosting.yaml` - Firebase App Hosting configuration
- `apphosting.emulator.yaml` - Local emulator configuration
- `.env.local` - Local environment variables (not committed)
- `.env.example` - Environment variables template

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Hosting**: Firebase App Hosting

## Features

- Server-side rendering (SSR)
- Video feed browsing
- User authentication
- Feed management
- Real-time updates with Firestore
- Responsive design
- Dark mode support

## Project Structure

```
apps/web/
├── app/              # Next.js App Router pages
├── components/       # React components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and Firebase config
├── public/           # Static assets
├── types/            # TypeScript type definitions
└── ...config files
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
