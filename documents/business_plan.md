# FlipFeeds: Business & Viral Growth Strategy

## 1. Core Philosophy: "The Intentional Flip"

Our business and growth strategy stems directly from our product philosophy.

**Traditional Social:** "Find everyone you know, follow everyone you find." This is a pull model that creates noisy, algorithmic feeds.

**FlipFeeds:** "Start with one trusted Feed." This is an invite model. A user's experience is intentionally empty until a trusted source "flips" their feed by inviting them.

Our growth is not based on "friending" but on "sharing."

---

## 2. Phase 1: The "Yo" Strategy - Viral Acquisition

The goal is to replicate the "Yo" app's frictionless, novel, and slightly-silly-but-compelling growth loop.

### The Mechanic: The "Flip Link" (or QR Code)

### The Loop:

1. **User A** installs FlipFeeds. They are prompted to create their first private Feed (e.g., "Best Friends," "Family Chat"). **Note:** Every user also automatically gets a personal Feed - a private space only they can access to store flips.
2. The app immediately and prominently presents them with a "Flip Your Friends' Feed" button.
3. This generates a unique, single-use, or time-limited "Flip Link."
4. **User A** shares this link via text, WhatsApp, etc. The message is simple: **"Flipping your feed. Tap this to see my videos."**
5. **User B** (on mobile) taps the link.
6. If they don't have the app, it goes to the App Store/Play Store.
7. After install, the app deep-links them directly into User A's private Feed.
8. **User B's** app experience is instantly populated. Their feed is no longer empty; it has been "flipped" by User A.

### Why this is like "Yo":

- **Simplicity:** The entire onboarding flow for a new user (User B) is one tap. They don't need to search for User A, send a friend request, and wait.
- **Novelty:** The concept of "flipping" someone's feed is a powerful, tangible action. It's not a "poke" or a "friend request"; it's an act of content-sharing.
- **Intimacy:** It starts with a 1-to-1 or 1-to-few relationship, which is the stickiest kind. We are not asking users to join a 10,000-person public server first.

---

## 3. Phase 2: Building Stickiness - The AI "Magic"

The viral loop gets users in the door. The AI-first features make them stay.

- **Initial "Wow":** Within 10 minutes of joining, User B sees User A's videos with AI-generated summaries. When they upload their first video, we offer to **"Write a title for me."** This is the immediate, tangible value.
- **The Content-to-Community Bridge:** FlipFeeds is not a group chat. It's a media feed for your group. The AI tools (summaries, search) are what differentiate this from just a WhatsApp group.
- **Introducing Discovery:** After a user has joined 2-3 (private) Feeds, we introduce the **"Discovery" tab**. This is where they can find public Feeds. This is a crucial, phased onboarding. We first establish trust, then we introduce public content.

---

## 4. Personal Feeds: Your Private Space

Every user automatically gets a **Personal Feed** upon signup. This is a special private Feed that:

- **Only the user can access** - it never appears in discovery or Feed lists for others
- **Stores personal flips** - save flips you want to keep private or watch later
- **Acts as a draft space** - create flips before sharing them to other Feeds
- **No member management** - it's always a Feed of one
- **Full AI features** - AI summaries, title generation, search work just like other Feeds

**User Scenario:** "Did you see the flip I sent to you in your feed?" - This could refer to a shared Feed OR a flip sent to someone's Personal Feed as a private message.

**Future Feature:** Direct messaging via Personal Feeds - send a flip directly to someone's Personal Feed for private viewing.

---

## 5. Phase 3: Monetization & Extensibility

This is how we become a sustainable platform, not just a viral hit. Our model is **Multi-Tenant SaaS (Feeds-as-a-Service)**.

### The Business Model

**Free Tier (The "User"):**
- Join unlimited Feeds.
- Create up to 3 Feeds (private or public).
- Feed member limit of 50.
- Unlimited Personal Feed storage (up to 10GB).
- Basic AI features (e.g., 10 video summaries/mo).
- Basic AI moderation for public Feeds.

**Pro Tier (The "Creator" / "Tenant"): ($5-$10/mo)**
- Create unlimited Feeds.
- Increased member limit (e.g., 500 members).
- Advanced AI moderation tools.
- High-volume AI quotas (summaries, title generation).
- Custom branding for their Feed.
- Increased Personal Feed storage (100GB).
- Access to the **"Feed Apps" (Genkit) Platform**.

---

## 6. The "Feed Apps" Platform (Our "Discord Bots")

This is how we allow extensibility without letting abuse run rampant.

### The Concept:
Feed Owners (Pro Tier) can link their own Genkit flows to their Feed, creating **"Feed Apps."**

### The Mechanism (Backend):

1. A Pro Feed Owner gets an **"Apps" tab** in their Feed settings.
2. They can **"Register a New App."**
3. They provide:
   - **App Name:** (e.g., "My Summary Bot").
   - **Trigger Command:** (e.g., `/summarize`).
   - **Your MCP Server Endpoint URL:** (e.g., `https://my-genkit-server.com/summarizeVideo`).
   - **A Secret/API Key:** This is for our backend to authenticate with their backend.

### The User Flow:

1. A member in that Feed flips a video (video) and adds the comment: `/summarize`.
2. FlipFeeds' backend sees the `/summarize` trigger for that Feed.
3. Our MCP server calls the registered `https://my-genkit-server.com/summarizeVideo` endpoint, passing the video data and the secret.
4. The Feed Owner's custom Genkit flow runs.
5. Their flow returns a text string (the summary).
6. Our backend flips that string as a reply from **"My Summary Bot."**

---

## 7. How We Prevent Abuse (The Defensibility)

This is the most critical part. We must be proactive and architectural in our abuse prevention.

### Problem 1: User/Spam Abuse

**Solution:** Mandatory **Phone Number Verification** on signup. This is non-negotiable for a social app. It's the single most effective way to stop mass bot-net creation.

---

### Problem 2: Malicious Content (CSAM, Hate Speech)

**Solution: AI-First Moderation (Our Genkit Flows).**

- All public content (flips in public Feeds, public profile pictures) is **required** to pass through our `moderateVideoPrompt` / `moderateImagePrompt` Genkit flows before it's visible.
- All private content is still scanned for CSAM hashes (a legal requirement).
- **Global Banhammer:** A user banned for critical violations is banned at the Auth level. Their phone number is blacklisted.

---

### Problem 3: Extensibility Abuse (Malicious "Feed Apps")

This is the new, big-risk vector.

**Solution 1: It's a Paid Feature.** By putting "Feed Apps" behind the Pro Tier, we tie it to a credit card. This massively reduces drive-by abuse.

**Solution 2: Sandbox All Responses.** The output of a custom Feed App (the text, the image, the video) is **still run through our own `moderate...` Genkit flows** before it is flipped to the Feed. If a user's custom bot tries to flip hate speech, our system blocks the flip and flags the Feed Owner.

**Solution 3: Strict API Scopes.** A Feed App API only receives data about the specific event it was triggered by (e.g., "this new flip," "this message"). It never gets access to the Feed's member list, user emails, or any data outside of its immediate context. This prevents data-scraping bots.

**Solution 4: Rate Limiting.** All custom app endpoints are heavily rate-limited to prevent DDoS or spam.