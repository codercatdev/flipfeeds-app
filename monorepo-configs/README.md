# Monorepo Configuration Files

**All production-ready configuration files for the FlipFeeds monorepo**

---

## 📦 What's in This Directory

This directory contains **23 production-ready configuration files** that form the complete monorepo setup.

**DO NOT EDIT THESE FILES DIRECTLY.**  
These are templates to be copied to their final destinations.

---

## 📁 File Organization

### Root Configuration (4 files)

| File | Description | Copy To |
|------|-------------|---------|
| `pnpm-workspace.yaml` | Workspace definition | `./pnpm-workspace.yaml` |
| `package.json` | Root package with scripts | `./package.json` |
| `tsconfig.base.json` | Base TypeScript config | `./tsconfig.base.json` |
| `firebase.json` | Firebase configuration | `./firebase.json` |

### Mobile App (2 files)

| File | Description | Copy To |
|------|-------------|---------|
| `apps-mobile-package.json` | Expo dependencies | `./apps/mobile/package.json` |
| `apps-mobile-tsconfig.json` | Mobile TypeScript | `./apps/mobile/tsconfig.json` |

### Web App (3 files)

| File | Description | Copy To |
|------|-------------|---------|
| `apps-web-package.json` | Next.js dependencies | `./apps/web/package.json` |
| `apps-web-tsconfig.json` | Web TypeScript | `./apps/web/tsconfig.json` |
| `apps-web-next.config.js` | Next.js workspace config | `./apps/web/next.config.js` |

### Firebase Config Package (3 files)

| File | Description | Copy To |
|------|-------------|---------|
| `packages-firebase-config-package.json` | Package config | `./packages/firebase-config/package.json` |
| `packages-firebase-config-tsconfig.json` | TypeScript | `./packages/firebase-config/tsconfig.json` |
| `packages-firebase-config-index.ts` | **Implementation** | `./packages/firebase-config/src/index.ts` |

### Shared Logic Package (4 files)

| File | Description | Copy To |
|------|-------------|---------|
| `packages-shared-logic-package.json` | Package config | `./packages/shared-logic/package.json` |
| `packages-shared-logic-tsconfig.json` | TypeScript | `./packages/shared-logic/tsconfig.json` |
| `packages-shared-logic-index.ts` | Exports | `./packages/shared-logic/src/index.ts` |
| `packages-shared-logic-useAuth.ts` | useAuth hook | `./packages/shared-logic/src/hooks/useAuth.ts` |

### UI Components Package (4 files)

| File | Description | Copy To |
|------|-------------|---------|
| `packages-ui-components-package.json` | Package config | `./packages/ui-components/package.json` |
| `packages-ui-components-tsconfig.json` | TypeScript | `./packages/ui-components/tsconfig.json` |
| `packages-ui-components-index.ts` | Exports | `./packages/ui-components/src/index.ts` |
| `packages-ui-components-VideoPlayer.tsx` | VideoPlayer | `./packages/ui-components/src/VideoPlayer.tsx` |

### GitHub Workflows (3 files)

| File | Description | Copy To |
|------|-------------|---------|
| `.github-workflows-ci.yml` | CI pipeline | `./.github/workflows/ci.yml` |
| `.github-workflows-deploy.yml` | Deployment | `./.github/workflows/deploy.yml` |
| `.github-workflows-version.yml` | Versioning | `./.github/workflows/version.yml` |

---

## 🚀 How to Use

### Option 1: Manual Copy

```bash
# From the root of your project

# Root configs
cp monorepo-configs/pnpm-workspace.yaml ./
cp monorepo-configs/package.json ./
cp monorepo-configs/tsconfig.base.json ./
cp monorepo-configs/firebase.json ./

# Create directories
mkdir -p apps/mobile apps/web
mkdir -p packages/firebase-config/src
mkdir -p packages/shared-logic/src/hooks
mkdir -p packages/ui-components/src
mkdir -p .github/workflows

# Mobile app
cp monorepo-configs/apps-mobile-package.json ./apps/mobile/package.json
cp monorepo-configs/apps-mobile-tsconfig.json ./apps/mobile/tsconfig.json

# Web app
cp monorepo-configs/apps-web-package.json ./apps/web/package.json
cp monorepo-configs/apps-web-tsconfig.json ./apps/web/tsconfig.json
cp monorepo-configs/apps-web-next.config.js ./apps/web/next.config.js

# Firebase config package
cp monorepo-configs/packages-firebase-config-package.json ./packages/firebase-config/package.json
cp monorepo-configs/packages-firebase-config-tsconfig.json ./packages/firebase-config/tsconfig.json
cp monorepo-configs/packages-firebase-config-index.ts ./packages/firebase-config/src/index.ts

# Shared logic package
cp monorepo-configs/packages-shared-logic-package.json ./packages/shared-logic/package.json
cp monorepo-configs/packages-shared-logic-tsconfig.json ./packages/shared-logic/tsconfig.json
cp monorepo-configs/packages-shared-logic-index.ts ./packages/shared-logic/src/index.ts
cp monorepo-configs/packages-shared-logic-useAuth.ts ./packages/shared-logic/src/hooks/useAuth.ts

# UI components package
cp monorepo-configs/packages-ui-components-package.json ./packages/ui-components/package.json
cp monorepo-configs/packages-ui-components-tsconfig.json ./packages/ui-components/tsconfig.json
cp monorepo-configs/packages-ui-components-index.ts ./packages/ui-components/src/index.ts
cp monorepo-configs/packages-ui-components-VideoPlayer.tsx ./packages/ui-components/src/VideoPlayer.tsx

# GitHub workflows
cp monorepo-configs/.github-workflows-ci.yml ./.github/workflows/ci.yml
cp monorepo-configs/.github-workflows-deploy.yml ./.github/workflows/deploy.yml
cp monorepo-configs/.github-workflows-version.yml ./.github/workflows/version.yml
```

### Option 2: Follow the Migration Guide

The complete step-by-step process is in **[MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)**.

It includes:
- ✅ When to copy each file
- ✅ What to do after copying
- ✅ How to verify it worked
- ✅ Troubleshooting tips

---

## 📝 Important Notes

### 1. These Are Templates
- Customize after copying to your project
- Update package names/versions as needed
- Add project-specific configuration

### 2. Dependencies
Some files depend on others being in place first:
1. Root configs must be copied first
2. Then package configs
3. Then app configs
4. Finally workflows

### 3. Environment Variables
After copying, you'll need to set up:
- `.env.local` for web
- `.env` for mobile
- GitHub secrets for CI/CD

See [CICD_GUIDE.md](../CICD_GUIDE.md) for details.

---

## ✅ Verification

After copying all files, verify:

```bash
# Check structure
tree -L 3 -I 'node_modules'

# Should see:
# ├── pnpm-workspace.yaml
# ├── package.json
# ├── tsconfig.base.json
# ├── firebase.json
# ├── apps/
# │   ├── mobile/
# │   │   ├── package.json
# │   │   └── tsconfig.json
# │   └── web/
# │       ├── package.json
# │       ├── tsconfig.json
# │       └── next.config.js
# ├── packages/
# │   ├── firebase-config/
# │   │   ├── package.json
# │   │   ├── tsconfig.json
# │   │   └── src/
# │   ├── shared-logic/
# │   │   ├── package.json
# │   │   ├── tsconfig.json
# │   │   └── src/
# │   └── ui-components/
# │       ├── package.json
# │       ├── tsconfig.json
# │       └── src/
# └── .github/
#     └── workflows/
#         ├── ci.yml
#         ├── deploy.yml
#         └── version.yml
```

---

## 🔍 File Details

### Root Files

#### pnpm-workspace.yaml
- Defines workspace packages
- Includes apps/*, packages/*, functions

#### package.json
- Workspace-wide dependencies
- Scripts for dev, build, lint, typecheck
- Changesets integration

#### tsconfig.base.json
- Base TypeScript configuration
- Extended by all packages and apps
- Strict mode enabled

#### firebase.json
- Firebase Hosting configuration
- Functions deployment config
- Emulator settings

### Package Files

Each package includes:
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript config extending base
- **src/index.ts** - Main entry point
- **Implementation files** - Full working code

### Workflow Files

Each workflow includes:
- **Complete job definitions**
- **All required steps**
- **Secret references**
- **Caching strategies**

---

## 📚 Related Documentation

- **[MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)** - Step-by-step implementation
- **[MONOREPO_GUIDE.md](../MONOREPO_GUIDE.md)** - Architecture overview
- **[CICD_GUIDE.md](../CICD_GUIDE.md)** - Deployment setup
- **[QUICK_REFERENCE.md](../QUICK_REFERENCE.md)** - Command reference

---

## 🎯 Quick Start

1. **Read** [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)
2. **Copy** files from this directory
3. **Install** dependencies: `pnpm install`
4. **Build** packages: `pnpm build:packages`
5. **Run** development: `pnpm dev`

---

## ⚠️ Common Mistakes to Avoid

### ❌ Don't
- Edit files in this directory directly
- Copy files without creating destination directories first
- Skip the migration guide
- Forget to update package names

### ✅ Do
- Follow the migration guide
- Create directories before copying
- Test after each phase
- Update environment variables

---

## 🎉 You're Ready!

All configuration files are ready to use. Follow the migration guide for the complete process.

**Next step:** Read [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)

---

*FlipFeeds Monorepo Configuration Files*  
*Production-ready and ready to copy*
