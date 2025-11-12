# FlipFeeds: Comprehensive Implementation Plan

**Status:** Phase 7 Implementation  
**Created:** November 11, 2025  
**Target Platforms:** ChatGPT, Claude Desktop, Gemini (future)  
**Version:** 1.0  
**Based on:** [mcpui.dev](https://mcpui.dev/)

---

## 🎯 Vision

FlipFeeds should be **fully functional** inside AI chat applications. Users should be able to:

- Browse their Feeds
- Create new Feeds
- Generate and share Flip Links
- View video feeds with AI summaries
- Search public Feeds
- Manage their profile

All through **natural language commands**, with **rich UI cards** for visual feedback.

---

## 🎯 Executive Summary

This plan integrates the FlipFeeds philosophy (Feeds, AI-first, intentional feeds) into your existing monorepo architecture with **mobile (React Native/Expo)** and **web (Next.js)** applications. We'll leverage your current Firebase Functions + Genkit setup and extend it to support the full FlipFeeds vision.

---

## 📐 Current Architecture Analysis

### ✅ What We Have

- **Monorepo Structure**: pnpm workspaces with apps/mobile, apps/web, packages/*, functions
- **Backend**: Firebase Functions with Genkit flows (generateFlip, generatePoem, youtubeThumbnail)
- **Auth**: Dual OAuth 2.1 + Firebase ID token authentication via MCP server
- **Mobile**: React Native + Expo with full Firebase SDK (@react-native-firebase/*)
- **Web**: Next.js 16 with App Router, Radix UI, Tailwind
- **Shared Packages**: firebase-config, shared-logic, ui-components
- **MCP Server**: Already implemented with OAuth auth and streaming support
- **AI-Native Ready**: MCP server can be consumed by ChatGPT, Claude, Gemini

### 🔧 What Needs Adjustment

- **Data Schema**: No Firestore collections for users, feeds, flips yet
- **Flows**: Current flows are demos; need core business logic flows
- **Tools**: Need user/feed/flip management tools
- **Security Rules**: firestore.rules needs implementation
- **Client SDKs**: Need shared logic for feed/flip CRUD in packages/shared-logic
- **UI Components**: Need Feed and Flip components in packages/ui-components
- **MCP UI Package**: Need dedicated UI components for AI chat interfaces (ChatGPT, Claude, Gemini)
- **MCP Tools Expansion**: Expose all FlipFeeds operations as MCP tools

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT PLATFORMS                                     │
├──────────────────┬─────────────────────┬──────────────────────────────────┤
│  Mobile          │  Web                │  AI Chat (NEW!)                   │
│  (React Native)  │  (Next.js)          │  (ChatGPT/Claude/Gemini)          │
├──────────────────┼─────────────────────┼──────────────────────────────────┤
│ - Video Record   │ - Video Upload      │ - Text Commands                   │
│ - Push Notifs    │ - Desktop UI        │ - MCP Tool Calls                  │
│ - Deep Links     │ - Keyboard Nav      │ - Rich Card UIs (mcpui.dev)      │
│ - Share Sheet    │ - Copy Links        │ - No Auth Required (OAuth flow)   │
│ - Camera         │ - File System       │ - Natural Language Interface      │
└──────────────────┴─────────────────────┴──────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Shared Packages   │
                    │  - firebase-config │
                    │  - shared-logic    │
                    │  - ui-components   │
                    │  - mcp-ui (NEW!)   │  ← AI-native UI components
                    └─────────┬──────────┘
                              │
            ┌─────────────────▼──────────────────┐
            │     Firebase Services              │
            ├────────────────────────────────────┤
            │  - Auth (Phone + Google)           │
            │  - Firestore (v1/users, feeds...)  │
            │  - Storage (videos, thumbnails)    │
            │  - Functions (Genkit Flows)        │
            │  - Remote Config (feature flags)   │
            │  - App Check (abuse prevention)    │
            └────────────────────────────────────┘
                              │
            ┌─────────────────▼──────────────────┐
            │   Genkit Backend (functions/)      │
            ├────────────────────────────────────┤
            │  TOOLS (Data Access)               │
            │  - getUserProfile                  │
            │  - getFeedData                     │
            │  - checkFeedMembership             │
            │  - processVideo (AI)               │
            │                                    │
            │  FLOWS (Business Logic)            │
            │  - createFeedFlow                  │
            │  - joinFeedFlow                    │
            │  - createFlipFlow                  │
            │  - generateFlipLinkFlow            │
            │                                    │
            │  MCP SERVER (Extensibility)        │
            │  - Exposes ALL tools as MCP        │
            │  - OAuth 2.1 + Firebase ID auth    │
            │  - Feed Apps platform              │
            │  - AI Chat integration             │
            └────────────────────────────────────┘
                              │
            ┌─────────────────▼──────────────────┐
            │   External AI Services             │
            ├────────────────────────────────────┤
            │  - Vertex AI / Gemini 2.0          │
            │  - Video summarization             │
            │  - Content moderation              │
            │  - Title generation                │
            └────────────────────────────────────┘
```

---

## 📱 Platform-Specific Considerations

### Mobile App (React Native/Expo)

**Core Features:**
1. **Video Recording**: Native camera with in-app recording
2. **Push Notifications**: FCM for flip notifications and feed updates
3. **Deep Linking**: Handle `flipfeeds://` URLs for Flip Links
4. **Offline Support**: Local caching with AsyncStorage
5. **Share Sheet**: Native sharing for Flip Links
6. **Biometric Auth**: Face ID / Fingerprint for quick login

**Key Flows:**
- Onboarding: Phone verification → First Feed creation → Generate Flip Link
- Record & Flip: Camera → AI title suggestion → Select Feed → Flip
- Receive Flip: Push notification → Deep link → Auto-join Feed → See content

**UI Priorities:**
- Vertical video feed (TikTok-style)
- Bottom tab navigation (Feed, Feeds, Profile)
- Camera button prominently placed
- Quick "Flip" button on each Feed

### Web App (Next.js)

**Core Features:**
1. **Video Upload**: Drag-and-drop with progress indicators
2. **Desktop Optimized**: Multi-column layouts, keyboard shortcuts
3. **Discovery Mode**: Browse public Feeds with rich search
4. **Analytics Dashboard**: For Feed owners (Pro tier)
5. **Feed Management**: Advanced admin tools

**Key Flows:**
- Onboarding: Google Sign-In → Browse public Feeds → Create first Feed
- Upload & Flip: Drag video → AI processing → Add metadata → Flip
- Feed Admin: Manage members, view analytics, configure Feed Apps

**UI Priorities:**
- Sidebar navigation (Feeds list, Discovery, Profile)
- Grid/List toggle for video feed
- Rich text editor for flips
- Flip Link generator with QR code

### AI Chat Interface (ChatGPT/Claude/Gemini) **NEW!**

**Core Features:**
1. **Natural Language Commands**: "Create a Feed about cooking", "Flip my video to my friends Feed"
2. **MCP Tool Integration**: All FlipFeeds operations exposed as tools
3. **Rich UI Cards**: Leverage mcpui.dev for embedded UIs
4. **OAuth Flow**: Seamless authentication via MCP OAuth 2.1
5. **Context Awareness**: AI understands user's Feeds and recent activity

**Key Flows:**
```
User: "Show me my Feeds"
AI: [Calls listMyFeeds tool]
    [Renders FeedListCard with thumbnails]
    "You have 3 Feeds: Family (12 members), Work Team (8 members), Book Club (5 members)"

User: "Create a new Feed for my hiking group"
AI: [Calls createFeed tool with name="Hiking Group"]
    [Renders FlipLinkCard with QR code and share URL]
    "I've created your Hiking Group Feed! Here's your Flip Link to invite members."

User: "What are the latest videos in my Family Feed?"
AI: [Calls listFeedFlips tool with feedId]
    [Renders VideoFeedCard with thumbnails and AI summaries]
    "Here are the 5 most recent videos in Family..."
```

**UI Components (mcpui.dev):**
- **FeedListCard**: Grid of Feeds with member counts
- **VideoFeedCard**: Video thumbnails with AI summaries
- **FlipLinkCard**: Shareable link + QR code
- **FlipComposerCard**: Upload video directly from chat
- **AnalyticsCard**: Feed stats for owners

**Why This Matters:**
- **Distribution**: Users already in ChatGPT/Claude > installing new app
- **Natural UX**: Talk to FlipFeeds instead of navigating menus
- **Viral Loop**: "Share this Flip Link" button in AI chat → Direct share
- **Power Users**: Advanced commands like "Find public Feeds about AI"
- **Future-Proof**: As AI chat becomes default interface, we're native there

---

### Platform Comparison Matrix

| Feature | Mobile | Web | AI Chat |
|---------|--------|-----|---------|
| **Video Capture** | ✅ Native Camera | ❌ Upload Only | ❌ Link Only |
| **Video Upload** | ✅ From Gallery | ✅ Drag & Drop | ⚠️ Via Link/Future |
| **Authentication** | Phone + Biometric | Google/Email | OAuth 2.1 Auto |
| **Flip Link Sharing** | Native Share Sheet | Copy + QR Code | Direct Link in Chat |
| **Feed Discovery** | Vertical Scroll | Grid View + Search | Natural Language Query |
| **Notifications** | Push (FCM) | Browser + Email | In-Chat Mentions |
| **Offline Mode** | ✅ Full | ⚠️ Partial | ❌ None |
| **Admin Dashboard** | ❌ Basic | ✅ Advanced | ✅ Text + Cards |
| **Feed Apps Config** | ❌ Not Available | ✅ Full UI | ⚠️ Read-Only |
| **Onboarding Time** | 2-3 minutes | 1-2 minutes | **10 seconds** |
| **Install Required** | ✅ Yes | ❌ No | ❌ No |
| **Primary Use Case** | Content Creation | Management + Discovery | Quick Actions + Browse |
| **User Persona** | Creators, Active Users | Admins, Power Users | Casual Users, Lurkers |

**Strategic Insight:** 
- **Mobile** = Creation engine (record and flip)
- **Web** = Command center (manage and analyze)
- **AI Chat** = Gateway drug (discover and join)

The AI chat interface solves the cold-start problem: Users can explore FlipFeeds, join Feeds, and see content WITHOUT installing anything. Once engaged, they'll want the mobile app for video creation.

---

## 🗂️ Firestore Schema (Production-Ready)

### Collection Structure

```
v1/
├── users/{userId}
│   ├── feeds/{feedId}  (reverse lookup)
│   ├── personalFeed/  (special: user's Personal Feed reference)
│   └── notifications/{notificationId}
├── usernames/{username}  (for username uniqueness enforcement)
├── feeds/{feedId}
│   ├── members/{userId}
│   ├── invites/{inviteId}
│   └── apps/{appId}  (Feed Apps - Pro tier)
├── flips/{flipId}
│   └── comments/{commentId}
├── flipLinks/{linkId}  (for tracking Flip Links)
└── moderation/{itemId}  (flagged content queue)
```

**Username Uniqueness Pattern:**
```typescript
// Document: v1/usernames/{username}
{
  userId: "user123",
  createdAt: serverTimestamp()
}
// This collection enforces username uniqueness.
// To claim a username, attempt to create this document.
// If it succeeds, the username is claimed.
// If it fails (document exists), the username is taken.
```

### Personal Feeds Schema

Every user gets a Personal Feed automatically created on signup:

```typescript
// Document: v1/feeds/personal_{userId}
{
  feedId: "personal_{userId}",
  name: "Personal Feed",
  type: "personal", // Special type
  ownerId: userId,
  visibility: "personal", // Never public or discoverable
  members: [userId], // Only the owner
  stats: {
    memberCount: 1,
    flipCount: 0
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}

// User's reference to their Personal Feed
// Document: v1/users/{userId}/personalFeed
{
  feedId: "personal_{userId}",
  createdAt: serverTimestamp()
}
```

### Key Indexes Required

```javascript
// Firestore Indexes (firestore.indexes.json)
[
  {
    "collectionGroup": "flips",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "feedId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "members",
    "queryScope": "COLLECTION_GROUP",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "joinedAt", "order": "DESCENDING" }
    ]
  }
]
```

---

## 🛠️ MCP Tools Specification

### Feed Management

#### `list_my_feeds`

**Description:** List all Feeds the user belongs to  
**Input:** None (uses authenticated user UID)  
**Output:**

```json
{
  "feeds": [
    {
      "id": "feed123",
      "name": "Family",
      "logoURL": "https://...",
      "memberCount": 12,
      "flipCount": 45,
      "role": "admin"
    }
  ]
}
```

**UI Card:** `FeedListCard` (grid of feeds with thumbnails)

#### `create_feed`

**Description:** Create a new Feed  
**Input:**

```json
{
  "name": "My New Feed",
  "description": "A place for...",
  "visibility": "private",
  "tags": ["tag1", "tag2"]
}
```

**Output:**

```json
{
  "feedId": "feed456",
  "flipLink": "https://flip.to/abc123",
  "qrCode": "data:image/png;base64,..."
}
```

**UI Card:** `FlipLinkCard` (shareable link + QR code)

#### `get_feed_details`

**Description:** Get detailed info about a Feed  
**Input:** `{ "feedId": "feed123" }`  
**Output:**

```json
{
  "id": "feed123",
  "name": "Family",
  "description": "Our family Feed",
  "visibility": "private",
  "ownerId": "user123",
  "memberCount": 12,
  "flipCount": 45,
  "tags": ["family"],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**UI Card:** `FeedDetailCard`

#### `join_feed`

**Description:** Join a public Feed or redeem a Flip Link  
**Input:** `{ "feedId": "feed789" }` OR `{ "flipLinkId": "link123" }`  
**Output:**

```json
{
  "success": true,
  "message": "Joined 'Cooking Tips Feed'",
  "feedId": "feed789"
}
```

---

### Flip & Feed Management

#### `list_feed_flips`

**Description:** Get recent flips from a specific Feed  
**Input:**

```json
{
  "feedId": "feed123",
  "limit": 10
}
```

**Output:**

```json
{
  "flips": [
    {
      "id": "flip123",
      "feedId": "feed123",
      "authorId": "user456",
      "authorName": "John Doe",
      "title": "My first video!",
      "aiSummary": "This video shows how to use Genkit...",
      "thumbnailURL": "https://...",
      "videoURL": "https://...",
      "createdAt": "2025-11-10T14:30:00Z",
      "stats": { "likeCount": 10, "commentCount": 3 }
    }
  ]
}
```

**UI Card:** `VideoFeedCard` (scrollable list with thumbnails and summaries)

#### `get_my_feed`

**Description:** Get aggregated feed from all user's Feeds  
**Input:** `{ "limit": 20 }`  
**Output:** Same as `list_feed_flips` but aggregated  
**UI Card:** `VideoFeedCard`

---

### Flip Links

#### `generate_flip_link`

**Description:** Generate a shareable Flip Link for inviting members  
**Input:**

```json
{
  "feedId": "feed123",
  "expiresInHours": 168,
  "singleUse": false
}
```

**Output:**

```json
{
  "linkId": "link789",
  "shortUrl": "https://flip.to/xyz789",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "deepLink": "flipfeeds://feed/link789",
  "expiresAt": "2025-11-18T10:00:00Z"
}
```

**UI Card:** `FlipLinkCard` with:
- Clickable short URL
- Embedded QR code image
- Copy button
- Expiration countdown

---

### Discovery

#### `search_public_feeds`

**Description:** Search for public Feeds by name or tags  
**Input:**

```json
{
  "query": "cooking",
  "tags": ["food", "recipes"],
  "limit": 20
}
```

**Output:**

```json
{
  "feeds": [
    {
      "id": "feed999",
      "name": "Cooking Tips",
      "description": "Learn to cook!",
      "logoURL": "https://...",
      "memberCount": 342,
      "flipCount": 1250,
      "tags": ["food", "cooking", "recipes"],
      "visibility": "public"
    }
  ]
}
```

**UI Card:** `DiscoveryGridCard`

---

### User Profile

#### `get_my_profile`

**Description:** Get the authenticated user's profile  
**Input:** None  
**Output:**

```json
{
  "uid": "user123",
  "displayName": "John Doe",
  "username": "johndoe",
  "photoURL": "https://...",
  "bio": "I love making videos!",
  "feedCount": 5,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

**UI Card:** `ProfileCard`

#### `update_my_profile`

**Description:** Update user profile  
**Input:**

```json
{
  "displayName": "Jane Doe",
  "bio": "Updated bio",
  "photoURL": "https://..."
}
```

**Output:**

```json
{
  "success": true,
  "message": "Profile updated"
}
```

---

## 🎨 MCP UI Card Components

Based on **mcpui.dev** patterns, we'll create reusable card schemas.

### FeedListCard

```typescript
{
  type: 'card',
  title: 'Your Feeds',
  content: {
    type: 'grid',
    columns: 2,
    items: [
      {
        type: 'item',
        image: 'https://...',
        title: 'Family',
        subtitle: '12 members · 45 flips',
        badge: 'Admin',
        actions: [
          { type: 'button', label: 'View', action: 'list_feed_flips feed123' },
          { type: 'button', label: 'Invite', action: 'generate_flip_link feed123' }
        ]
      }
    ]
  }
}
```

### FlipLinkCard

```typescript
{
  type: 'card',
  title: 'Flip Link Created!',
  description: 'Share this link to invite people to your Feed',
  content: {
    type: 'stack',
    items: [
      {
        type: 'image',
        src: 'data:image/png;base64,...',  // QR code
        alt: 'QR Code',
        width: 200,
        height: 200
      },
      {
        type: 'text',
        text: 'https://flip.to/xyz789',
        copyable: true,
        style: 'monospace'
      },
      {
        type: 'button',
        label: 'Copy Link',
        action: 'copy_to_clipboard https://flip.to/xyz789'
      },
      {
        type: 'text',
        text: 'Expires: Nov 18, 2025',
        style: 'caption'
      }
    ]
  }
}
```

### VideoFeedCard

```typescript
{
  type: 'card',
  title: 'Recent Videos in Family',
  content: {
    type: 'list',
    items: [
      {
        type: 'item',
        image: 'https://.../thumbnail.jpg',
        title: 'My first video!',
        subtitle: 'by John Doe · 2 hours ago',
        description: 'AI Summary: This video shows how to use Genkit...',
        badge: '10 ❤️',
        actions: [
          { type: 'button', label: 'Watch', action: 'open_url https://...' }
        ]
      }
    ]
  }
}
```

---

## 💬 Example Conversations

### Scenario 1: First-Time User

```
User: What is FlipFeeds?

AI: FlipFeeds is a video-first social network organized around "Feeds" - 
intentional content groups you join. Unlike algorithmic feeds, your feed is 
empty by default and only shows content from Feeds you explicitly join.

Would you like to:
1. Browse public Feeds
2. Create your own private Feed
3. Learn more about how it works

User: Create a private Feed for my book club

AI: [Calls create_feed tool with name="Book Club", visibility="private"]
    [Renders FlipLinkCard]

Great! I've created your "Book Club" Feed. Here's your Flip Link to invite 
members:

https://flip.to/abc123

[Shows QR code]

Anyone with this link can join your Feed. The link expires in 7 days. 
Would you like to adjust the expiration or make it single-use?
```

### Scenario 2: Power User

```
User: Show me my Feeds

AI: [Calls list_my_feeds tool]
    [Renders FeedListCard with 5 feeds]

You have 5 Feeds:
- Family (12 members, Admin)
- Work Team (8 members, Member)
- Book Club (5 members, Admin)
- Cooking Tips (342 members, Member)
- FlipFeeds Beta (1250 members, Member)

Which one would you like to explore?

User: What are the latest videos in Family?

AI: [Calls list_feed_flips tool with feedId="family123"]
    [Renders VideoFeedCard]

Here are the 5 most recent videos in your Family Feed:

1. "Trip to the beach" by Mom (3 hours ago)
   AI Summary: Beach vacation with sunset shots and kids playing...
   10 likes, 3 comments

2. "Dad's new BBQ" by Dad (yesterday)
   AI Summary: Demonstration of new grill features...
   5 likes, 1 comment

[More videos...]

Would you like to watch any of these?

User: Generate a Flip Link for my Book Club

AI: [Calls generate_flip_link tool]
    [Renders FlipLinkCard]

Here's your Flip Link for Book Club:
https://flip.to/xyz789
[QR code shown]

This link will work for 7 days and can be used unlimited times. 
Want to change that?
```

### Scenario 3: Discovery

```
User: Find public Feeds about AI and technology

AI: [Calls search_public_feeds with query="AI technology"]
    [Renders DiscoveryGridCard]

I found 15 public Feeds about AI and technology:

1. AI Enthusiasts (2.3K members)
   "Discussing the latest in artificial intelligence"
   Tags: AI, ML, tech

2. Genkit Developers (450 members)
   "Building AI-first apps with Firebase Genkit"
   Tags: genkit, firebase, AI

3. Tech News Daily (5.1K members)
   "Daily curated tech news videos"
   Tags: tech, news, innovation

Would you like to join any of these? Just say "join [feed name]"

User: Join Genkit Developers

AI: [Calls join_feed tool]

Perfect! You've joined "Genkit Developers" Feed. You'll now see their 
flips in your main feed. Want to see the latest flips from this Feed?
```

---

## 🔐 OAuth Flow

### Initial Setup (One-Time)

```
User: (First time using FlipFeeds in ChatGPT)

AI: To access FlipFeeds, I need to connect to your account.

[Displays OAuth authorization URL]

Please click this link to authorize:
https://us-central1-PROJECT.cloudfunctions.net/mcpAuthServer/authorize?...

After authorizing, you'll be redirected back here and I'll have access to 
your FlipFeeds account.

User: [Clicks link, completes OAuth flow]

AI: ✅ Connected! I can now access your FlipFeeds account.

What would you like to do?
- View your Feeds
- Create a new Feed
- Browse public Feeds
- Generate a Flip Link
```

### Subsequent Uses

```
User: Show me my Feeds

AI: [Uses stored access token automatically]
    [Calls list_my_feeds]
    
[Works seamlessly without re-auth]
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up core data models and basic CRUD operations

#### 1.1 Backend - Genkit Tools

📂 Location: `functions/src/tools/`

Create:
- `userTools.ts` - getUserProfile, updateUserProfile, getUserFeeds
- `feedTools.ts` - getFeedData, checkFeedMembership, listPublicFeeds
- `flipTools.ts` - getFlip, listFeedFlips, deleteFlip
- `videoTools.ts` - processVideo (AI summarization + moderation)

#### 1.2 Backend - Genkit Flows

📂 Location: `functions/src/flows/`

Create:
- `userFlows.ts` - createUserFlow (on signup)
- `feedFlows.ts` - createFeedFlow, joinFeedFlow, leaveFeedFlow
- `flipFlows.ts` - createFlipFlow (with AI processing)
- `flipLinkFlows.ts` - generateFlipLinkFlow, redeemFlipLinkFlow

#### 1.3 Shared Logic Package

📂 Location: `packages/shared-logic/src/`

Create:
- `hooks/useAuth.ts` - Unified auth hook for both platforms
- `hooks/useFeeds.ts` - Feed CRUD operations
- `hooks/useFlips.ts` - Flip CRUD operations
- `services/api.ts` - Genkit flow callers
- `types/index.ts` - Shared TypeScript types

#### 1.4 Security Rules

📂 Location: `firestore.rules`

Implement the rules from `firestore.md`:
- User can only edit their own profile
- Feed member checks for flip visibility
- Public vs private Feed logic

**Deliverable:** Users can sign up, create Feeds, and basic flips work

---

### Phase 2: AI-First Features (Week 3-4)

**Goal:** Implement the "magic" that differentiates FlipFeeds

#### 2.1 Video Processing Flow

📂 Location: `functions/src/flows/videoProcessing.ts`

```typescript
// Enhanced version of genkit-3-setup.md
export const processVideoFlow = ai.defineFlow({
  name: 'processVideoFlow',
  inputSchema: z.object({
    gcsUri: z.string(),
    feedId: z.string(),
    authorId: z.string(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    suggestedTitle: z.string(),
    tags: z.array(z.string()),
    moderation: z.object({
      isSafe: z.boolean(),
      flags: z.array(z.string()),
    }),
  }),
}, async ({ gcsUri, feedId, authorId }) => {
  // 1. Video summarization
  // 2. Title generation
  // 3. Auto-tagging
  // 4. Content moderation
  // 5. Store in Firestore v1/flips/{flipId}
});
```

#### 2.2 AI Prompts Library

📂 Location: `functions/src/prompts/`

Create:
- `videoPrompts.ts` - summarizeVideo, moderateVideo, suggestTitle
- `feedPrompts.ts` - suggestFeedName, generateWelcomeMessage
- `contentPrompts.ts` - generateFlipMessage (for the "Yo" experience)

#### 2.3 Client Integration

Update `packages/shared-logic/src/hooks/useFlips.ts`:

```typescript
export function useCreateFlip() {
  const [aiSuggestions, setAiSuggestions] = useState(null);
  
  const uploadVideo = async (videoUri: string, feedId: string) => {
    // 1. Upload to Storage
    // 2. Call processVideoFlow
    // 3. Return AI suggestions to UI
    // 4. User can edit or accept
  };
}
```

**Deliverable:** Video uploads get AI summaries, titles, and moderation

---

### Phase 3: The Flip Link (Viral Loop) (Week 5)

**Goal:** Implement the core growth mechanic

#### 3.1 Flip Link Generation

📂 Location: `functions/src/flows/flipLinkFlows.ts`

```typescript
export const generateFlipLinkFlow = ai.defineFlow({
  name: 'generateFlipLink',
  inputSchema: z.object({
    feedId: z.string(),
    userId: z.string(),
    expiresInHours: z.number().default(168), // 7 days
    singleUse: z.boolean().default(false),
  }),
  outputSchema: z.object({
    linkId: z.string(),
    shortUrl: z.string(),
    qrCode: z.string(), // Base64 QR code image
    deepLink: z.string(), // flipfeeds://feed/{linkId}
  }),
}, async (input) => {
  // 1. Create record in v1/flipLinks/{linkId}
  // 2. Generate short URL (Firebase Dynamic Links or custom)
  // 3. Generate QR code
  // 4. Return data
});
```

#### 3.2 Deep Link Handling

**Mobile** (`apps/mobile/app/_layout.tsx`):

```typescript
// React Navigation linking config
const linking = {
  prefixes: ['flipfeeds://', 'https://flipfeeds.app'],
  config: {
    screens: {
      FeedInvite: 'feed/:linkId',
    },
  },
};
```

**Web** (`apps/web/app/feed/[linkId]/page.tsx`):

```typescript
// Next.js dynamic route
export default async function FlipLinkPage({ params }: { params: { linkId: string } }) {
  // 1. Verify link validity
  // 2. Check if user is authenticated
  // 3. Auto-join Feed
  // 4. Redirect to Feed
}
```

#### 3.3 Onboarding Flow

**Mobile-First Flow:**
1. User installs app
2. Phone verification
3. "Create Your First Feed" prompt
4. **Big "Flip Your Friends" button**
5. Generate Flip Link → Native share sheet
6. Friend taps link → Deep link → Auto-install if needed → Join Feed

**Web-First Flow:**
1. User signs in with Google
2. "Browse Public Feeds" or "Create Private Feed"
3. Generate Flip Link → Copy + QR code
4. Friend visits link → Sign in → Join Feed

**Deliverable:** Flip Links work end-to-end, growth loop is functional

---

### Phase 4: Discovery & Social Features (Week 6-7)

**Goal:** Allow users to find public Feeds and engage

#### 4.1 Discovery Flow

📂 Location: `functions/src/flows/discoveryFlows.ts`

```typescript
export const searchPublicFeedsFlow = ai.defineFlow({
  name: 'searchPublicFeeds',
  inputSchema: z.object({
    query: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().default(20),
  }),
  outputSchema: z.object({
    feeds: z.array(FeedSchema),
  }),
}, async ({ query, tags, limit }) => {
  // Firestore query with Algolia or native search
});
```

#### 4.2 UI Components

📂 Location: `packages/ui-components/src/`

Create platform-agnostic components:
- `FeedCard` - Display feed preview
- `FlipCard` - Video flip with AI summary
- `FlipButton` - Generate Flip Link
- `DiscoveryFeed` - Grid of public Feeds

#### 4.3 Engagement Features

- Like/Comment on flips
- Feed member list
- User profiles with bio
- Follow users (optional, not required for MVP)

**Deliverable:** Users can discover and join public Feeds

---

### Phase 5: Monetization & Feed Apps (Week 8-10)

**Goal:** Enable Pro tier and extensible Feed Apps

#### 5.1 Subscription Flow

Use **Firebase Extensions** for Stripe integration:
- Install `firestore-stripe-payments` extension
- Create Pro tier ($10/mo)
- Gate Feed Apps behind Pro tier

#### 5.2 Feed Apps Platform

📂 Location: `functions/src/flows/feedAppsFlows.ts`

```typescript
export const registerFeedAppFlow = ai.defineFlow({
  name: 'registerFeedApp',
  inputSchema: z.object({
    feedId: z.string(),
    appName: z.string(),
    triggerCommand: z.string(), // e.g., "/summarize"
    mcpEndpoint: z.string(),
    apiKey: z.string(),
  }),
  outputSchema: z.object({
    appId: z.string(),
    success: z.boolean(),
  }),
}, async (input) => {
  // 1. Verify user is Feed owner
  // 2. Verify Pro tier subscription
  // 3. Store in v1/feeds/{feedId}/apps/{appId}
  // 4. Set up trigger webhook
});
```

#### 5.3 Sandbox Execution

When a flip triggers a Feed App:
1. Call the registered MCP endpoint
2. Pass only the flip data (not full Feed access)
3. Run response through AI moderation
4. Flip result if safe

**Deliverable:** Pro users can add custom AI bots to their Feeds

---

### Phase 6: Abuse Prevention (Week 11)

**Goal:** Implement security measures from business_plan.md

#### 6.1 Phone Verification

**Mobile**: Use Firebase Auth Phone
**Web**: Use Firebase Auth Phone (requires SMS provider)

#### 6.2 Content Moderation

Already in Phase 2, but enhance:
- Auto-flag content with high toxicity scores
- Create moderation queue for Feed admins
- Global ban system (blacklist phone numbers)

#### 6.3 Rate Limiting

Use Firebase App Check + Cloud Armor:
- Limit Flip Link creation (10 per day for free tier)
- Limit flip uploads (20 per day for free tier)
- Limit Feed App API calls (1000 per day)

**Deliverable:** Platform is resilient to abuse

---

### Phase 7: AI Chat Interface (Week 12-13) **NEW!**

**Goal:** Make FlipFeeds fully accessible inside ChatGPT, Claude, and Gemini

#### 7.1 MCP Tools Expansion

📂 Location: `functions/src/mcpServer.ts`

Expose ALL FlipFeeds operations as MCP tools:

```typescript
// Existing tools in mcpServer.ts
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Feed Management
      {
        name: 'list_my_feeds',
        description: 'List all Feeds the authenticated user belongs to',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_feed',
        description: 'Create a new Feed (public or private)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Feed name' },
            description: { type: 'string' },
            visibility: { type: 'string', enum: ['public', 'private'] },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'visibility'],
        },
      },
      {
        name: 'join_feed',
        description: 'Join a public Feed or redeem a Flip Link',
        inputSchema: {
          type: 'object',
          properties: {
            feedId: { type: 'string' },
            flipLinkId: { type: 'string' },
          },
        },
      },
      {
        name: 'get_feed_details',
        description: 'Get detailed information about a specific Feed',
        inputSchema: {
          type: 'object',
          properties: { feedId: { type: 'string' } },
          required: ['feedId'],
        },
      },
      // Flip Management
      {
        name: 'list_feed_flips',
        description: 'Get recent flips from a Feed',
        inputSchema: {
          type: 'object',
          properties: {
            feedId: { type: 'string' },
            limit: { type: 'number', default: 10 },
          },
          required: ['feedId'],
        },
      },
      {
        name: 'get_my_feed',
        description: 'Get aggregated feed from all user\'s Feeds',
        inputSchema: {
          type: 'object',
          properties: { limit: { type: 'number', default: 20 } },
        },
      },
      // Flip Links
      {
        name: 'generate_flip_link',
        description: 'Generate a shareable Flip Link for a Feed',
        inputSchema: {
          type: 'object',
          properties: {
            feedId: { type: 'string' },
            expiresInHours: { type: 'number', default: 168 },
            singleUse: { type: 'boolean', default: false },
          },
          required: ['feedId'],
        },
      },
      // Discovery
      {
        name: 'search_public_feeds',
        description: 'Search for public Feeds by name or tags',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', default: 20 },
          },
        },
      },
      // User Profile
      {
        name: 'get_my_profile',
        description: 'Get the authenticated user\'s profile',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_my_profile',
        description: 'Update user profile (displayName, bio, avatar)',
        inputSchema: {
          type: 'object',
          properties: {
            displayName: { type: 'string' },
            bio: { type: 'string' },
            photoURL: { type: 'string' },
          },
        },
      },
    ],
  };
});
```

#### 7.2 MCP UI Package

📂 Location: `packages/mcp-ui/`

Create a new package for AI chat UI components using **mcpui.dev** patterns:

```bash
pnpm create package mcp-ui
```

**Package Structure:**
```
packages/mcp-ui/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── components/
    │   ├── FeedListCard.tsx
    │   ├── VideoFeedCard.tsx
    │   ├── FlipLinkCard.tsx
    │   ├── FlipComposerCard.tsx
    │   └── AnalyticsCard.tsx
    ├── schemas/
    │   └── mcp-ui-schemas.ts  # Define MCP UI card schemas
    └── utils/
        └── format-for-ai.ts   # Format data for AI chat display
```

**Example Component (FeedListCard.tsx):**
```typescript
import { z } from 'zod';

// MCP UI Schema for Feed List
export const FeedListCardSchema = z.object({
  type: z.literal('feed_list'),
  feeds: z.array(z.object({
    id: z.string(),
    name: z.string(),
    logoURL: z.string(),
    memberCount: z.number(),
    flipCount: z.number(),
    role: z.enum(['admin', 'moderator', 'member']),
  })),
});

// Render function for AI chat
export function renderFeedListCard(feeds: Feed[]): MCPUICard {
  return {
    type: 'card',
    title: 'Your Feeds',
    content: {
      type: 'grid',
      items: feeds.map(feed => ({
        type: 'item',
        image: feed.logoURL,
        title: feed.name,
        subtitle: `${feed.memberCount} members · ${feed.flipCount} flips`,
        badge: feed.role === 'admin' ? 'Admin' : null,
        actions: [
          {
            type: 'button',
            label: 'View',
            action: `list_feed_flips ${feed.id}`,
          },
          {
            type: 'button',
            label: 'Invite',
            action: `generate_flip_link ${feed.id}`,
          },
        ],
      })),
    },
  };
}
```

#### 7.3 Update MCP Server to Return UI Cards

📂 Location: `functions/src/mcpServer.ts`

Modify tool responses to include mcpui.dev card data:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'list_my_feeds': {
      const feeds = await listMyFeedsFlow({ uid });
      
      // Return both raw data AND UI card
      return {
        content: [
          {
            type: 'text',
            text: `You have ${feeds.length} Feeds.`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'flipfeeds://feeds/list',
              mimeType: 'application/vnd.flipfeeds.feed-list+json',
              text: JSON.stringify(renderFeedListCard(feeds)),
            },
          },
        ],
      };
    }
    
    case 'generate_flip_link': {
      const result = await generateFlipLinkFlow({
        uid,
        feedId: args.feedId,
        expiresInHours: args.expiresInHours,
        singleUse: args.singleUse,
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Flip Link created! Share this link: ${result.shortUrl}`,
          },
          {
            type: 'resource',
            resource: {
              uri: `flipfeeds://fliplink/${result.linkId}`,
              mimeType: 'application/vnd.flipfeeds.flip-link+json',
              text: JSON.stringify({
                type: 'flip_link_card',
                linkId: result.linkId,
                shortUrl: result.shortUrl,
                qrCode: result.qrCode,  // Base64 image
                deepLink: result.deepLink,
                expiresAt: result.expiresAt,
              }),
            },
          },
        ],
      };
    }
    
    // ... more tools
  }
});
```

#### 7.4 Test AI Chat Integration

**ChatGPT Integration:**
1. Add MCP server to ChatGPT desktop app
2. Test OAuth flow
3. Test natural language commands
4. Verify UI cards render correctly

**Claude Desktop Integration:**
1. Add to `claude_desktop_config.json`
2. Test tool discovery
3. Test rich UI rendering

**Gemini Integration:**
1. Wait for MCP support (coming soon)
2. Prepare server for Gemini-specific features

#### 7.5 Documentation

📂 Location: `documents/AI_CHAT_GUIDE.md`

Create user guide:
- How to connect FlipFeeds to ChatGPT
- Example commands
- Available tools
- Troubleshooting OAuth

**Deliverable:** Full FlipFeeds experience in AI chat apps

---

## 🔧 Technical Implementation Details

### File Structure

```
flipfeeds-app/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in.tsx
│   │   │   │   └── phone-verify.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── feed.tsx
│   │   │   │   ├── feeds.tsx
│   │   │   │   ├── discovery.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── feed/
│   │   │   │   └── [linkId].tsx  (Deep link handler)
│   │   │   ├── _layout.tsx
│   │   │   └── modal.tsx
│   │   └── components/
│   │       ├── VideoRecorder.tsx
│   │       ├── FlipButton.tsx
│   │       └── FeedView.tsx
│   └── web/
│       ├── app/
│       │   ├── (auth)/
│       │   │   └── sign-in/
│       │   ├── dashboard/
│       │   │   ├── feed/
│       │   │   ├── feeds/
│       │   │   ├── discovery/
│       │   │   └── profile/
│       │   ├── feed/
│       │   │   └── [linkId]/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       └── components/
│           ├── VideoUploader.tsx
│           ├── FlipLinkGenerator.tsx
│           └── FeedGrid.tsx
├── functions/
│   └── src/
│       ├── tools/
│       │   ├── userTools.ts
│       │   ├── feedTools.ts
│       │   ├── flipTools.ts
│       │   └── videoTools.ts
│       ├── flows/
│       │   ├── userFlows.ts
│       │   ├── feedFlows.ts
│       │   ├── flipFlows.ts
│       │   ├── flipLinkFlows.ts
│       │   ├── videoProcessing.ts
│       │   └── discoveryFlows.ts
│       ├── prompts/
│       │   ├── videoPrompts.ts
│       │   ├── feedPrompts.ts
│       │   └── contentPrompts.ts
│       ├── index.ts
│       ├── genkit.ts
│       └── mcpServer.ts  (Already exists - enhance for AI chat)
└── packages/
    ├── shared-logic/
    │   └── src/
    │       ├── hooks/
    │       │   ├── useAuth.ts
    │       │   ├── useFeeds.ts
    │       │   ├── useFlips.ts
    │       │   └── useFlipLinks.ts
    │       ├── services/
    │       │   ├── api.ts
    │       │   └── storage.ts
    │       └── types/
    │           ├── User.ts
    │           ├── Feed.ts
    │           ├── Flip.ts
    │           └── FlipLink.ts
    ├── ui-components/
    │   └── src/
    │       ├── FeedCard.tsx
    │       ├── FlipCard.tsx
    │       ├── FlipButton.tsx
    │       └── DiscoveryFeed.tsx
    └── mcp-ui/  ← NEW! AI Chat UI Package
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── components/
            │   ├── FeedListCard.tsx
            │   ├── VideoFeedCard.tsx
            │   ├── FlipLinkCard.tsx
            │   ├── FlipComposerCard.tsx
            │   └── AnalyticsCard.tsx
            ├── schemas/
            │   └── mcp-ui-schemas.ts
            └── utils/
                └── format-for-ai.ts
```

---

## 🚀 Development Workflow

### Local Development

```bash
# Terminal 1: Start Firebase Emulators
pnpm emulators

# Terminal 2: Watch Genkit Functions
cd functions && pnpm build:watch

# Terminal 3: Mobile Dev
pnpm dev:mobile

# Terminal 4: Web Dev
pnpm dev:web
```

### Testing Strategy

1. **Unit Tests**: Tools and utilities
2. **Integration Tests**: Flows with emulator
3. **E2E Tests**: Flip Link flow (mobile → web)
4. **Security Rules Tests**: firestore-rules-unit-testing

### Deployment

```bash
# Deploy functions only
pnpm deploy:functions

# Deploy everything
pnpm deploy:all
```

---

## 📊 Success Metrics

### Phase 1-2 (MVP)

- Users can create Feeds ✅
- Users can flip videos ✅
- AI summaries work ✅

### Phase 3 (Growth)

- Flip Link redemption rate > 40%
- Average Feeds per user > 2
- Daily active users growing

### Phase 4-5 (Monetization)

- Pro tier conversion > 5%
- Feed Apps usage > 20% of Pro users
- Revenue > $1000/month

### Phase 6 (Security)

- Content moderation accuracy > 95%
- Abuse reports < 1% of flips
- Zero CSAM incidents

### Phase 7 (AI Chat) **NEW!**

- **MCP Tool Calls**: > 1000 tool invocations per day
- **AI Chat User Retention**: > 60% weekly retention
- **Cross-Platform Users**: > 30% use both mobile/web AND AI chat
- **Flip Link Generation via AI**: > 20% of all Flip Links created via ChatGPT/Claude
- **Natural Language Success Rate**: > 85% of commands understood correctly
- **OAuth Completion Rate**: > 70% of users complete OAuth flow

**Key Insight**: AI chat users may have HIGHER engagement than app users because:
- Lower friction (no app install required)
- Natural language is easier than UI navigation
- AI can proactively suggest actions ("Want to share this with your Feed?")
- Users already in ChatGPT/Claude daily

---

## 🎯 Next Steps

1. **Review this plan** - Confirm alignment with vision
2. **Set up dev environment** - Ensure emulators work
3. **Start Phase 1** - Create first tool (userTools.ts)
4. **Iterate** - Build one flow at a time, test, deploy

---

**Ready to start building?** Let's begin with Phase 1.1 - creating the user tools! 🚀
