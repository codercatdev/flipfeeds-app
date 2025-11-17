# AI Agent Context & Guidelines for FlipFeeds

This document provides context and guidelines for AI agents (like GitHub Copilot, Jules, etc.) working on the FlipFeeds codebase.

## 1. Project Overview
**FlipFeeds** is a video-first, "intentional" social media platform. Unlike algorithmic feeds, users start with an empty feed and must explicitly "flip" (subscribe to/join) specific Feeds.

### 1.1. Core Philosophy
- **Firebase-First:** Utilize the **full suite of Firebase tools** for all aspects of build, run, and AI. If a Firebase solution exists (e.g., App Hosting, Genkit, Firestore), use it over third-party alternatives.
- **Intentionality:** No "For You" page by default. Users curate their own experience.
- **AI-First:** AI is a visible tool for users (summaries, title generation) and admins, driven entirely by Firebase Genkit.

### 1.2. High-Level Goals
- **Viral Growth:** Achieve frictionless user acquisition through a "Flip Link" mechanism, similar to the "Yo" app's simplicity.
- **Stickiness through AI:** Retain users by providing immediate, tangible value with AI features like video summaries and title generation.
- **Monetization:** Implement a "Feeds-as-a-Service" model with free and pro tiers for Feed creators.

---

## 2. AI Agent Instructions
- **Adhere to Conventions:** All code written must follow the rules outlined in this document, especially in the "Coding Conventions & Rules" section.
- **Run Formatters:** Before finalizing any code changes, run `pnpm format` to ensure all files are correctly formatted with Biome.
- **Verify with Linter:** After formatting, run `pnpm check` to catch any linting errors. Fix any issues that are introduced.
- **Use pnpm:** Always use `pnpm` for package management. Do not use `npm` or `yarn`.

---

## 3. Monorepo Structure & Workspaces

This is a `pnpm` monorepo. The workspaces are defined in `pnpm-workspace.yaml`.

- **`apps/web`**: The Next.js web application. This is the primary web client.
- **`apps/mobile`**: The Expo (React Native) mobile application for iOS and Android.
- **`functions`**: The backend, built with Firebase Cloud Functions and Firebase Genkit for all AI logic.
- **`packages/*`**: Shared libraries used across the monorepo.
    - `packages/firebase-config`: Shared Firebase configuration.
    - `packages/shared-logic`: Shared business logic.
    - `packages/ui-components`: Shared UI components.

---

## 4. Key Scripts & Commands

These are the primary commands to run, build, and test the project from the monorepo root.

### 4.1. Development
- **Run all apps:** `pnpm dev`
- **Run web app only:** `pnpm dev:web`
- **Run mobile app only:** `pnpm dev:mobile`
- **Start Genkit Developer UI:** `pnpm genkit:dev` (runs build and starts UI)
- **Start Firebase Emulators:** `pnpm emulators` (for Functions, Firestore, Hosting, etc.)

### 4.2. Building
- **Build all apps and packages:** `pnpm build`
- **Build web app:** `pnpm build:web`
- **Build mobile app:** `pnpm build:mobile`
- **Build shared packages:** `pnpm build:packages`

### 4.3. Testing & Linting
- **Run all tests:** `pnpm test`
- **Lint all files:** `pnpm lint`
- **Fix linting issues:** `pnpm lint:fix`
- **Run Biome check:** `pnpm check`

---

## 5. Tech Stack & Versions
**Strictly adhere to these versions and frameworks.**

### 5.1. Monorepo
- **Package Manager:** `pnpm` (Workspaces enabled). **Always use `pnpm` commands.**
- **Build System:** Turborepo is used for orchestrating builds, but commands are run via pnpm.

### 5.2. `apps/web` (Web Client)
- **Framework:** Next.js (App Router).
- **Hosting/Build:** **Firebase App Hosting** (serverless Next.js support).
- **Styling:** Tailwind CSS v4 (Zero-runtime, CSS-first configuration).
- **UI Library:** shadcn/ui.
- **AI Client State:** Vercel AI SDK - Used solely for managing client-side streaming/chat state, connected to Firebase Genkit backends.

### 5.3. `apps/mobile` (Mobile Client)
- **Framework:** Expo (Managed Workflow).
- **Platform:** React Native Firebase (`@react-native-firebase/*`).
- **Navigation:** Expo Router.
- **Styling:** NativeWind v4.

### 5.4. `functions` (Backend & AI)
- **Runtime:** Firebase Cloud Functions (2nd Gen).
- **AI Framework:** **Firebase Genkit** (Strict requirement for all AI logic).
- **Model Layer:** Vertex AI (via Firebase).
- **Protocol:** Model Context Protocol (MCP) for tool interoperability.

---

## 6. Architecture & Data Patterns

### 6.1. The "Feed" Model
- **Public/Private Feeds:** Managed via Firestore.
- **Personal Feed:** A private "Feed of One" created on signup.

### 6.2. Authentication & Security
- **Provider:** Firebase Authentication.
- **Requirement:** Phone Number verification is mandatory.
- **Context:** `auth.uid` must be propagated to all Genkit flows.

### 6.3. AI Implementation (Firebase Genkit)
- **Rule:** All AI logic must be encapsulated in **Genkit Flows** deployed as Firebase Functions.
- **Tools:** External integrations must be defined as Genkit Tools or MCP servers.
- **Flows:**
    - `summarizeVideoFlow`: Auto-generates text summaries.
    - `generateTitleFlow`: Suggests titles.
    - `moderateContentFlow`: Mandatory check for public uploads.

### 6.4. Data & State Management (Firebase Native)
- **Philosophy:** Rely entirely on the **Firebase Client SDKs**.
- **Fetching:** Use `onSnapshot` for real-time feeds and `getDoc` for static data.
- **Caching:** Leverage Firestore's native offline persistence and caching.
- **Avoid:** Do not use TanStack Query or SWR. Trust the SDK.

---

## 7. Coding Conventions & Rules

### 7.1. General
- **TypeScript:** Strict mode enabled. No `any` types.
- **Exports:** Named exports only.
- **Path Aliases:** Use `~/*` or `@/*` as defined in `tsconfig.json`.
- **Linting/Formatting:** Biome is used for linting and formatting. Use `pnpm check` and `pnpm format`.

### 7.2. Styling (Tailwind v4)
- Use the CSS-first `@theme` directive. Do not use `tailwind.config.js`.
- Use `shadcn/ui` primitives.

### 7.3. Growth Mechanics
- **Deep Links:** Prioritize "One Tap" joining via Firebase Dynamic Links (or native equivalent handled by Expo/Next.js).

---

## 8. Development Workflow
1. **Install:** `pnpm install`
2. **Dev:** `pnpm dev` (Runs all apps).
3. **AI/Backend Dev:** `pnpm genkit:dev` (in root) to launch the **Genkit Developer UI**.
4. **Emulators:** Use `pnpm emulators` for local testing of Firestore/Auth/Functions.

## 9. Deployment
- **CI/CD:** GitHub Actions are used for continuous integration.
- **Versioning:** `changesets` is used for versioning and changelogs. To create a new version, run `pnpm changeset`.
- **Deployment:** Deployment is handled via Firebase CLI. See `firebase.json` and the root `package.json` for deploy scripts (`deploy:functions`, `deploy:hosting`).

## 10. Documentation References
- **Philosophy:** `documents/philosophy.md`
- **Business Logic:** `documents/business_plan.md`
- **CI/CD Guide:** `documents/CICD_GUIDE.md`
- **Firestore Schema:** `documents/firestore.md`
