# FlipFeeds: Comprehensive Implementation Plan


**Status:** Phase 7 Implementation  **Created:** November 11, 2025  

**Target Platforms:** ChatGPT, Claude Desktop, Gemini (future)  **Status:** Draft  

**Based on:** [mcpui.dev](https://mcpui.dev/)**Version:** 1.0



------



## 🎯 Vision## 🎯 Executive Summary



FlipFeeds should be **fully functional** inside AI chat applications. Users should be able to:This plan integrates the FlipFeeds philosophy (Feeds, AI-first, intentional feeds) into your existing monorepo architecture with **mobile (React Native/Expo)** and **web (Next.js)** applications. We'll leverage your current Firebase Functions + Genkit setup and extend it to support the full FlipFeeds vision.

- Browse their Feeds

- Create new Feeds---

- Generate and share Flip Links

- View video feeds with AI summaries## 📐 Current Architecture Analysis

- Search public Feeds

- Manage their profile### ✅ What We Have

- **Monorepo Structure**: pnpm workspaces with apps/mobile, apps/web, packages/*, functions

All through **natural language commands**, with **rich UI cards** for visual feedback.- **Backend**: Firebase Functions with Genkit flows (generateFlip, generatePoem, youtubeThumbnail)

- **Auth**: Dual OAuth 2.1 + Firebase ID token authentication via MCP server

---- **Mobile**: React Native + Expo with full Firebase SDK (@react-native-firebase/*)

- **Web**: Next.js 16 with App Router, Radix UI, Tailwind

## 🏗️ Architecture- **Shared Packages**: firebase-config, shared-logic, ui-components

- **MCP Server**: Already implemented with OAuth auth and streaming support

```- **AI-Native Ready**: MCP server can be consumed by ChatGPT, Claude, Gemini

┌─────────────────────────────────────────────────┐

│  ChatGPT / Claude Desktop / Gemini              │### 🔧 What Needs Adjustment

│  ┌───────────────────────────────────────────┐  │- **Data Schema**: No Firestore collections for users, feeds, flips yet

│  │  User: "Show me my Feeds"                 │  │- **Flows**: Current flows are demos; need core business logic flows

│  └───────────────────────────────────────────┘  │- **Tools**: Need user/feed/flip management tools

│                     │                            │- **Security Rules**: firestore.rules needs implementation

│                     │ MCP Protocol               │- **Client SDKs**: Need shared logic for feed/flip CRUD in packages/shared-logic

│                     ▼                            │- **UI Components**: Need Feed and Flip components in packages/ui-components

│  ┌───────────────────────────────────────────┐  │- **MCP UI Package**: Need dedicated UI components for AI chat interfaces (ChatGPT, Claude, Gemini)

│  │  AI Model (GPT-4, Claude 3.5, Gemini)    │  │- **MCP Tools Expansion**: Expose all FlipFeeds operations as MCP tools

│  │  - Understands intent                     │  │

│  │  - Selects MCP tool: "list_my_feeds"   │  │---

│  └───────────────────────────────────────────┘  │

│                     │                            │## 🏗️ Architecture Overview

└─────────────────────┼────────────────────────────┘

                      │ HTTPS + OAuth 2.1```

                      ▼┌─────────────────────────────────────────────────────────────────────────────┐

┌─────────────────────────────────────────────────┐│                         CLIENT PLATFORMS                                     │

│  FlipFeeds MCP Server (Firebase Functions)      │├──────────────────┬─────────────────────┬──────────────────────────────────┤

│  https://us-central1-PROJECT.cloudfunctions.net ││  Mobile          │  Web                │  AI Chat (NEW!)                   │

│                  /mcpServer                      ││  (React Native)  │  (Next.js)          │  (ChatGPT/Claude/Gemini)          │

│                                                  │├──────────────────┼─────────────────────┼──────────────────────────────────┤

│  ┌────────────────────────────────────────────┐ ││ - Video Record   │ - Video Upload      │ - Text Commands                   │

│  │  OAuth Middleware                          │ ││ - Push Notifs    │ - Desktop UI        │ - MCP Tool Calls                  │

│  │  - Verify access token (JWT)              │ ││ - Deep Links     │ - Keyboard Nav      │ - Rich Card UIs (mcpui.dev)      │

│  │  - Extract user UID                       │ ││ - Share Sheet    │ - Copy Links        │ - No Auth Required (OAuth flow)   │

│  └────────────────────────────────────────────┘ ││ - Camera         │ - File System       │ - Natural Language Interface      │

│                     │                            │└──────────────────┴─────────────────────┴──────────────────────────────────┘

│  ┌────────────────────────────────────────────┐ │                              │

│  │  MCP Tool Handler                          │ │                    ┌─────────▼──────────┐

│  │  - Call Genkit Flow                       │ │                    │  Shared Packages   │

│  │  - Format response as MCP UI card         │ │                    │  - firebase-config │

│  └────────────────────────────────────────────┘ │                    │  - shared-logic    │

│                     │                            │                    │  - ui-components   │

└─────────────────────┼────────────────────────────┘                    │  - mcp-ui (NEW!)   │  ← AI-native UI components

                      │                    └─────────┬──────────┘

                      ▼                              │

          ┌───────────────────────┐            ┌─────────────────▼──────────────────┐

          │  Firestore Database   │            │     Firebase Services              │

          │  - v1/users           │            ├────────────────────────────────────┤

          │  - v1/feeds           │            │  - Auth (Phone + Google)           │

          │  - v1/flips           │            │  - Firestore (v1/users, feeds...)  │

          └───────────────────────┘            │  - Storage (videos, thumbnails)    │

```            │  - Functions (Genkit Flows)        │

            │  - Remote Config (feature flags)   │

---            │  - App Check (abuse prevention)    │

            └────────────────────────────────────┘

## 🛠️ MCP Tools Specification                              │

            ┌─────────────────▼──────────────────┐

### Feed Management            │   Genkit Backend (functions/)      │

            ├────────────────────────────────────┤

#### `list_my_feeds`            │  TOOLS (Data Access)               │

**Description:** List all Feeds the user belongs to              │  - getUserProfile                  │

**Input:** None (uses authenticated user UID)              │  - getFeedData                   │

**Output:**            │  - checkFeedMembership           │

```json            │  - processVideo (AI)               │

{            │                                    │

  "feeds": [            │  FLOWS (Business Logic)            │

    {            │  - createFeedFlow                │

      "id": "feed123",            │  - joinFeedFlow                  │

      "name": "Family",            │  - createFlipFlow                │

      "logoURL": "https://...",            │  - generateFlipLinkFlow            │

      "memberCount": 12,            │                                    │

      "flipCount": 45,            │  MCP SERVER (Extensibility)        │

      "role": "admin"            │  - Exposes ALL tools as MCP        │

    }            │  - OAuth 2.1 + Firebase ID auth    │

  ]            │  - Feed Apps platform            │

}            │  - AI Chat integration             │

```            └────────────────────────────────────┘

**UI Card:** `FeedListCard` (grid of feeds with thumbnails)                              │

            ┌─────────────────▼──────────────────┐

#### `create_feed`            │   External AI Services             │

**Description:** Create a new Feed              ├────────────────────────────────────┤

**Input:**            │  - Vertex AI / Gemini 2.0          │

```json            │  - Video summarization             │

{            │  - Content moderation              │

  "name": "My New Feed",            │  - Title generation                │

  "description": "A place for...",            └────────────────────────────────────┘

  "visibility": "private",```

  "tags": ["tag1", "tag2"]

}---

```

**Output:**## 📱 Platform-Specific Considerations

```json

{### Mobile App (React Native/Expo)

  "feedId": "feed456",**Core Features:**

  "flipLink": "https://flip.to/abc123",1. **Video Recording**: Native camera with in-app recording

  "qrCode": "data:image/png;base64,..."2. **Push Notifications**: FCM for flip notifications and feed updates

}3. **Deep Linking**: Handle `flipfeeds://` URLs for Flip Links

```4. **Offline Support**: Local caching with AsyncStorage

**UI Card:** `FlipLinkCard` (shareable link + QR code)5. **Share Sheet**: Native sharing for Flip Links

6. **Biometric Auth**: Face ID / Fingerprint for quick login

#### `get_feed_details`

**Description:** Get detailed info about a Feed  **Key Flows:**

**Input:** `{ "feedId": "feed123" }`  - Onboarding: Phone verification → First Feed creation → Generate Flip Link

**Output:**- Record & Flip: Camera → AI title suggestion → Select Feed → Flip

```json- Receive Flip: Push notification → Deep link → Auto-join Feed → See content

{

  "id": "feed123",**UI Priorities:**

  "name": "Family",- Vertical video feed (TikTok-style)

  "description": "Our family Feed",- Bottom tab navigation (Feed, Feeds, Profile)

  "visibility": "private",- Camera button prominently placed

  "ownerId": "user123",- Quick "Flip" button on each Feed

  "memberCount": 12,

  "flipCount": 45,### Web App (Next.js)

  "tags": ["family"],**Core Features:**

  "createdAt": "2025-01-15T10:00:00Z"1. **Video Upload**: Drag-and-drop with progress indicators

}2. **Desktop Optimized**: Multi-column layouts, keyboard shortcuts

```3. **Discovery Mode**: Browse public Feeds with rich search

**UI Card:** `FeedDetailCard`4. **Analytics Dashboard**: For Feed owners (Pro tier)

5. **Feed Management**: Advanced admin tools

#### `join_feed`

**Description:** Join a public Feed or redeem a Flip Link  **Key Flows:**

**Input:** `{ "feedId": "feed789" }` OR `{ "flipLinkId": "link123" }`  - Onboarding: Google Sign-In → Browse public Feeds → Create first Feed

**Output:**- Upload & Flip: Drag video → AI processing → Add metadata → Flip

```json- Feed Admin: Manage members, view analytics, configure Feed Apps

{

  "success": true,**UI Priorities:**

  "message": "Joined 'Cooking Tips Feed",- Sidebar navigation (Feeds list, Discovery, Profile)

  "feedId": "feed789"- Grid/List toggle for video feed

}- Rich text editor for flips

```- Flip Link generator with QR code



---### AI Chat Interface (ChatGPT/Claude/Gemini) **NEW!**

**Core Features:**

### Flip & Feed Management1. **Natural Language Commands**: "Create a Feed about cooking", "Flip my video to my friends Feed"

2. **MCP Tool Integration**: All FlipFeeds operations exposed as tools

#### `list_feed_flips`3. **Rich UI Cards**: Leverage mcpui.dev for embedded UIs

**Description:** Get recent flips from a specific Feed  4. **OAuth Flow**: Seamless authentication via MCP OAuth 2.1

**Input:**5. **Context Awareness**: AI understands user's Feeds and recent activity

```json

{**Key Flows:**

  "feedId": "feed123",```

  "limit": 10User: "Show me my Feeds"

}AI: [Calls listMyFeeds tool]

```    [Renders FeedListCard with thumbnails]

**Output:**    "You have 3 Feeds: Family (12 members), Work Team (8 members), Book Club (5 members)"

```json

{User: "Create a new Feed for my hiking group"

  "flips": [AI: [Calls createFeed tool with name="Hiking Group"]

    {    [Renders FlipLinkCard with QR code and share URL]

      "id": "flip123",    "I've created your Hiking Group Feed! Here's your Flip Link to invite members."

      "feedId": "feed123",

      "authorId": "user456",User: "What are the latest videos in my Family Feed?"

      "authorName": "John Doe",AI: [Calls listFeedFlips tool with feedId]

      "title": "My first video!",    [Renders VideoFeedCard with thumbnails and AI summaries]

      "aiSummary": "This video shows how to use Genkit...",    "Here are the 5 most recent videos in Family..."

      "thumbnailURL": "https://...",```

      "videoURL": "https://...",

      "createdAt": "2025-11-10T14:30:00Z",**UI Components (mcpui.dev):**

      "stats": { "likeCount": 10, "commentCount": 3 }- **FeedListCard**: Grid of Feeds with member counts

    }- **VideoFeedCard**: Video thumbnails with AI summaries

  ]- **FlipLinkCard**: Shareable link + QR code

}- **FlipComposerCard**: Upload video directly from chat

```- **AnalyticsCard**: Feed stats for owners

**UI Card:** `VideoFeedCard` (scrollable list with thumbnails and summaries)

**Why This Matters:**

#### `get_my_feed`- **Distribution**: Users already in ChatGPT/Claude > installing new app

**Description:** Get aggregated feed from all user's Feeds  - **Natural UX**: Talk to FlipFeeds instead of navigating menus

**Input:** `{ "limit": 20 }`  - **Viral Loop**: "Share this Flip Link" button in AI chat → Direct share

**Output:** Same as `list_feed_flips` but aggregated  - **Power Users**: Advanced commands like "Find public Feeds about AI"

**UI Card:** `VideoFeedCard`- **Future-Proof**: As AI chat becomes default interface, we're native there



------



### Flip Links### Platform Comparison Matrix



#### `generate_flip_link`| Feature | Mobile | Web | AI Chat |

**Description:** Generate a shareable Flip Link for inviting members  |---------|--------|-----|---------|

**Input:**| **Video Capture** | ✅ Native Camera | ❌ Upload Only | ❌ Link Only |

```json| **Video Upload** | ✅ From Gallery | ✅ Drag & Drop | ⚠️ Via Link/Future |

{| **Authentication** | Phone + Biometric | Google/Email | OAuth 2.1 Auto |

  "feedId": "feed123",| **Flip Link Sharing** | Native Share Sheet | Copy + QR Code | Direct Link in Chat |

  "expiresInHours": 168,| **Feed Discovery** | Vertical Scroll | Grid View + Search | Natural Language Query |

  "singleUse": false| **Notifications** | Push (FCM) | Browser + Email | In-Chat Mentions |

}| **Offline Mode** | ✅ Full | ⚠️ Partial | ❌ None |

```| **Admin Dashboard** | ❌ Basic | ✅ Advanced | ✅ Text + Cards |

**Output:**| **Feed Apps Config** | ❌ Not Available | ✅ Full UI | ⚠️ Read-Only |

```json| **Onboarding Time** | 2-3 minutes | 1-2 minutes | **10 seconds** |

{| **Install Required** | ✅ Yes | ❌ No | ❌ No |

  "linkId": "link789",| **Primary Use Case** | Content Creation | Management + Discovery | Quick Actions + Browse |

  "shortUrl": "https://flip.to/xyz789",| **User Persona** | Creators, Active Users | Admins, Power Users | Casual Users, Lurkers |

  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",

  "deepLink": "flipfeeds://feed/link789",**Strategic Insight:** 

  "expiresAt": "2025-11-18T10:00:00Z"- **Mobile** = Creation engine (record and flip)

}- **Web** = Command center (manage and analyze)

```- **AI Chat** = Gateway drug (discover and join)

**UI Card:** `FlipLinkCard` with:

- Clickable short URLThe AI chat interface solves the cold-start problem: Users can explore FlipFeeds, join Feeds, and see content WITHOUT installing anything. Once engaged, they'll want the mobile app for video creation.

- Embedded QR code image

- Copy button---

- Expiration countdown

## 🗂️ Firestore Schema (Production-Ready)

---

### Collection Structure

```
v1/
├── users/{userId}
│   ├── feeds/{feedId}  (reverse lookup)
│   ├── personalFeed/  (special: user's Personal Feed reference)
│   └── notifications/{notificationId}
├── feeds/{feedId}
│   ├── members/{userId}
│   ├── invites/{inviteId}
│   └── apps/{appId}  (Feed Apps - Pro tier)
├── flips/{flipId}
│   └── comments/{commentId}
├── flipLinks/{linkId}  (for tracking Flip Links)
└── moderation/{itemId}  (flagged content queue)
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

```├── flipLinks/{linkId}  (for tracking Flip Links)

**Output:**└── moderation/{itemId}  (flagged content queue)

```json```

{

  "feeds": [### Key Indexes Required

    {```javascript

      "id": "feed999",// Firestore Indexes (firestore.indexes.json)

      "name": "Cooking Tips",[

      "description": "Learn to cook!",  {

      "logoURL": "https://...",    "collectionGroup": "flips",

      "memberCount": 342,    "queryScope": "COLLECTION",

      "flipCount": 1250,    "fields": [

      "tags": ["food", "cooking", "recipes"],      { "fieldPath": "feedId", "order": "ASCENDING" },

      "visibility": "public"      { "fieldPath": "createdAt", "order": "DESCENDING" }

    }    ]

  ]  },

}  {

```    "collectionGroup": "members",

**UI Card:** `DiscoveryGridCard`    "queryScope": "COLLECTION_GROUP",

    "fields": [

---      { "fieldPath": "userId", "order": "ASCENDING" },

      { "fieldPath": "joinedAt", "order": "DESCENDING" }

### User Profile    ]

  }

#### `get_my_profile`]

**Description:** Get the authenticated user's profile  ```

**Input:** None  

**Output:**---

```json

{## 🛠️ Implementation Phases

  "uid": "user123",

  "displayName": "John Doe",### Phase 1: Foundation (Week 1-2)

  "username": "johndoe",**Goal:** Set up core data models and basic CRUD operations

  "photoURL": "https://...",

  "bio": "I love making videos!",#### 1.1 Backend - Genkit Tools

  "feedCount": 5,📂 Location: `functions/src/tools/`

  "createdAt": "2025-01-01T00:00:00Z"

}Create:

```- `userTools.ts` - getUserProfile, updateUserProfile, getUserFeeds

**UI Card:** `ProfileCard`- `feedTools.ts` - getFeedData, checkFeedMembership, listPublicFeeds

- `flipTools.ts` - getFlip, listFeedFlips, deleteFlip

#### `update_my_profile`- `videoTools.ts` - processVideo (AI summarization + moderation)

**Description:** Update user profile  

**Input:**#### 1.2 Backend - Genkit Flows

```json📂 Location: `functions/src/flows/`

{

  "displayName": "Jane Doe",Create:

  "bio": "Updated bio",- `userFlows.ts` - createUserFlow (on signup)

  "photoURL": "https://..."- `feedFlows.ts` - createFeedFlow, joinFeedFlow, leaveFeedFlow

}- `flipFlows.ts` - createFlipFlow (with AI processing)

```- `flipLinkFlows.ts` - generateFlipLinkFlow, redeemFlipLinkFlow

**Output:**

```json#### 1.3 Shared Logic Package

{📂 Location: `packages/shared-logic/src/`

  "success": true,

  "message": "Profile updated"Create:

}- `hooks/useAuth.ts` - Unified auth hook for both platforms

```- `hooks/useFeeds.ts` - Feed CRUD operations

- `hooks/useFlips.ts` - Flip CRUD operations

---- `services/api.ts` - Genkit flow callers

- `types/index.ts` - Shared TypeScript types

## 🎨 MCP UI Card Components

#### 1.4 Security Rules

Based on **mcpui.dev** patterns, we'll create reusable card schemas.📂 Location: `firestore.rules`



### FeedListCardImplement the rules from `firestore.md`:

```typescript- User can only edit their own profile

{- Feed member checks for flip visibility

  type: 'card',- Public vs private Feed logic

  title: 'Your Feeds',

  content: {**Deliverable:** Users can sign up, create Feeds, and basic flips work

    type: 'grid',

    columns: 2,---

    items: [

      {### Phase 2: AI-First Features (Week 3-4)

        type: 'item',**Goal:** Implement the "magic" that differentiates FlipFeeds

        image: 'https://...',

        title: 'Family',#### 2.1 Video Processing Flow

        subtitle: '12 members · 45 flips',📂 Location: `functions/src/flows/videoProcessing.ts`

        badge: 'Admin',

        actions: [```typescript

          { type: 'button', label: 'View', action: 'list_feed_flips feed123' },// Enhanced version of genkit-3-setup.md

          { type: 'button', label: 'Invite', action: 'generate_flip_link feed123' }export const processVideoFlow = ai.defineFlow({

        ]  name: 'processVideoFlow',

      }  inputSchema: z.object({

    ]    gcsUri: z.string(),

  }    feedId: z.string(),

}    authorId: z.string(),

```  }),

  outputSchema: z.object({

### FlipLinkCard    summary: z.string(),

```typescript    suggestedTitle: z.string(),

{    tags: z.array(z.string()),

  type: 'card',    moderation: z.object({

  title: 'Flip Link Created!',      isSafe: z.boolean(),

  description: 'Share this link to invite people to your Feed',      flags: z.array(z.string()),

  content: {    }),

    type: 'stack',  }),

    items: [}, async ({ gcsUri, feedId, authorId }) => {

      {  // 1. Video summarization

        type: 'image',  // 2. Title generation

        src: 'data:image/png;base64,...',  // QR code  // 3. Auto-tagging

        alt: 'QR Code',  // 4. Content moderation

        width: 200,  // 5. Store in Firestore v1/flips/{flipId}

        height: 200});

      },```

      {

        type: 'text',#### 2.2 AI Prompts Library

        text: 'https://flip.to/xyz789',📂 Location: `functions/src/prompts/`

        copyable: true,

        style: 'monospace'Create:

      },- `videoPrompts.ts` - summarizeVideo, moderateVideo, suggestTitle

      {- `feedPrompts.ts` - suggestFeedName, generateWelcomeMessage

        type: 'button',- `contentPrompts.ts` - generateFlipMessage (for the "Yo" experience)

        label: 'Copy Link',

        action: 'copy_to_clipboard https://flip.to/xyz789'#### 2.3 Client Integration

      },Update `packages/shared-logic/src/hooks/useFlips.ts`:

      {

        type: 'text',```typescript

        text: 'Expires: Nov 18, 2025',export function useCreateFlip() {

        style: 'caption'  const [aiSuggestions, setAiSuggestions] = useState(null);

      }  

    ]  const uploadVideo = async (videoUri: string, feedId: string) => {

  }    // 1. Upload to Storage

}    // 2. Call processVideoFlow

```    // 3. Return AI suggestions to UI

    // 4. User can edit or accept

### VideoFeedCard  };

```typescript}

{```

  type: 'card',

  title: 'Recent Videos in Family',**Deliverable:** Video uploads get AI summaries, titles, and moderation

  content: {

    type: 'list',---

    items: [

      {### Phase 3: The Flip Link (Viral Loop) (Week 5)

        type: 'item',**Goal:** Implement the core growth mechanic

        image: 'https://.../thumbnail.jpg',

        title: 'My first video!',#### 3.1 Flip Link Generation

        subtitle: 'by John Doe · 2 hours ago',📂 Location: `functions/src/flows/flipLinkFlows.ts`

        description: 'AI Summary: This video shows how to use Genkit...',

        badge: '10 ❤️',```typescript

        actions: [export const generateFlipLinkFlow = ai.defineFlow({

          { type: 'button', label: 'Watch', action: 'open_url https://...' }  name: 'generateFlipLink',

        ]  inputSchema: z.object({

      }    feedId: z.string(),

    ]    userId: z.string(),

  }    expiresInHours: z.number().default(168), // 7 days

}    singleUse: z.boolean().default(false),

```  }),

  outputSchema: z.object({

---    linkId: z.string(),

    shortUrl: z.string(),

## 💬 Example Conversations    qrCode: z.string(), // Base64 QR code image

    deepLink: z.string(), // flipfeeds://feed/{linkId}

### Scenario 1: First-Time User  }),

```}, async (input) => {

User: What is FlipFeeds?  // 1. Create record in v1/flipLinks/{linkId}

  // 2. Generate short URL (Firebase Dynamic Links or custom)

AI: FlipFeeds is a video-first social network organized around "Feeds" -   // 3. Generate QR code

intentional content groups you join. Unlike algorithmic feeds, your feed is   // 4. Return data

empty by default and only shows content from Feeds you explicitly join.});

```

Would you like to:

1. Browse public Feeds#### 3.2 Deep Link Handling

2. Create your own private Feed

3. Learn more about how it works**Mobile** (`apps/mobile/app/_layout.tsx`):

```typescript

User: Create a private Feed for my book club// React Navigation linking config

const linking = {

AI: [Calls create_feed tool with name="Book Club", visibility="private"]  prefixes: ['flipfeeds://', 'https://flipfeeds.app'],

    [Renders FlipLinkCard]  config: {

    screens: {

Great! I've created your "Book Club Feed. Here's your Flip Link to invite       FeedInvite: 'feed/:linkId',

members:    },

  },

https://flip.to/abc123};

```

[Shows QR code]

**Web** (`apps/web/app/feed/[linkId]/page.tsx`):

Anyone with this link can join your Feed. The link expires in 7 days. ```typescript

Would you like to adjust the expiration or make it single-use?// Next.js dynamic route

```export default async function FlipLinkPage({ params }: { params: { linkId: string } }) {

  // 1. Verify link validity

### Scenario 2: Power User  // 2. Check if user is authenticated

```  // 3. Auto-join Feed

User: Show me my Feeds  // 4. Redirect to Feed

}

AI: [Calls list_my_feeds tool]```

    [Renders FeedListCard with 5 feeds]

#### 3.3 Onboarding Flow

You have 5 Feeds:

- Family (12 members, Admin)**Mobile-First Flow:**

- Work Team (8 members, Member)1. User installs app

- Book Club (5 members, Admin)2. Phone verification

- Cooking Tips (342 members, Member)3. "Create Your First Feed" prompt

- FlipFeeds Beta (1250 members, Member)4. **Big "Flip Your Friends" button**

5. Generate Flip Link → Native share sheet

Which one would you like to explore?6. Friend taps link → Deep link → Auto-install if needed → Join Feed



User: What are the latest videos in Family?**Web-First Flow:**

1. User signs in with Google

AI: [Calls list_feed_flips tool with feedId="family123"]2. "Browse Public Feeds" or "Create Private Feed"

    [Renders VideoFeedCard]3. Generate Flip Link → Copy + QR code

4. Friend visits link → Sign in → Join Feed

Here are the 5 most recent videos in your Family Feed:

**Deliverable:** Flip Links work end-to-end, growth loop is functional

1. "Trip to the beach" by Mom (3 hours ago)

   AI Summary: Beach vacation with sunset shots and kids playing...---

   10 likes, 3 comments

### Phase 4: Discovery & Social Features (Week 6-7)

2. "Dad's new BBQ" by Dad (yesterday)**Goal:** Allow users to find public Feeds and engage

   AI Summary: Demonstration of new grill features...

   5 likes, 1 comment#### 4.1 Discovery Flow

📂 Location: `functions/src/flows/discoveryFlows.ts`

[More videos...]

```typescript

Would you like to watch any of these?export const searchPublicFeedsFlow = ai.defineFlow({

  name: 'searchPublicFeeds',

User: Generate a Flip Link for my Book Club  inputSchema: z.object({

    query: z.string().optional(),

AI: [Calls generate_flip_link tool]    tags: z.array(z.string()).optional(),

    [Renders FlipLinkCard]    limit: z.number().default(20),

  }),

Here's your Flip Link for Book Club:  outputSchema: z.object({

https://flip.to/xyz789    feeds: z.array(FeedSchema),

[QR code shown]  }),

}, async ({ query, tags, limit }) => {

This link will work for 7 days and can be used unlimited times.   // Firestore query with Algolia or native search

Want to change that?});

``````



### Scenario 3: Discovery#### 4.2 UI Components

```📂 Location: `packages/ui-components/src/`

User: Find public Feeds about AI and technology

Create platform-agnostic components:

AI: [Calls search_public_feeds with query="AI technology"]- `FeedCard` - Display feed preview

    [Renders DiscoveryGridCard]- `FlipCard` - Video flip with AI summary

- `FlipButton` - Generate Flip Link

I found 15 public Feeds about AI and technology:- `DiscoveryFeed` - Grid of public Feeds



1. AI Enthusiasts (2.3K members)#### 4.3 Engagement Features

   "Discussing the latest in artificial intelligence"- Like/Comment on flips

   Tags: AI, ML, tech- Feed member list

- User profiles with bio

2. Genkit Developers (450 members)- Follow users (optional, not required for MVP)

   "Building AI-first apps with Firebase Genkit"

   Tags: genkit, firebase, AI**Deliverable:** Users can discover and join public Feeds



3. Tech News Daily (5.1K members)---

   "Daily curated tech news videos"

   Tags: tech, news, innovation### Phase 5: Monetization & Feed Apps (Week 8-10)

**Goal:** Enable Pro tier and extensible Feed Apps

Would you like to join any of these? Just say "join [feed name]"

#### 5.1 Subscription Flow

User: Join Genkit DevelopersUse **Firebase Extensions** for Stripe integration:

- Install `firestore-stripe-payments` extension

AI: [Calls join_feed tool]- Create Pro tier ($10/mo)

- Gate Feed Apps behind Pro tier

Perfect! You've joined "Genkit Developers Feed. You'll now see their 

flips in your main feed. Want to see the latest flips from this Feed?#### 5.2 Feed Apps Platform

```📂 Location: `functions/src/flows/feedAppsFlows.ts`



---```typescript

export const registerFeedAppFlow = ai.defineFlow({

## 🔐 OAuth Flow  name: 'registerFeedApp',

  inputSchema: z.object({

### Initial Setup (One-Time)    feedId: z.string(),

```    appName: z.string(),

User: (First time using FlipFeeds in ChatGPT)    triggerCommand: z.string(), // e.g., "/summarize"

    mcpEndpoint: z.string(),

AI: To access FlipFeeds, I need to connect to your account.    apiKey: z.string(),

  }),

[Displays OAuth authorization URL]  outputSchema: z.object({

    appId: z.string(),

Please click this link to authorize:    success: z.boolean(),

https://us-central1-PROJECT.cloudfunctions.net/mcpAuthServer/authorize?...  }),

}, async (input) => {

After authorizing, you'll be redirected back here and I'll have access to   // 1. Verify user is Feed owner

your FlipFeeds account.  // 2. Verify Pro tier subscription

  // 3. Store in v1/feeds/{feedId}/apps/{appId}

User: [Clicks link, completes OAuth flow]  // 4. Set up trigger webhook

});

AI: ✅ Connected! I can now access your FlipFeeds account.```



What would you like to do?#### 5.3 Sandbox Execution

- View your FeedsWhen a flip triggers a Feed App:

- Create a new Feed1. Call the registered MCP endpoint

- Browse public Feeds2. Pass only the flip data (not full Feed access)

- Generate a Flip Link3. Run response through AI moderation

```4. Flip result if safe



### Subsequent Uses**Deliverable:** Pro users can add custom AI bots to their Feeds

```

User: Show me my Feeds---



AI: [Uses stored access token automatically]### Phase 6: Abuse Prevention (Week 11)

    [Calls list_my_feeds]**Goal:** Implement security measures from business_plan.md

    

[Works seamlessly without re-auth]#### 6.1 Phone Verification

```**Mobile**: Use Firebase Auth Phone

**Web**: Use Firebase Auth Phone (requires SMS provider)

---

#### 6.2 Content Moderation

## 🚀 Implementation ChecklistAlready in Phase 2, but enhance:

- Auto-flag content with high toxicity scores

### Backend (MCP Server)- Create moderation queue for Feed admins

- [x] OAuth 2.1 server already exists (`mcpAuthServer`)- Global ban system (blacklist phone numbers)

- [x] Protected resource metadata endpoint exists

- [ ] Expand `mcpServer.ts` with all 10+ tools#### 6.3 Rate Limiting

- [ ] Create response formatters for MCP UI cardsUse Firebase App Check + Cloud Armor:

- [ ] Add error handling for natural language errors- Limit Flip Link creation (10 per day for free tier)

- [ ] Implement rate limiting per user- Limit flip uploads (20 per day for free tier)

- [ ] Add logging for MCP tool calls- Limit Feed App API calls (1000 per day)



### MCP UI Package**Deliverable:** Platform is resilient to abuse

- [ ] Create `packages/mcp-ui/` package

- [ ] Define card schemas (FeedListCard, FlipLinkCard, etc.)---

- [ ] Create render functions for each card type

- [ ] Export TypeScript types for AI chat platforms### Phase 7: AI Chat Interface (Week 12-13) **NEW!**

- [ ] Write tests for card rendering**Goal:** Make FlipFeeds fully accessible inside ChatGPT, Claude, and Gemini

- [ ] Document card usage

#### 7.1 MCP Tools Expansion

### Testing📂 Location: `functions/src/mcpServer.ts`

- [ ] Test in ChatGPT Desktop app

- [ ] Test in Claude Desktop appExpose ALL FlipFeeds operations as MCP tools:

- [ ] Test OAuth flow end-to-end

- [ ] Verify UI cards render correctly```typescript

- [ ] Test error scenarios (expired tokens, invalid Feed IDs)// Existing tools in mcpServer.ts

- [ ] Load testing (many concurrent users)server.setRequestHandler(ListToolsRequestSchema, async () => {

  return {

### Documentation    tools: [

- [ ] User guide: "How to use FlipFeeds in ChatGPT"      // Feed Management

- [ ] Developer docs: MCP tool reference      {

- [ ] Video tutorial: Setting up MCP server        name: 'list_my_feeds',

- [ ] FAQ: Common issues and solutions        description: 'List all Feeds the authenticated user belongs to',

        inputSchema: { type: 'object', properties: {} },

### Deployment      },

- [ ] Deploy enhanced `mcpServer` function      {

- [ ] Set up monitoring for MCP tool calls        name: 'create_feed',

- [ ] Create marketing page showing AI chat features        description: 'Create a new Feed (public or private)',

- [ ] Announce in FlipFeeds blog/social media        inputSchema: {

          type: 'object',

---          properties: {

            name: { type: 'string', description: 'Feed name' },

## 📈 Success Metrics            description: { type: 'string' },

            visibility: { type: 'string', enum: ['public', 'private'] },

**Week 1:**            tags: { type: 'array', items: { type: 'string' } },

- 100 MCP tool calls          },

- 10 OAuth completions          required: ['name', 'visibility'],

        },

**Month 1:**      },

- 1,000 daily MCP tool calls      {

- 100 active AI chat users        name: 'join_feed',

- 60% OAuth completion rate        description: 'Join a public Feed or redeem a Flip Link',

        inputSchema: {

**Month 3:**          type: 'object',

- 10,000 daily MCP tool calls          properties: {

- 1,000 active AI chat users            feedId: { type: 'string' },

- 30% of all Flip Links created via AI chat            flipLinkId: { type: 'string' },

          },

---        },

      },

## 🎯 Future Enhancements      {

        name: 'get_feed_details',

1. **Video Upload via AI Chat**: "Upload this video to my Feed" (with file attachment)        description: 'Get detailed information about a specific Feed',

2. **AI Feed Suggestions**: "You might like these public Feeds based on your interests"        inputSchema: {

3. **Proactive Notifications**: AI messages user in ChatGPT when new flips arrive          type: 'object',

4. **Voice Integration**: Use voice commands in ChatGPT to control FlipFeeds          properties: { feedId: { type: 'string' } },

5. **Multi-Modal**: AI analyzes video thumbnails and suggests which to watch first          required: ['feedId'],

6. **Feed Apps in AI Chat**: Configure Feed Apps via natural language        },

      },

---      // Flip Management

      {

**Ready to build the future of AI-native social media!** 🚀        name: 'list_feed_flips',

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
