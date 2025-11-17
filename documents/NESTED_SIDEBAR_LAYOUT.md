# Nested Sidebar Layout - Discord/Slack Style

This implementation creates a multi-level navigation system similar to Discord or Slack for FlipFeeds.

## Layout Structure

```
┌──────┬──────────────┬─────────────────────────────┐
│ Icon │  Secondary   │                             │
│ Bar  │   Sidebar    │      Main Content Area      │
│      │              │                             │
│  🔵  │  # general   │   ┌──────────────────┐     │
│  🟢  │  # random    │   │  Flip Card       │     │
│  🟡  │  # help      │   └──────────────────┘     │
│  ➕  │              │   ┌──────────────────┐     │
│      │              │   │  Flip Card       │     │
└──────┴──────────────┴───└──────────────────┘─────┘
 72px     240px              Flexible Width
```

## Components

### 1. **FeedIconBar** (Left Column)
- **Width**: 72px fixed
- **Purpose**: Shows feed icons/avatars (like Discord servers)
- **Features**:
  - Clickable feed icons with hover effects
  - Active feed indicator (left bar)
  - Rounded square icons that become more rounded on hover
  - "+ Add Feed" button at bottom
  - Auto-selects first feed on load

### 2. **SecondarySidebar** (Middle Column)
- **Width**: ~240px (collapsible via `SidebarProvider`)
- **Purpose**: Shows nested feeds within selected feed
- **Features**:
  - Feed name header
  - List of nested feeds with # prefix
  - Settings dropdown per nested feed
  - User profile in footer

### 3. **Main Content Area** (Right Column)
- **Width**: Flexible (fills remaining space)
- **Purpose**: Displays flips from selected feed/nested feed
- **Features**:
  - Breadcrumb navigation
  - Sidebar toggle
  - Grid of flip cards

## State Management

### `useSelectedFeed` Hook
Provides global state for feed selection:

```typescript
{
  selectedFeedId: string | null;          // Top-level feed
  setSelectedFeedId: (id: string) => void;
  selectedNestedFeedId: string | null;    // Nested feed within top feed
  setSelectedNestedFeedId: (id: string) => void;
}
```

**Flow**:
1. User clicks feed icon → `selectedFeedId` updates
2. `NestedFeedsNav` queries for nested feeds with `parentFeedId == selectedFeedId`
3. User clicks nested feed → `selectedNestedFeedId` updates
4. `FlipsList` shows flips from `selectedNestedFeedId || selectedFeedId`

## Firestore Schema Extension

### Nested Feeds
To support nested feeds, add `parentFeedId` to feed documents:

```typescript
// feeds/{feedId}
{
  name: "JavaScript Feed",
  description: "All things JavaScript",
  visibility: "public",
  ownerId: "user123",
  parentFeedId: "technology_feed_id", // 👈 NEW: Reference to parent feed
  stats: { memberCount: 50, flipCount: 200 },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Query Pattern**:
```typescript
// Get nested feeds
const q = query(
  collection(db, "feeds"),
  where("parentFeedId", "==", selectedFeedId)
);
```

### Index Required
Add to `firestore.indexes.json`:
```json
{
  "collectionGroup": "feeds",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "parentFeedId", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

## Visual Design

### FeedIconBar Styling
- **Background**: `bg-sidebar` (matches sidebar theme)
- **Icons**: 48px circles in 72px containers
- **Active State**: 
  - More rounded corners (`rounded-xl`)
  - Primary background color
  - Left indicator bar (4px wide)
- **Hover State**:
  - Corners become rounder
  - Slight background color change

### SecondarySidebar Styling
- **Nested Feed Items**: Hash (#) prefix like Discord channels
- **Active Item**: Primary background with bold text
- **Settings Icon**: Shows on hover, opens dropdown menu

## User Experience

### Navigation Flow
1. **Select Top-Level Feed**: Click icon in left bar
2. **View Nested Feeds**: Secondary sidebar populates with nested feeds
3. **Select Nested Feed**: Click nested feed to view its flips
4. **Switch Feeds**: Click different icon, nested feeds update automatically

### Auto-Selection
- First feed is auto-selected on page load
- Nested feed selection clears when switching top-level feeds
- Smooth transitions between selections

## Future Enhancements

### Planned Features
1. **Drag & Drop**: Reorder feeds in icon bar
2. **Feed Categories**: Separator lines between feed groups
3. **Unread Indicators**: Badge counts on feed icons
4. **Direct Messages**: Personal/DM feeds at top of icon bar
5. **Feed Search**: Quick switcher (Cmd+K)
6. **Nested Feed Depth**: Support multiple levels of nesting

### Additional Nested Feed Features
- **Create Nested Feed**: Button in secondary sidebar
- **Move Feeds**: Drag feed to make it nested under another
- **Feed Hierarchies**: Breadcrumb showing full feed path
- **Collapsed Sections**: Collapse nested feed groups

## Integration Points

### With Existing Code
- ✅ Uses existing `FlipsList` component
- ✅ Uses existing `NavUser` component
- ✅ Uses existing `AuthLayout` wrapper
- ✅ Compatible with Firebase security rules
- ✅ Works with `useAuth` hook

### Firebase Integration
- Real-time updates via `onSnapshot`
- Automatic re-querying when selection changes
- Optimistic UI updates
- Native Firebase caching

## Accessibility

- **Keyboard Navigation**: Tab through feed icons and nested items
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Indicators**: Clear visual focus states
- **Title Attributes**: Hover text on feed icons

## Performance

- **Lazy Loading**: Only fetch nested feeds for selected feed
- **Query Optimization**: Indexed Firestore queries
- **React Optimization**: `useEffect` cleanup prevents memory leaks
- **Auto-unsubscribe**: Firestore listeners cleaned up on unmount

## Migration from Old Sidebar

### Changes
- **Removed**: `FeedsSidebar` component (old single sidebar)
- **Removed**: `NavFeeds` component (replaced by `FeedIconBar`)
- **Added**: `FeedIconBar` (icon-based feed selector)
- **Added**: `SecondarySidebar` (nested feed navigation)
- **Added**: `NestedFeedsNav` (nested feed list)
- **Added**: `useSelectedFeed` (global feed state)

### Migration Steps
1. Replace `<FeedsSidebar />` with new layout structure
2. Wrap with `<SelectedFeedProvider>`
3. Update any direct feed ID props to use context
4. Add `parentFeedId` field to feed documents (optional, nullable)

---

**Status**: ✅ Ready for use  
**Adherence**: Follows all `AGENTS.md` conventions  
**Testing**: Works with Firebase Emulators
