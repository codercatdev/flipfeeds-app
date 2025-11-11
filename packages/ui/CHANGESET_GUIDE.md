# shadcn/ui + Changesets Integration Guide

This document explains how to use shadcn/ui components with changesets for versioning in your FlipFeeds monorepo.

## Quick Start

### Adding a new component

```bash
# 1. Navigate to web app
cd apps/web

# 2. Add component via shadcn CLI
pnpm dlx shadcn@latest add button

# 3. The component is automatically added to packages/ui/src/components/

# 4. Create a changeset for the new component
cd ../..
pnpm changeset
```

When prompted:
- Select `@flip-feeds/ui` package
- Choose `minor` (new feature) or `patch` (bug fix)
- Describe: "Add button component from shadcn/ui"

## Workflow with Changesets

### Scenario 1: Adding UI Components

```bash
# Add multiple components
cd apps/web
pnpm dlx shadcn@latest add button input card dialog

# Create changeset
cd ../..
pnpm changeset
# Select: @flip-feeds/ui
# Type: minor (new features)
# Description: "Add button, input, card, and dialog components"

# Commit
git add .
git commit -m "feat(ui): add core form components"
```

### Scenario 2: Customizing Components

```bash
# Edit packages/ui/src/components/button.tsx
# Add custom variants or modify styles

# Create changeset
pnpm changeset
# Select: @flip-feeds/ui
# Type: patch (if backward compatible) or major (if breaking)
# Description: "Customize button variants with brand colors"

# Commit
git add .
git commit -m "feat(ui): customize button component"
```

### Scenario 3: Using Components in Web App

```bash
# Edit apps/web/app/some-page.tsx
# Import and use: import { Button } from "@workspace/ui/components/button"

# Create changeset
pnpm changeset
# Select: @flip-feeds/web (if you're versioning the web app)
# Type: minor or patch
# Description: "Add user profile page with new UI components"

# Commit
git add .
git commit -m "feat(web): add user profile page"
```

## Changeset Configuration for UI Package

Your `.changeset/config.json` should include the UI package:

```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Note:** Do NOT add `@flip-feeds/ui` to the `ignore` array. You want to version this package.

## Version Bump Guidelines

### Major (Breaking Changes)

```bash
# Example: Removing a component or changing its API
pnpm changeset
# Type: major
# Description: "BREAKING: Remove deprecated Button variant 'old-style'"
```

Use when:
- Removing components
- Changing component props (breaking existing usage)
- Changing export names
- Major style overhauls that break layouts

### Minor (New Features)

```bash
# Example: Adding new components or variants
pnpm changeset
# Type: minor
# Description: "Add new 'gradient' variant to Button component"
```

Use when:
- Adding new components
- Adding new variants to existing components
- Adding new optional props
- Adding new utility functions

### Patch (Bug Fixes)

```bash
# Example: Fixing a styling bug
pnpm changeset
# Type: patch
# Description: "Fix button focus ring color in dark mode"
```

Use when:
- Fixing bugs
- Updating dependencies
- Performance improvements
- Documentation updates

## Automated Versioning Flow

### Step 1: Development

```bash
# Developer adds components and creates changeset
cd apps/web
pnpm dlx shadcn@latest add dropdown-menu
cd ../..
pnpm changeset
git add .
git commit -m "feat(ui): add dropdown menu component"
git push
```

### Step 2: GitHub Actions (Automatic)

When merged to `main`:
1. Changesets bot analyzes changes
2. Creates "Version Packages" PR
3. PR includes:
   - `packages/ui/package.json` version bump
   - `packages/ui/CHANGELOG.md` update
   - Web app dependency update (if linked)

### Step 3: Release (Manual)

```bash
# Review and merge "Version Packages" PR
# This triggers:
# - Git tag creation (e.g., @flip-feeds/ui@1.2.0)
# - Changelog generation
# - Deployment (if configured)
```

## Example Changesets

### Adding Multiple Components

**.changeset/happy-foxes-jump.md**
```markdown
---
"@flip-feeds/ui": minor
---

Add core form components: Input, Label, Form, and Textarea
```

### Updating Theme

**.changeset/brave-pandas-smile.md**
```markdown
---
"@flip-feeds/ui": patch
---

Update color palette to match brand guidelines
```

### Breaking Change

**.changeset/serious-lions-roar.md**
```markdown
---
"@flip-feeds/ui": major
---

BREAKING: Rename Button variant 'primary' to 'default' for consistency with shadcn/ui defaults
```

## Best Practices

### 1. Always Create Changesets for UI Changes

```bash
# ✅ Good
git add packages/ui
pnpm changeset
git commit -m "feat(ui): add alert component"

# ❌ Bad
git add packages/ui
git commit -m "add alert"  # No changeset!
```

### 2. Use Semantic Commit Messages

```bash
# Format: type(scope): description
git commit -m "feat(ui): add new component"
git commit -m "fix(ui): resolve styling bug"
git commit -m "docs(ui): update README"
git commit -m "chore(ui): update dependencies"
```

### 3. Bundle Related Changes

```bash
# Add multiple related components in one changeset
cd apps/web
pnpm dlx shadcn@latest add dialog dialog-trigger dialog-content
cd ../..
pnpm changeset
# Description: "Add complete Dialog component set"
```

### 4. Document Breaking Changes Clearly

```markdown
---
"@flip-feeds/ui": major
---

BREAKING CHANGE: Button component prop `color` renamed to `variant`

Migration:
```tsx
// Before
<Button color="primary">Click</Button>

// After
<Button variant="default">Click</Button>
```
```

## GitHub Actions Integration

Your `.github/workflows/version.yml` should handle UI package versioning:

```yaml
name: Version - Changesets Release

on:
  push:
    branches:
      - main

jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      
      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          commit: "chore: version packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Checking Package Version

```bash
# View current version
cat packages/ui/package.json | grep version

# View changelog
cat packages/ui/CHANGELOG.md
```

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [shadcn/ui Monorepo Guide](https://ui.shadcn.com/docs/monorepo)
- [Conventional Commits](https://www.conventionalcommits.org/)
