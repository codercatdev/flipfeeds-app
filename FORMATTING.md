# Code Formatting & Linting

This monorepo uses **Biome** for formatting, linting, and import organization.

## Why Biome?

- **10-100x faster** than Prettier + ESLint
- **Single tool** for formatting, linting, and import sorting
- **Zero config** needed (but we've customized it)
- **Native speed** - written in Rust

## VS Code Setup

### 1. Install the Biome Extension

The workspace already recommends the extension. When you open VS Code, you should see a prompt to install:
- `biomejs.biome`

Or install manually from the Extensions marketplace.

### 2. Settings Already Configured

The `.vscode/settings.json` file is already configured to:
- ✅ Format on save
- ✅ Format on paste
- ✅ Organize imports on save
- ✅ Use Biome as the default formatter

## Commands

### Format Files
```bash
# Format all files
pnpm format

# Check formatting without writing
pnpm format:check
```

### Lint Files
```bash
# Lint all files
pnpm lint

# Lint and auto-fix
pnpm lint:fix
```

### Check Everything (Format + Lint + Organize Imports)
```bash
# Check everything
pnpm check

# Check and auto-fix everything
pnpm check:fix
```

## Configuration

### biome.json

The root `biome.json` configures:

**Formatting:**
- Indent: 4 spaces
- Line width: 100 characters
- Semicolons: always
- Quotes: single for JS/TS, double for JSX
- Trailing commas: ES5 style

**Linting:**
- All recommended rules enabled
- Unused variables: warn (not error)
- Exhaustive dependencies: warn
- No explicit any: off (TypeScript flexibility)

**Import Organization:**
- Automatically sorts imports alphabetically
- Groups imports by type (external → internal → relative)

## File-Specific Behavior

Biome will automatically:
- ✅ Format `.ts`, `.tsx`, `.js`, `.jsx` files
- ✅ Format `.json` and `.jsonc` files (including package.json)
- ✅ Organize imports in all TypeScript/JavaScript files
- ✅ Sort package.json dependencies alphabetically

## Ignored Files

The following are ignored (configured in `biome.json`):
- `node_modules/`
- `dist/`, `build/`
- `.next/`, `.expo/`
- Build artifacts

## Pre-commit Hooks (Optional)

To ensure all commits are formatted, you can add a pre-commit hook:

```bash
# Install husky (if not already)
pnpm add -D -w husky lint-staged

# Initialize husky
npx husky init

# Create pre-commit hook
echo "pnpm lint-staged" > .husky/pre-commit
```

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json}": ["biome check --write --no-errors-on-unmatched"]
  }
}
```

## Troubleshooting

### Biome not formatting on save?

1. Ensure the Biome extension is installed
2. Check VS Code settings: File → Preferences → Settings
3. Search for "format on save" and ensure it's enabled
4. Reload VS Code window

### Conflicts with Prettier/ESLint?

The workspace settings disable Prettier and ESLint to avoid conflicts. Biome replaces both.

### Want to format a specific file?

Right-click the file → Format Document → Choose Biome as formatter

## Migration from Prettier/ESLint

If you have existing Prettier or ESLint configs, they can be removed:
- `.prettierrc`, `.prettierignore`
- `.eslintrc`, `.eslintignore`

Biome handles everything in the single `biome.json` file.
