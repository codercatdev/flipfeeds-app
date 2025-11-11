# 🎯 FlipFeeds Monorepo - Complete Implementation Guide

![CI](https://github.com/codercatdev/flipfeeds-app/workflows/CI%20-%20Continuous%20Integration/badge.svg)

**A production-ready universal video platform built with Next.js, Expo, and Firebase**

---

## 📚 Documentation

This repository contains comprehensive guides for transforming FlipFeeds into a full-fledged monorepo:

### Core Documentation

1. **[MONOREPO_GUIDE.md](./MONOREPO_GUIDE.md)** - Architecture overview and configuration files
2. **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration instructions
3. **[CICD_GUIDE.md](./CICD_GUIDE.md)** - Deployment and versioning workflows

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
npm install -g pnpm@8.15.0
npm install -g firebase-tools
npm install -g eas-cli

# Verify installations
pnpm --version  # Should be 8.15.0 or higher
node --version  # Should be 18.0.0 or higher
```

### Installation

```bash
# Clone and install dependencies
git clone https://github.com/codercatdev/flipfeeds-app.git
cd flipfeeds-app
pnpm install
```

### Development

```bash
# Start Firebase emulators (Terminal 1)
firebase emulators:start

# Start all apps (Terminal 2)
pnpm dev

# Or start individually:
pnpm dev:web      # Next.js at http://localhost:3000
pnpm dev:mobile   # Expo Dev Tools
```

---

## 📁 Project Structure

```
flipfeeds-app/
├── apps/
│   ├── mobile/          # 📱 Expo/React Native app
│   └── web/             # 🌐 Next.js app
├── packages/
│   ├── firebase-config/ # 🔥 Firebase initialization
│   ├── shared-logic/    # 🧠 Business logic & hooks
│   └── ui-components/   # 🎨 Universal UI components
├── functions/           # ☁️ Firebase Cloud Functions
├── .github/workflows/   # 🔄 CI/CD workflows
└── monorepo-configs/    # ⚙️ Configuration templates
```

---

## 🎯 What's Included

### ✅ Configuration Files

All configuration files are ready in `monorepo-configs/`:

- **Root configs**: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `firebase.json`
- **App configs**: Package.json, TypeScript configs for mobile & web
- **Package configs**: Complete setup for all shared packages
- **GitHub workflows**: CI, deployment, and versioning

### ✅ Shared Packages

Three fully-configured packages in `packages/`:

#### `@flip-feeds/firebase-config`
- Universal Firebase initialization (web & mobile)
- Environment variable handling
- Emulator support
- Type-safe exports

#### `@flip-feeds/shared-logic`
- `useAuth` hook for authentication
- Data fetching utilities
- Shared business logic
- Works on both platforms

#### `@flip-feeds/ui-components`
- Universal `VideoPlayer` component
- Platform-agnostic `Button`
- Styled with React Native (works on web via RN-Web)
- Extensible component library

### ✅ GitHub Actions Workflows

Three production-ready workflows:

1. **CI** (`.github/workflows/ci.yml`)
   - Lint, type-check, build on every PR
   - Parallel job execution
   - Dependency caching

2. **Deploy** (`.github/workflows/deploy.yml`)
   - Auto-deploy web to Firebase Hosting
   - Deploy functions
   - Build mobile apps with EAS
   - Triggered on push to main

3. **Version** (`.github/workflows/version.yml`)
   - Automated versioning with Changesets
   - Generates changelogs
   - Creates release PRs

---

## 📖 Implementation Guides

### Part 1: Understanding the Architecture

**Read: [MONOREPO_GUIDE.md](./MONOREPO_GUIDE.md)**

Learn about:
- Why this structure?
- Package dependency graph
- Platform-specific implementations
- File organization principles

### Part 2: Migrating Your Code

**Follow: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)**

Complete steps for:
1. ✅ Backup and preparation
2. ✅ Initialize monorepo structure
3. ✅ Migrate mobile app
4. ✅ Create web app
5. ✅ Extract shared code
6. ✅ Local development setup
7. ✅ Android emulator testing
8. ✅ Troubleshooting common issues

### Part 3: CI/CD and Deployment

**Setup: [CICD_GUIDE.md](./CICD_GUIDE.md)**

Configure:
- 🔄 Changesets for versioning
- 🔐 GitHub secrets
- 🚀 Firebase Hosting deployment
- 📱 EAS mobile builds
- 📊 Monitoring and rollbacks

---

## 🛠 Common Commands

### Development

```bash
# Start everything
pnpm dev

# Start specific app
pnpm --filter web dev
pnpm --filter mobile dev

# Build packages
pnpm build:packages

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

### Building

```bash
# Build everything
pnpm build

# Build specific app
pnpm --filter web build
pnpm --filter mobile build
```

### Testing

```bash
# Run all tests
pnpm test

# Test specific app
pnpm --filter web test
```

### Versioning

```bash
# Create a changeset
pnpm changeset

# Version packages (creates version bump PR)
pnpm version-packages

# Publish packages
pnpm release
```

### Deployment

```bash
# Deploy web to Firebase
firebase deploy --only hosting

# Deploy functions
firebase deploy --only functions

# Build Android app
cd apps/mobile
eas build --platform android --profile production

# Build iOS app
cd apps/mobile
eas build --platform ios --profile production
```

---

## 🏗 Architecture Decisions

### Why pnpm?

- ✅ **Faster installs** - Symlinks instead of copying
- ✅ **Less disk space** - Shared dependency store
- ✅ **Strict mode** - No phantom dependencies
- ✅ **Built-in workspace support**

### Why Monorepo?

- ✅ **Code sharing** - Write once, use everywhere
- ✅ **Atomic commits** - Changes across packages
- ✅ **Simplified dependencies** - Single node_modules
- ✅ **Unified tooling** - One CI/CD pipeline

### Why Next.js for Web?

- ✅ **SSR/SSG** - Better SEO and performance
- ✅ **API routes** - Backend functionality
- ✅ **Built-in optimization** - Images, fonts, etc.
- ✅ **React Native Web** - Share mobile components

### Why Expo for Mobile?

- ✅ **Managed workflow** - Less native config
- ✅ **EAS Build** - Cloud builds without Mac
- ✅ **Over-the-air updates** - Fast iteration
- ✅ **Great DX** - Hot reload, dev tools

---

## 🔧 Configuration Reference

### Environment Variables

#### Web (`.env.local`)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_USE_EMULATOR=true  # For local dev
```

#### Mobile (`apps/mobile/.env`)

```bash
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

### GitHub Secrets

Required secrets for CI/CD:

| Secret | Purpose |
|--------|---------|
| `FIREBASE_TOKEN` | Deploy to Firebase |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase admin operations |
| `FIREBASE_PROJECT_ID` | Project identifier |
| `EXPO_TOKEN` | EAS builds |
| `NEXT_PUBLIC_FIREBASE_*` | Web app Firebase config |

See [CICD_GUIDE.md](./CICD_GUIDE.md#github-actions-setup) for details.

---

## 🎓 Learning Path

### New to Monorepos?

1. Start with [MONOREPO_GUIDE.md](./MONOREPO_GUIDE.md) - Understand the structure
2. Explore `monorepo-configs/` - See all configuration files
3. Try local development - Run `pnpm dev` and make changes

### Ready to Migrate?

1. Follow [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) step by step
2. Start with Phase 1 (backup)
3. Complete each phase before moving forward
4. Test thoroughly after each phase

### Setting Up CI/CD?

1. Read [CICD_GUIDE.md](./CICD_GUIDE.md)
2. Set up GitHub secrets first
3. Configure Changesets
4. Test workflows on a feature branch

---

## 🤝 Contributing

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make changes** to code

3. **Create a changeset** (for package changes)
   ```bash
   pnpm changeset
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: your feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feat/your-feature
   ```

### Commit Convention

Follow conventional commits:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

---

## 📦 Package Scripts Reference

### Root Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start all apps |
| `build` | Build all packages and apps |
| `lint` | Lint all code |
| `typecheck` | Type-check all code |
| `test` | Run all tests |
| `changeset` | Create a changeset |
| `clean` | Remove all build artifacts |

### App Scripts

| Script | Description |
|--------|-------------|
| `pnpm --filter web dev` | Start Next.js dev server |
| `pnpm --filter mobile dev` | Start Expo dev server |
| `pnpm --filter web build` | Build Next.js app |
| `pnpm --filter mobile android` | Run on Android |

---

## 🐛 Troubleshooting

### Common Issues

#### Metro can't find workspace packages

```bash
cd apps/mobile
rm -rf node_modules .expo
pnpm install
pnpm start --clear
```

#### Next.js can't resolve workspace packages

Check `transpilePackages` in `apps/web/next.config.js`

#### TypeScript errors

```bash
pnpm build:packages  # Build packages first
pnpm typecheck       # Check for errors
```

#### Firebase emulator issues

```bash
firebase emulators:start --clear-cache
```

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#phase-9-common-issues--solutions) for more.

---

## 📊 Project Status

### ✅ Completed

- [x] Monorepo architecture design
- [x] All configuration files
- [x] Shared package implementations
- [x] GitHub Actions workflows
- [x] Comprehensive documentation
- [x] Migration guide
- [x] CI/CD guide

### 🚧 Next Steps

- [ ] Complete migration following guides
- [ ] Set up GitHub secrets
- [ ] Configure EAS for mobile builds
- [ ] Deploy web app to Firebase Hosting
- [ ] Set up Changesets workflow
- [ ] Add comprehensive tests
- [ ] Implement additional shared components

---

## 📞 Support

### Resources

- **Documentation**: See guides in this repository
- **pnpm**: https://pnpm.io/workspaces
- **Next.js**: https://nextjs.org/docs
- **Expo**: https://docs.expo.dev/
- **Firebase**: https://firebase.google.com/docs

### Getting Help

1. Check the guides first
2. Look at configuration examples in `monorepo-configs/`
3. Review troubleshooting sections
4. Check GitHub Actions logs for CI issues

---

## 📄 License

This project is part of FlipFeeds and follows your existing license.

---

## 🎉 Summary

You now have:

✅ **Complete monorepo architecture** with apps and shared packages  
✅ **All configuration files** ready to use  
✅ **Production-ready CI/CD** with GitHub Actions  
✅ **Comprehensive guides** for every step  
✅ **Working examples** of shared code  
✅ **Development workflow** with hot reload  
✅ **Deployment automation** for web and mobile  

### Next Action: Start the Migration

```bash
# 1. Read the architecture guide
cat MONOREPO_GUIDE.md

# 2. Follow the migration guide
cat MIGRATION_GUIDE.md

# 3. Start migrating!
# Follow Phase 1: Backup & Preparation
```

**Good luck with your migration! 🚀**

---

*Generated for FlipFeeds - A video-first social platform*
