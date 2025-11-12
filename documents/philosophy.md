# FlipFeeds: Project Philosophy & Differentiators

## 1. Core Concept: "Flipping Your Feed"

The name "FlipFeeds" is the core marketing and product message.

**Problem:** Modern social media is a "passive" experience. Algorithmic feeds (Facebook, Twitter, TikTok) push content to you, often leading to doom-scrolling, misinformation, and a "bad taste" as you mentioned. Discord is "active" but is a chat-first tool, not a media-first one.

**Solution:** FlipFeeds is an "intentional" experience. A user's main feed is empty by default. To get content, they must intentionally join a "Feed." This action is "flipping your feed" from the void to a curated stream of content you explicitly asked for.

**Inspiration:** This is the core lesson from Google+. "Circles" were a brilliant way to manage who you share with. We are flipping this: **Feeds are about what you consume**.

---

## 2. Our Differentiators

This is how we stand apart from the giants:

| Feature/Concept | Facebook / Instagram | Twitter (X) | Reddit | Discord | FlipFeeds (Our Edge) |
|----------------|---------------------|-------------|--------|---------|---------------------|
| **Primary Feed** | Algorithmic (Friends + Ads + Suggested) | Algorithmic (Following + Ads + Suggested) | Algorithmic (Subreddits + Ads + Suggested) | N/A (Chat-first) | **Intentional (Feed-Only)**. Your feed is only content from Feeds you join. No algorithmic "For You" page unless you enter Discovery mode. |
| **Core Unit** | The "Friend" / "Follower" | The "Follower" | The "Subreddit" | The "Server" | **The "Feed"**. A Feed is a content stream and a community. |
| **Primary Modality** | Image / Text / Short Video | Text | Text / Links / Images | Text / Voice Chat | **Video-First**. The primary content type is video (called "flips"). All other types (text, images) are secondary. |
| **AI Integration** | Backend (Ads, Ranking) | Backend (Ranking) | Backend (Moderation) | Add-on (Bots) | **AI-First (Genkit)**. AI is a creative tool for users (video summaries, title generation, content creation) and a core part of the experience, not just a hidden ranking engine. |
| **Discoverability** | Suggests "People You May Know" | Suggests "Who to Follow" | r/all, search | Server Discovery | **Discovery Mode**. An optional mode where users can browse public Feeds. Private Feeds are unlisted and invite-only. |
| **Monetization** | Intrusive Ads | Intrusive Ads / Subscription | Ads / Subscription (Gold) | Subscription (Nitro) | **Multi-Tenant SaaS**. Feeds are the "tenants." Feed owners can potentially charge for access (future), and we charge owners for premium features (AI tokens, storage, etc.). This aligns our incentives with creators, not advertisers. |
| **Data Model** | The "Social Graph" | The "Interest Graph" | The "Community Graph" | The "Chat Server" | **The "Feed Graph"**. A user's identity is defined by the set of Feeds they belong to. |

---

## 3. The "AI-First" Promise (via Genkit)

Our biggest technical differentiator is making AI a tangible tool for every user.

### For Users:
- **AI Video Summaries:** Auto-generated summaries for all videos (flips).
- **AI Title/Description:** Genkit suggests catchy titles/descriptions when uploading.
- **AI-Powered Search:** Search inside videos (e.g., "find the part where they talk about the new Firebase SDK").

### For Feed Admins:
- **AI Moderation:** Genkit flows to automatically flag/remove spam, hate speech, or off-topic content.
- **AI Welcome Bots:** Genkit-powered bots to welcome new members.
- **AI Analytics:** Summaries of "what was the Feed's vibe this week?"

### For Creators:
- **AI Content Generation:** "Suggest 5 video ideas for my 'Next.js Tips' Feed."
- **AI-Assisted Editing:** (Future) Tools to trim silence, add captions, etc.

By wrapping all this in Genkit and an MCP server, we make the AI layer consistent, manageable, and testable (via Genkit Inspector).

---

## 4. Personal Feeds: Your Private Space

Every user gets a **Personal Feed** - a special private Feed that only they can access:

- **Private by design** - Never appears in discovery or others' Feed lists
- **Store personal flips** - Save videos you want to keep private or watch later
- **Draft workspace** - Create and refine flips before sharing to other Feeds
- **Full AI features** - All AI tools work just like in shared Feeds
- **Unlimited personal storage** - Free tier gets 10GB, Pro tier gets 100GB

**User language:** "Did you see the flip I sent to you in your feed?" - This could mean a shared Feed OR a private message to someone's Personal Feed.