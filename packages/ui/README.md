# @flip-feeds/ui

Shared UI component library for FlipFeeds using [shadcn/ui](https://ui.shadcn.com).

## Overview

This package contains reusable UI components built with:
- **shadcn/ui** - Component collection
- **Tailwind CSS v4** - Styling
- **Radix UI** - Unstyled accessible components
- **class-variance-authority** - Component variants
- **React 19** - Framework

## Structure

```
packages/ui/
├── src/
│   ├── components/     # shadcn/ui components
│   │   └── button.tsx
│   ├── lib/            # Utilities
│   │   └── utils.ts    # cn() helper
│   ├── hooks/          # Shared hooks
│   └── styles/         # Global styles
│       └── globals.css # Tailwind theme
├── components.json     # shadcn/ui config
├── package.json
└── tsconfig.json
```

## Usage in Web App

### 1. Import Components

```tsx
import { Button } from "@workspace/ui/components/button";

export default function MyPage() {
  return <Button>Click me</Button>;
}
```

### 2. Import Utilities

```tsx
import { cn } from "@workspace/ui/lib/utils";

const className = cn("base-class", conditionalClass && "conditional-class");
```

### 3. Import Hooks (when added)

```tsx
import { useCustomHook } from "@workspace/ui/hooks/use-custom-hook";
```

## Adding New Components

From the **web app directory** (`apps/web`), run:

```bash
cd apps/web
pnpm dlx shadcn@latest add [component-name]
```

The CLI will automatically:
1. ✅ Install the component to `packages/ui/src/components/`
2. ✅ Add required dependencies to `packages/ui/package.json`
3. ✅ Configure proper import paths

### Examples

```bash
# Add individual components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add card

# Add multiple components
pnpm dlx shadcn@latest add button input card dialog
```

### Available Components

See the full list at: https://ui.shadcn.com/docs/components

Popular components:
- `button` - Button with variants
- `input` - Form input
- `card` - Card container
- `dialog` - Modal dialog
- `dropdown-menu` - Dropdown menu
- `form` - Form with validation
- `table` - Data table
- `toast` - Notifications
- `tabs` - Tab navigation

## Configuration

### components.json (packages/ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@workspace/ui/components",
    "utils": "@workspace/ui/lib/utils",
    "hooks": "@workspace/ui/hooks",
    "lib": "@workspace/ui/lib",
    "ui": "@workspace/ui/components"
  }
}
```

### components.json (apps/web)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@workspace/ui/lib/utils",
    "ui": "@workspace/ui/components"
  }
}
```

## Customization

### Theming

Edit `src/styles/globals.css` to customize the theme:

```css
@theme {
  --color-primary: 240 5.9% 10%;
  --color-primary-foreground: 0 0% 98%;
  /* ... other colors */
}
```

### Component Variants

Components use `class-variance-authority` for variants:

```tsx
import { Button } from "@workspace/ui/components/button";

// Different variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔥</Button>
```

## Development

### Type Checking

```bash
cd packages/ui
pnpm typecheck
```

### Adding Custom Components

1. Create component in `src/components/`
2. Export from component file
3. Import in web app using `@workspace/ui/components/[name]`

Example custom component:

```tsx
// packages/ui/src/components/custom-card.tsx
import { cn } from "@workspace/ui/lib/utils";

export function CustomCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("rounded-lg border bg-card p-6", className)} 
      {...props} 
    />
  );
}

// Usage in apps/web
import { CustomCard } from "@workspace/ui/components/custom-card";
```

## Best Practices

### ✅ Do

- Use `@workspace/ui/components/*` for component imports
- Use `@workspace/ui/lib/utils` for the `cn()` utility
- Add components via shadcn CLI for consistency
- Keep custom components in this package for reusability

### ❌ Don't

- Don't copy components directly to apps/web
- Don't duplicate component code
- Don't install shadcn components outside of this monorepo setup

## Troubleshooting

### Components not found

Ensure TypeScript paths are configured in `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@workspace/ui/components/*": ["../../packages/ui/src/components/*"],
      "@workspace/ui/lib/*": ["../../packages/ui/src/lib/*"],
      "@workspace/ui/hooks/*": ["../../packages/ui/src/hooks/*"]
    }
  }
}
```

### Styles not applied

Verify `apps/web/app/globals.css` imports the UI package styles:

```css
@import "tailwindcss";
@import "../../../packages/ui/src/styles/globals.css";
```

### Dependencies missing

Run `pnpm install` from the monorepo root after adding new components.

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [shadcn/ui Monorepo Guide](https://ui.shadcn.com/docs/monorepo)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [class-variance-authority](https://cva.style/docs)
