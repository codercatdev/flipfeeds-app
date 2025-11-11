# FlipFeeds Monorepo Migration Guide

**Complete guide to transforming FlipFeeds into a universal pnpm monorepo with Next.js, Expo, and Firebase**

---

## Table of Contents

1. [Part 1: Target Architecture & Configuration](#part-1-target-architecture--configuration)
2. [Part 2: Migration & Local Development Plan](#part-2-migration--local-development-plan)
3. [Part 3: CI/CD & Deployment Plan](#part-3-cicd--deployment-plan)

---

# Part 1: Target Architecture & Configuration

## 1.1 Complete Monorepo Structure

```
flipfeeds-app/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── version.yml
├── apps/
│   ├── mobile/                      # Expo/React Native app
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   ├── (auth)/
│   │   │   └── (tabs)/
│   │   ├── assets/
│   │   ├── components/              # Mobile-specific components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── metro.config.js
│   │   └── eas.json
│   └── web/                         # Next.js app
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── (auth)/
│       │   └── (dashboard)/
│       ├── components/              # Web-specific components
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       └── tailwind.config.js
├── packages/
│   ├── firebase-config/             # Firebase initialization & config
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared-logic/                # Business logic, hooks, utilities
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useVideoFeed.ts
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ui-components/               # Universal UI components
│       ├── src/
│       │   ├── index.ts
│       │   ├── VideoPlayer.tsx
│       │   ├── Button.tsx
│       │   └── Card.tsx
│       ├── package.json
│       └── tsconfig.json
├── functions/                       # Firebase Cloud Functions (existing)
│   └── ...
├── .changesets/                     # Changesets for versioning
├── pnpm-workspace.yaml
├── package.json                     # Root package.json
├── tsconfig.base.json               # Base TypeScript config
├── firebase.json                    # Updated Firebase config
├── .gitignore
└── README.md
```

## 1.2 Key Architectural Decisions

### Why This Structure?

1. **`apps/`**: Contains deployable applications (mobile & web)
2. **`packages/`**: Contains shared, reusable code
3. **Scoped packages**: All shared packages use `@flip-feeds/*` scope for clarity
4. **Maximum code sharing**: Business logic, Firebase config, and UI components are shared
5. **Platform-specific code**: Each app can have platform-specific implementations when needed

### Package Dependency Graph

```
apps/mobile  ───┐
                ├──> @flip-feeds/shared-logic ──> @flip-feeds/firebase-config
apps/web     ───┤                             ──> @flip-feeds/ui-components
                └──> @flip-feeds/ui-components
```

---

# Configuration Files

## Root Level Configurations

These files will be created in the sections below and form the foundation of the monorepo.

---

*This guide continues with detailed configuration files, migration steps, and CI/CD workflows in the following sections.*
