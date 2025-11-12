# FlipFeeds Terminology Update Summary

**Date:** November 11, 2025  
**Status:** ✅ Complete

---

## 🎯 Changes Made

All documentation in the `/documents` folder has been updated to reflect the new terminology:

### Core Terminology Changes:
- **"Circle"** → **"Feed"** 
- **"post"** → **"flip"**
- **"Posts"** → **"Flips"**

### User Language:
> "Did you see the flip I sent to you in your feed?"

This natural language works for:
- Flips in shared Feeds
- Flips in Personal Feeds (future DM feature)

---

## 📝 Updated Documents

### 1. business_plan.md
**Changes:**
- ✅ Replaced all Circle → Feed references
- ✅ Replaced all post → flip references
- ✅ Added section "Personal Feeds: Your Private Space"
- ✅ Updated business model to include Personal Feed storage tiers
- ✅ Updated abuse prevention to mention "flips in public Feeds"

**Key Additions:**
- Personal Feed concept introduced in onboarding flow
- Free tier: 10GB Personal Feed storage
- Pro tier: 100GB Personal Feed storage
- Future feature: Direct messaging via Personal Feeds

---

### 2. philosophy.md
**Changes:**
- ✅ Replaced all Circle → Feed references
- ✅ Replaced "post" → "flip" (primary content type)
- ✅ Updated comparison table to use "Feed" terminology
- ✅ Added section "Personal Feeds: Your Private Space"

**Key Updates:**
- Comparison table now shows "The Feed" as core unit
- Primary modality: "Video-First. The primary content type is video (called 'flips')"
- Personal Feed features: private by design, full AI features, unlimited personal storage

---

### 3. IMPLEMENTATION_PLAN.md
**Changes:**
- ✅ Replaced all Circle → Feed references
- ✅ Replaced all post/posts → flip/flips references
- ✅ Updated architecture diagrams
- ✅ Updated Firestore schema paths (`feeds`, `flips`)
- ✅ Updated MCP tools naming
- ✅ Added "Personal Feeds Schema" section

**Key Updates:**
- Data structure: `users/{userId}/personalFeed/`
- Collection: `feeds/personal_{userId}`
- MCP Tools: `get_personal_feed`, `save_flip_to_personal`, `move_flip_to_feed`
- Flow names: `createFlipFlow`, `listFeedFlips`

---

### 4. firestore.md
**Changes:**
- ✅ Replaced all Circle → Feed references
- ✅ Replaced all post/posts → flip/flips references
- ✅ Updated collection names (`feeds`, `flips`)
- ✅ Added section "Personal Feeds: Every User's Private Space"
- ✅ Updated security rules for Personal Feeds

**Key Schema Updates:**
```javascript
// Personal Feed document
{
  feedId: "personal_{userId}",
  name: "Personal Feed",
  type: "personal",
  visibility: "personal", // Special visibility type
  ownerId: userId,
  stats: { memberCount: 1, flipCount: 0 }
}

// Security rules
function isPersonalFeed(feedId) {
  return feedId.matches('personal_.*');
}

function ownsPersonalFeed(feedId) {
  return feedId == 'personal_' + request.auth.uid;
}
```

**Security Rules:**
- Personal Feeds: Only owner can read/write
- Regular Feeds: Public vs. private visibility rules
- Never list Personal Feeds in discovery

---

### 5. THREE_PLATFORM_STRATEGY.md
**Changes:**
- ✅ Replaced all Circle → Feed references
- ✅ Replaced all post → flip references
- ✅ Added section "Personal Feeds: Cross-Platform Private Space"
- ✅ Updated user personas to reference Feeds
- ✅ Updated year 1 & year 3 predictions

**Key Additions:**
- Personal Feed experience across Mobile, Web, and AI Chat
- Cross-platform scenarios using Personal Feeds
- User language examples with Personal Feeds

---

### 6. genkit-*.md (Setup Guides)
**Changes:**
- ✅ Replaced all Circle → Feed references
- ✅ Updated flow names and descriptions
- ✅ Updated code examples to use Feed terminology

---

## 🏠 Personal Feeds: Key Concept

Every user automatically gets a **Personal Feed** - a private space that:

### Characteristics:
- **Auto-created on signup** with ID `personal_{userId}`
- **Single-user only** - no member management
- **Never discoverable** - won't appear in search or lists
- **Full AI features** - summaries, search, title generation
- **Cross-platform** - accessible from mobile, web, and AI chat
- **Private storage** - 10GB (free) or 100GB (pro)

### Use Cases:
1. **Draft workspace** - Create and refine flips before sharing
2. **Personal collection** - Save flips from other Feeds
3. **Private viewing** - Store videos only you can see
4. **Future DM** - Send flips directly to someone's Personal Feed

### Data Structure:
```

├── feeds/personal_{userId}  (the Personal Feed document)
└── users/{userId}/personalFeed/  (reference to their Personal Feed)
```

---

## ✅ Verification

All terminology has been consistently updated across:
- [x] Business plan and growth strategy
- [x] Product philosophy and differentiators  
- [x] Implementation plan and architecture
- [x] Firestore data schema and security rules
- [x] Platform strategy documents
- [x] Genkit setup guides

---

## 🚀 Next Steps

1. Update code in `functions/src/` to match new terminology
2. Update mobile app (`apps/mobile/`) to use Feed/Flip terminology
3. Update web app (`apps/web/`) to use Feed/Flip terminology
4. Update shared packages to export Feed/Flip types
5. Implement Personal Feed creation on user signup
6. Add Personal Feed UI components to all platforms

---

## 📊 Impact Summary

**Before:**
- "Circles" (confusing with Google+ circles)
- "Posts" (generic social media term)
- No personal space concept

**After:**
- "Feeds" (clear, descriptive, matches "FlipFeeds")
- "Flips" (unique, memorable, action-oriented)
- Personal Feeds (private space for every user)

**User Language:**
> "Did you see the flip I sent to you in your feed?"

✨ Natural, conversational, and uniquely FlipFeeds.
