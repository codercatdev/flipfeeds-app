# FlipFeeds Monorepo - Migration & Setup Guide

**Complete step-by-step instructions for migrating to the monorepo structure**

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed
- **pnpm 8+** installed (`npm install -g pnpm@8.15.0`)
- **Git** installed and configured
- **Firebase CLI** installed (`npm install -g firebase-tools`)
- **EAS CLI** installed (`npm install -g eas-cli`)
- Your Firebase project credentials
- Your Expo account set up

---

## Part 2: Migration & Local Development Plan

### Phase 1: Backup & Preparation

#### Step 1.1: Backup Your Current Project

```bash
# Create a backup branch
cd /Users/afa/web/codingcatdev/flipfeeds-app
git checkout -b backup-before-monorepo
git add .
git commit -m "Backup before monorepo migration"
git push origin backup-before-monorepo

# Create a new migration branch
git checkout -b feat/monorepo-migration
```

#### Step 1.2: Document Current State

```bash
# List current dependencies
cat package.json > pre-migration-package.json

# Take note of current scripts
echo "Current project structure:" > migration-notes.txt
tree -L 2 -I 'node_modules' >> migration-notes.txt
```

---

### Phase 2: Initialize Monorepo Structure

#### Step 2.1: Create Directory Structure

```bash
# Create apps directory
mkdir -p apps/mobile apps/web

# Create packages directory
mkdir -p packages/firebase-config/src
mkdir -p packages/shared-logic/src/hooks
mkdir -p packages/shared-logic/src/utils
mkdir -p packages/ui-components/src

# Create GitHub workflows directory
mkdir -p .github/workflows
```

#### Step 2.2: Copy Configuration Files

```bash
# Copy all config files from monorepo-configs to their destinations
cp monorepo-configs/pnpm-workspace.yaml ./pnpm-workspace.yaml
cp monorepo-configs/package.json ./package.json.new
cp monorepo-configs/tsconfig.base.json ./tsconfig.base.json
cp monorepo-configs/firebase.json ./firebase.json.new

# Apps configuration
cp monorepo-configs/apps-mobile-package.json ./apps/mobile/package.json
cp monorepo-configs/apps-mobile-tsconfig.json ./apps/mobile/tsconfig.json
cp monorepo-configs/apps-web-package.json ./apps/web/package.json
cp monorepo-configs/apps-web-tsconfig.json ./apps/web/tsconfig.json
cp monorepo-configs/apps-web-next.config.js ./apps/web/next.config.js

# Packages configuration
cp monorepo-configs/packages-firebase-config-package.json ./packages/firebase-config/package.json
cp monorepo-configs/packages-firebase-config-tsconfig.json ./packages/firebase-config/tsconfig.json
cp monorepo-configs/packages-firebase-config-index.ts ./packages/firebase-config/src/index.ts

cp monorepo-configs/packages-shared-logic-package.json ./packages/shared-logic/package.json
cp monorepo-configs/packages-shared-logic-tsconfig.json ./packages/shared-logic/tsconfig.json
cp monorepo-configs/packages-shared-logic-index.ts ./packages/shared-logic/src/index.ts
cp monorepo-configs/packages-shared-logic-useAuth.ts ./packages/shared-logic/src/hooks/useAuth.ts

cp monorepo-configs/packages-ui-components-package.json ./packages/ui-components/package.json
cp monorepo-configs/packages-ui-components-tsconfig.json ./packages/ui-components/tsconfig.json
cp monorepo-configs/packages-ui-components-index.ts ./packages/ui-components/src/index.ts
cp monorepo-configs/packages-ui-components-VideoPlayer.tsx ./packages/ui-components/src/VideoPlayer.tsx

# GitHub workflows
cp monorepo-configs/.github-workflows-ci.yml ./.github/workflows/ci.yml
cp monorepo-configs/.github-workflows-deploy.yml ./.github/workflows/deploy.yml
cp monorepo-configs/.github-workflows-version.yml ./.github/workflows/version.yml
```

---

### Phase 3: Migrate Mobile App

#### Step 3.1: Move Existing Mobile Code

```bash
# Move existing app code to apps/mobile
rsync -av --exclude='node_modules' --exclude='.expo' \
  app/ apps/mobile/app/

# Move assets
rsync -av --exclude='node_modules' \
  assets/ apps/mobile/assets/

# Move components (we'll refactor these later)
rsync -av --exclude='node_modules' \
  components/ apps/mobile/components/

# Move contexts
rsync -av --exclude='node_modules' \
  contexts/ apps/mobile/contexts/

# Move hooks
rsync -av --exclude='node_modules' \
  hooks/ apps/mobile/hooks/

# Move constants
rsync -av --exclude='node_modules' \
  constants/ apps/mobile/constants/

# Copy configuration files
cp app.json apps/mobile/app.json
cp babel.config.js apps/mobile/babel.config.js
cp metro.config.js apps/mobile/metro.config.js

# Copy native directories
rsync -av --exclude='build' android/ apps/mobile/android/
rsync -av --exclude='build' ios/ apps/mobile/ios/
```

#### Step 3.2: Update Mobile Metro Config

Create `apps/mobile/metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and extensions
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

#### Step 3.3: Update Mobile App Imports

Update `apps/mobile/app/_layout.tsx` to use workspace packages:

```typescript
// Old import
// import { firebaseApp } from '../lib/firebaseConfig';

// New import
import { firebaseApp } from '@flip-feeds/firebase-config';
import { useAuth } from '@flip-feeds/shared-logic';
```

---

### Phase 4: Create Web App

#### Step 4.1: Initialize Next.js App Structure

```bash
# Create web app structure
mkdir -p apps/web/app
mkdir -p apps/web/components
mkdir -p apps/web/public
```

#### Step 4.2: Create Web App Entry Points

Create `apps/web/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlipFeeds',
  description: 'Video-first social platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `apps/web/app/page.tsx`:

```typescript
'use client';

import { useAuth } from '@flip-feeds/shared-logic';
import { VideoPlayer } from '@flip-feeds/ui-components';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">FlipFeeds</h1>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <VideoPlayer
            source="https://example.com/video.mp4"
            controls
          />
        </div>
      ) : (
        <p>Please sign in</p>
      )}
    </main>
  );
}
```

Create `apps/web/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}
```

Create `apps/web/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui-components/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

### Phase 5: Refactor Shared Code

#### Step 5.1: Extract Firebase Configuration

Move your existing Firebase config from `lib/firebaseConfig.ts` to the shared package.

The package structure is already set up with environment variable handling.

#### Step 5.2: Extract Shared Hooks

Identify hooks that are used in multiple places:

```bash
# Example: Move useAuth if you have it
# From: apps/mobile/hooks/useAuth.ts
# To: packages/shared-logic/src/hooks/useAuth.ts (already created)
```

#### Step 5.3: Extract UI Components

Move reusable components to `packages/ui-components`:

```bash
# Example: If you have a Button component
cp apps/mobile/components/Button.tsx packages/ui-components/src/Button.tsx
```

Create `packages/ui-components/src/Button.tsx`:

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#6c757d',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

Update `packages/ui-components/src/index.ts`:

```typescript
export { VideoPlayer } from './VideoPlayer';
export { Button } from './Button';
export type { VideoPlayerProps } from './VideoPlayer';
export type { ButtonProps } from './Button';
```

---

### Phase 6: Install Dependencies & Build

#### Step 6.1: Clean Old Dependencies

```bash
# Remove old node_modules and lockfiles
rm -rf node_modules package-lock.json yarn.lock
rm -rf apps/mobile/node_modules
rm -rf apps/web/node_modules
rm -rf packages/*/node_modules
```

#### Step 6.2: Install with pnpm

```bash
# Install all dependencies from monorepo root
pnpm install
```

This single command will:
- Install root dependencies
- Install dependencies for all apps
- Install dependencies for all packages
- Create symlinks between workspace packages

#### Step 6.3: Build Shared Packages

```bash
# Build all shared packages
pnpm build:packages
```

This ensures all packages are compiled before the apps try to use them.

---

### Phase 7: Local Development Setup

#### Step 7.1: Set Up Environment Variables

Create `.env.local` in root:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Use emulators in development
NEXT_PUBLIC_USE_EMULATOR=true
```

Copy to web app:

```bash
cp .env.local apps/web/.env.local
```

For mobile, create `apps/mobile/.env`:

```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

#### Step 7.2: Start Firebase Emulators

In one terminal:

```bash
# From monorepo root
firebase emulators:start
```

This starts:
- Auth Emulator: http://localhost:9099
- Firestore Emulator: http://localhost:8080
- Functions Emulator: http://localhost:5001
- Storage Emulator: http://localhost:9199
- Emulator UI: http://localhost:4000

#### Step 7.3: Start Development Servers

**Option A: Start Everything (Recommended)**

```bash
# From monorepo root
pnpm dev
```

This runs both web and mobile apps concurrently.

**Option B: Start Individually**

Terminal 1 - Web:
```bash
pnpm dev:web
# Opens at http://localhost:3000
```

Terminal 2 - Mobile:
```bash
pnpm dev:mobile
# Opens Expo Dev Tools
```

#### Step 7.4: Run on Android Emulator

1. **Start Android Emulator** (via Android Studio or command line):
   ```bash
   emulator -avd Pixel_5_API_33
   ```

2. **Start the Mobile App on Android**:
   ```bash
   cd apps/mobile
   pnpm android
   ```

   Or press `a` in the Expo Dev Tools terminal.

3. **Verify Package Resolution**:
   
   Check the Metro bundler output - you should see:
   ```
   Metro bundler watching: apps/mobile, packages/*
   ```

   This confirms workspace packages are being resolved correctly.

---

### Phase 8: Testing the Migration

#### Step 8.1: Verify Mobile App

1. Open the app on Android emulator
2. Check that Firebase connection works
3. Test authentication
4. Verify shared components render correctly

#### Step 8.2: Verify Web App

1. Open http://localhost:3000
2. Check Firebase connection
3. Test authentication
4. Verify shared components work

#### Step 8.3: Test Hot Reload

1. Make a change to `packages/ui-components/src/Button.tsx`
2. Both web and mobile should hot reload
3. Changes should appear in both platforms

---

### Phase 9: Common Issues & Solutions

#### Issue 1: Metro Can't Find Workspace Packages

**Solution**: Ensure `metro.config.js` has correct `watchFolders` and `nodeModulesPaths`.

```bash
cd apps/mobile
rm -rf .expo node_modules
pnpm install
pnpm start --clear
```

#### Issue 2: Next.js Can't Resolve Workspace Packages

**Solution**: Check `next.config.js` has `transpilePackages` configured:

```javascript
transpilePackages: [
  '@flip-feeds/firebase-config',
  '@flip-feeds/shared-logic',
  '@flip-feeds/ui-components',
],
```

#### Issue 3: TypeScript Can't Find Types

**Solution**: Build packages first:

```bash
pnpm build:packages
```

#### Issue 4: React Native Web Errors in Next.js

**Solution**: Ensure webpack alias in `next.config.js`:

```javascript
config.resolve.alias = {
  'react-native$': 'react-native-web',
};
```

---

### Phase 10: Git Workflow

#### Step 10.1: Commit Migration

```bash
git add .
git commit -m "feat: migrate to monorepo structure

- Set up pnpm workspace with apps/ and packages/
- Migrate mobile app to apps/mobile
- Create Next.js web app in apps/web
- Extract shared packages (firebase-config, shared-logic, ui-components)
- Set up GitHub Actions workflows for CI/CD
- Configure Metro bundler for monorepo support
"

git push origin feat/monorepo-migration
```

#### Step 10.2: Create Pull Request

Create a PR from `feat/monorepo-migration` to `main` and request review.

---

## Development Workflow Summary

### Daily Development

```bash
# 1. Start emulators (terminal 1)
firebase emulators:start

# 2. Start all apps (terminal 2)
pnpm dev

# Or start individually:
pnpm dev:web      # Web only
pnpm dev:mobile   # Mobile only
```

### Making Changes to Shared Packages

```bash
# Changes to packages automatically rebuild in dev mode
# Just edit files in packages/* and both apps hot reload

# For production builds:
pnpm build:packages
```

### Running Commands for Specific Apps

```bash
# Run command only for web app
pnpm --filter web <command>

# Run command only for mobile app
pnpm --filter mobile <command>

# Examples:
pnpm --filter web build
pnpm --filter mobile typecheck
```

### Type Checking

```bash
# Check all packages and apps
pnpm typecheck

# Check specific app
pnpm --filter web typecheck
```

### Linting

```bash
# Lint everything
pnpm lint

# Lint and fix
pnpm lint:fix
```

---

## Next Steps

1. ✅ Complete migration following steps above
2. ✅ Test locally on both web and Android
3. ✅ Set up GitHub secrets for CI/CD
4. ✅ Push to GitHub and verify CI passes
5. 📱 Configure EAS Build for mobile deployments
6. 🚀 Deploy web app to Firebase Hosting
7. 📦 Set up Changesets for version management

---

## Additional Resources

- [pnpm Workspace Documentation](https://pnpm.io/workspaces)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Changesets Documentation](https://github.com/changesets/changesets)
