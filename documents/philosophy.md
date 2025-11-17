# FlipFeeds: Project Philosophy & Differentiators

## 1. Core Concept: "Curating Your World"

The name "FlipFeeds" represents the core action of taking control of your social world, one "Feed" at a time.

**Problem:** Modern social media forces a binary choice: broadcast to everyone (Twitter, TikTok) or be confined to siloed group chats (Discord, iMessage). There's no easy way to share the right content with the right people, reflecting our real-life relationships.

**Solution:** FlipFeeds is an "intentional" sharing platform and a replacement for Google+, TikTok, and YouTube Shorts. A "Flip" (a short-form video) is created once, and you decide which of your "Feeds" (curated lists of people) to share it with. A Feed can be "Family," "Work Colleagues," or "D&D Group." This gives you granular control over your audience for every video.

**Inspiration:** This is a modern take on the core lesson from Google+. "Circles" were a brilliant way to manage who you share with. We are applying this concept to a video-only world, where the "Feed" is both the audience you share *to* and the content stream you consume *from*. Unlike TikTok's algorithmic feed or YouTube Shorts' recommendation engine, FlipFeeds is intentional and relationship-based.

---

## 2. Our Differentiators

This is how we stand apart from the giants (and learn from Google+):

| Feature/Concept | TikTok | YouTube Shorts | Google+ (RIP) | Facebook / Instagram | Discord | FlipFeeds (Our Edge) |
|----------------|--------|----------------|--------------|---------------------|---------|---------------------|
| **Primary Feed** | Algorithmic For You | Algorithmic Shorts Feed | Circles (Intentional) | Algorithmic (Friends + Ads) | N/A (Chat-first) | **Chronological & Intentional**. Your main stream is an aggregation of Flips from Feeds you are part of, sorted by time. You can filter to view one Feed at a time. Like Google+ Circles for video. |
| **Core Unit** | The "Follower" | The "Subscriber" | The "Circle" | The "Friend" / "Follower" | The "Server" | **The "Feed"**. A Feed is a private, curated list of people, like Google+ Circles reimagined for video-only. |
| **Primary Modality** | Short-Form Video | Short-Form Video | Text / Images / Links | Image / Text / Short Video | Text / Voice Chat | **Video-Only**. The only content type is short-form video (called "flips"). This is what TikTok and YouTube Shorts should have been with intentional sharing like Google+. |
| **AI Integration** | Backend (Recommendations) | Backend (Recommendations) | None | Backend (Ads, Ranking) | Add-on (Bots) | **AI-First (Genkit)**. AI is a creative tool for users (video summaries, title generation, content creation) and a core part of the experience, not just a hidden ranking engine. |
| **Discoverability** | For You Page | Shorts Feed | Circles (Private) | Suggests "People You May Know" | Server Discovery | **Relationship-Based**. Discovery is based on your existing connections. Public "directory" Feeds can exist, but the primary model is private and invite-only like Google+ Circles. |
| **Monetization** | Intrusive Ads | Intrusive Ads | None (Shut Down) | Intrusive Ads | Subscription (Nitro) | **Freemium & Creator-Focused**. We offer pro features for users (more storage, AI tokens) and for creators who want to manage large, public Feeds. This aligns our incentives with users, not advertisers. |
| **Data Model** | The "Interest Graph" | The "Creator Graph" | The "Circle Graph" | The "Social Graph" | The "Chat Server" | **The "Relationship Graph"**. A user's identity is defined by their relationships, categorized into different Feeds, inspired by Google+ Circles. |

---

## 3. The "AI-First" Promise (via Genkit)

Our biggest technical differentiator is making AI a tangible tool for every user.

### For Users:
- **AI Video Summaries:** Auto-generated summaries for all videos (flips).
- **AI Title/Description:** Genkit suggests catchy titles/descriptions when uploading.
- **AI-Powered Search:** Search inside videos (e.g., "find the part where they talk about the new Firebase SDK").

### For Feed Admins:
- **AI Moderation:** Genkit flows to automatically flag/remove spam or hate speech in public Feeds.
- **AI Welcome Bots:** Genkit-powered bots to welcome new members to a Feed.
- **AI Analytics:** Summaries of "what was the Feed's vibe this week?"

### For Creators:
- **AI Content Generation:** "Suggest 5 video ideas for my 'Next.js Tips' Feed."
- **AI-Assisted Editing:** (Future) Tools to trim silence, add captions, etc.

By wrapping all this in Genkit and an MCP server, we make the AI layer consistent, manageable, and testable (via Genkit Inspector).

---

## 4. Personal Feeds: Your Private Space

Every user gets a **Personal Feed** - a special private Feed that only they can access:

- **Private by design** - Never appears in discovery or others' Feed lists.
- **Store personal flips** - Save videos you want to keep private or watch later. This is your "Saved" or "Watch Later" list.
- **Draft workspace** - Create and refine flips here before sharing them with other Feeds.
- **Full AI features** - All AI tools work just like in shared Feeds.
- **Unlimited personal storage** - Free tier gets 10GB, Pro tier gets 100GB.

**User language:** "I shared the flip to your Family feed." or "I saved it to my Personal Feed for later."


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