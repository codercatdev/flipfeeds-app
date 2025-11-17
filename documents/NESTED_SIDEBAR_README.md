# FlipFeeds Nested Sidebar Layout

This document describes the nested sidebar layout implementation for authenticated users in FlipFeeds.

## Overview

The nested sidebar layout provides a two-level navigation system:
1. **First Level (Primary Sidebar)**: User's favorite/joined Feeds
2. **Second Level (Nested Sidebar)**: Feeds that are nested within a selected Feed (placeholder for future implementation)
3. **Main Content Area**: List of Flips (videos and posts) from the selected Feed

## Architecture

### Components Created

#### 1. `components/feeds-sidebar.tsx`
The main sidebar component that displays:
- FlipFeeds branding in the header
- List of user's joined Feeds (via `NavFeeds`)
- Placeholder for nested feeds (via `NavNestedFeeds`)
- User profile in the footer (via `NavUser`)

#### 2. `components/nav-feeds.tsx`
Displays the user's feeds with real-time Firebase sync:
- Uses Firestore `onSnapshot` to listen to changes in `users/{userId}/feeds`
- Shows feed name with a star icon
- Provides dropdown menu for feed actions (View, Settings, Leave)
- Follows Firebase-first data pattern (no external state management)

#### 3. `components/nav-nested-feeds.tsx`
Placeholder component for nested feeds within a selected feed:
- Uses collapsible structure for hierarchical navigation
- Currently returns `null` when no feed is selected
- Ready to be extended with real nested feed data from Firestore

#### 4. `components/flips-list.tsx`
Displays a grid of Flips (videos/posts) for a selected feed:
- Real-time sync with Firestore `flips` collection
- Filters by `feedId` and orders by `createdAt` desc
- Shows thumbnail, title, author info, likes, and comments
- Uses Next.js `Image` component for optimized image loading
- Displays appropriate empty states

#### 5. `components/auth-layout.tsx`
Protects routes by requiring authentication:
- Redirects to `/signin` if user is not authenticated
- Shows loading state while checking auth status
- Wraps authenticated pages

#### 6. `lib/firebase.ts` (Updated)
Added Firestore exports:
- Added `getFirestore` initialization
- Exported `db` for use throughout the app

### Routes Created

#### 1. `/feeds` - `app/(authenticated)/feeds/page.tsx`
Main feeds page showing the sidebar without a selected feed:
- Protected by `AuthLayout`
- Shows "Select a Feed" message in main area
- Uses `SidebarProvider` for sidebar state management

#### 2. `/feeds/[feedId]` - `app/(authenticated)/feeds/[feedId]/page.tsx`
Individual feed page showing flips for a specific feed:
- Protected by `AuthLayout`
- Displays flips from the selected feed
- Uses URL parameter to determine which feed to show
- Includes breadcrumb navigation

## Tech Stack Compliance

✅ **Firebase-First**: All data fetching uses Firebase Firestore SDK with `onSnapshot` for real-time updates
✅ **No External State Management**: No TanStack Query or SWR - relies on Firebase SDK native caching
✅ **Named Exports**: All components use named exports
✅ **TypeScript Strict**: No `any` types used
✅ **shadcn/ui**: Uses shadcn sidebar components (sidebar-08 pattern)
✅ **Tailwind v4**: Uses CSS classes (note: Tailwind v4 CSS-first config should be in globals.css)
✅ **Biome Formatting**: All code passes `pnpm check` with no errors

## Data Flow

### Feeds Display
1. User authenticates → `useAuth` hook provides `user.uid`
2. `NavFeeds` component subscribes to `users/{userId}/feeds`
3. Firestore pushes updates in real-time via `onSnapshot`
4. Feeds render in sidebar with dropdown actions

### Flips Display
1. User navigates to `/feeds/[feedId]`
2. `FlipsList` component receives `feedId` from URL params
3. Component subscribes to `flips` collection filtered by `feedId`
4. Flips render in a responsive grid with thumbnails, metadata, and stats

## Firestore Collections Used

- `users/{userId}/feeds` - User's joined feeds (reverse lookup)
- `flips` - All flips, filtered by `feedId`

## Future Enhancements

### Nested Feeds Implementation
To implement nested feeds:
1. Update `NavNestedFeeds` to accept a selected feed ID
2. Query Firestore for feeds that reference the parent feed
3. Add feed nesting relationship to Firestore schema
4. Update sidebar to show active selection state

### Feed Selection State
Consider implementing:
- Context provider for selected feed state
- URL-based feed selection (already partially done with `[feedId]` route)
- Persistent selection in localStorage

### Enhanced Features
- Feed search and filtering
- Infinite scroll for flips
- Video player modal
- Create new flip button
- Feed creation and management UI

## Usage

### Running the App
```bash
# Start the development server
pnpm dev:web

# Or run with Firebase emulators
pnpm emulators
```

### Accessing the Layout
1. Navigate to `/signin` and authenticate
2. Go to `/feeds` to see the sidebar layout
3. Click on a feed in the sidebar to navigate to `/feeds/[feedId]`
4. View flips in the main content area

## Component Props

### `FeedsSidebar`
No props - uses `useAuth` internally

### `NavFeeds`
```typescript
interface NavFeedsProps {
  userId: string;
}
```

### `FlipsList`
```typescript
interface FlipsListProps {
  feedId?: string;
}
```

### `AuthLayout`
```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
}
```
