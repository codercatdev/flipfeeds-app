# FlipFeeds MCP Testing Guide

**Purpose:** Step-by-step testing plan for validating all 24 FlipFeeds flows via MCP  
**Date:** November 11, 2025  
**Testing Environment:** ChatGPT Desktop / Claude Desktop with MCP  

---

## 🎯 Testing Prerequisites

### 1. Environment Setup

✅ **Verify these are working:**
- [ ] Firebase emulators running (`pnpm emulators`)
- [ ] Functions build successful (`pnpm build`)
- [ ] MCP server accessible at `http://localhost:5001/flipfeeds-app/us-central1/mcpServer`
- [ ] OAuth authentication working
- [ ] 24 flows showing in logs

### 2. MCP Client Setup

**Option A: ChatGPT Desktop**
1. Open ChatGPT Desktop settings
2. Add MCP server configuration
3. Authorize with OAuth flow
4. Verify connection successful

**Option B: Claude Desktop**
1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Add FlipFeeds MCP server
3. Restart Claude Desktop
4. Test connection

---

## 📋 Testing Order (Bottom-Up Dependency Chain)

### Phase 1: Foundation Tests (User Management)

These have no dependencies and must work first.

#### Test 1.1: Create User Profile
**Flow:** `createUserFlow`

**Test Case:**
```
User: Create a user profile for me with the name "Test User"

Expected MCP Call:
{
  "tool": "createUserFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "displayName": "Test User",
    "email": "<from-auth>"
  }
}

Expected Response:
{
  "uid": "...",
  "displayName": "Test User",
  "username": null,
  "photoURL": null,
  "bio": null,
  "feedCount": 0,
  "createdAt": "2025-11-11T...",
  "updatedAt": "2025-11-11T..."
}

Success Criteria:
✅ User document created in v1/users/{uid}
✅ Response includes all expected fields
✅ feedCount starts at 0
```

#### Test 1.2: Check Username Availability
**Flow:** `checkUsernameFlow`

**Test Case:**
```
User: Is the username "testuser123" available?

Expected MCP Call:
{
  "tool": "checkUsernameFlow",
  "arguments": {
    "username": "testuser123"
  }
}

Expected Response:
{
  "available": true,
  "username": "testuser123"
}

Success Criteria:
✅ Returns true for new username
✅ Returns false if username exists in v1/usernames
```

#### Test 1.3: Update User Profile (with Username)
**Flow:** `updateUserProfileFlow`

**Test Case:**
```
User: Update my profile to use the username "testuser123" and bio "I love FlipFeeds"

Expected MCP Call:
{
  "tool": "updateUserProfileFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "username": "testuser123",
    "bio": "I love FlipFeeds"
  }
}

Expected Response:
{
  "uid": "...",
  "displayName": "Test User",
  "username": "testuser123",
  "bio": "I love FlipFeeds",
  ...
}

Success Criteria:
✅ Username claimed in v1/usernames/{username}
✅ User profile updated with username
✅ Attempting to use same username again fails
```

#### Test 1.4: Get User Profile
**Flow:** `getUserProfileFlow`

**Test Case:**
```
User: Show me my profile

Expected MCP Call:
{
  "tool": "getUserProfileFlow",
  "arguments": {
    "uid": "<auto-injected>"
  }
}

Success Criteria:
✅ Returns current user profile
✅ Includes username, bio, feedCount
```

---

### Phase 2: Feed Management Tests

These depend on User profile existing.

#### Test 2.1: Create First Feed
**Flow:** `createFeedFlow`

**Test Case:**
```
User: Create a private Feed called "My Test Feed" for testing

Expected MCP Call:
{
  "tool": "createFeedFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "name": "My Test Feed",
    "description": "A feed for testing",
    "visibility": "private"
  }
}

Expected Response:
{
  "feedId": "feed_...",
  "name": "My Test Feed",
  "description": "A feed for testing",
  "visibility": "private",
  "ownerId": "<uid>",
  "memberCount": 1,
  "flipCount": 0,
  "createdAt": "..."
}

Success Criteria:
✅ Feed created in v1/feeds/{feedId}
✅ User added as admin in v1/feeds/{feedId}/members/{uid}
✅ Reverse lookup created in v1/users/{uid}/feeds/{feedId}
✅ User's feedCount incremented to 1
```

#### Test 2.2: Create Public Feed
**Flow:** `createFeedFlow`

**Test Case:**
```
User: Create a public Feed called "Public Test Feed"

Expected Arguments:
{
  "uid": "<auto-injected>",
  "name": "Public Test Feed",
  "visibility": "public"
}

Success Criteria:
✅ Feed created with visibility: "public"
✅ User's feedCount incremented to 2
```

#### Test 2.3: List User's Feeds
**Flow:** `listUserFeedsFlow`

**Test Case:**
```
User: Show me all my Feeds

Expected Response:
{
  "feeds": [
    {
      "feedId": "feed_...",
      "name": "My Test Feed",
      "role": "admin",
      "memberCount": 1,
      "flipCount": 0
    },
    {
      "feedId": "feed_...",
      "name": "Public Test Feed",
      "role": "admin",
      "memberCount": 1,
      "flipCount": 0
    }
  ]
}

Success Criteria:
✅ Returns both Feeds
✅ Shows correct role (admin)
✅ Shows correct counts
```

#### Test 2.4: Get Feed Details
**Flow:** `getFeedDetailsFlow`

**Test Case:**
```
User: Show me details about my "My Test Feed"

Expected MCP Call:
{
  "tool": "getFeedDetailsFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "feedId": "<feed-id-from-test-2.1>"
  }
}

Success Criteria:
✅ Returns full Feed details
✅ Includes tags, description, stats
```

#### Test 2.5: Search Public Feeds
**Flow:** `searchPublicFeedsFlow`

**Test Case:**
```
User: Search for public Feeds with "test" in the name

Expected MCP Call:
{
  "tool": "searchPublicFeedsFlow",
  "arguments": {
    "query": "test"
  }
}

Expected Response:
{
  "feeds": [
    {
      "feedId": "...",
      "name": "Public Test Feed",
      "visibility": "public",
      ...
    }
  ]
}

Success Criteria:
✅ Only returns public Feeds
✅ Private feeds NOT returned
```

---

### Phase 3: Flip Link Tests

These depend on Feeds existing.

#### Test 3.1: Generate Flip Link
**Flow:** `generateFlipLinkFlow`

**Test Case:**
```
User: Generate a Flip Link for my "My Test Feed" that expires in 24 hours

Expected MCP Call:
{
  "tool": "generateFlipLinkFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "feedId": "<feed-id-from-test-2.1>",
    "expiresInHours": 24,
    "singleUse": false
  }
}

Expected Response:
{
  "linkId": "link_...",
  "shortCode": "abc123",
  "feedId": "...",
  "createdBy": "<uid>",
  "expiresAt": "<24-hours-from-now>",
  "isConsumed": false,
  "singleUse": false
}

Success Criteria:
✅ Flip Link created in v1/flipLinks/{linkId}
✅ shortCode is 6 characters
✅ expiresAt is ~24 hours from now
```

#### Test 3.2: Get Flip Link Details
**Flow:** `getFlipLinkFlow`

**Test Case:**
```
User: Show me details about Flip Link "abc123"

Expected MCP Call:
{
  "tool": "getFlipLinkFlow",
  "arguments": {
    "linkId": "<link-id-from-test-3.1>"
  }
}

Success Criteria:
✅ Returns Flip Link details
✅ Shows expiration status
```

#### Test 3.3: Redeem Flip Link (Second User)
**Flow:** `redeemFlipLinkFlow`

**Prerequisites:** Create a second test user first

**Test Case:**
```
User 2: Join the Feed using Flip Link "abc123"

Expected MCP Call:
{
  "tool": "redeemFlipLinkFlow",
  "arguments": {
    "uid": "<user2-uid>",
    "shortCode": "abc123"
  }
}

Expected Response:
{
  "success": true,
  "feedId": "<feed-id>",
  "feedName": "My Test Feed",
  "role": "member"
}

Success Criteria:
✅ User 2 added to v1/feeds/{feedId}/members/{user2-uid}
✅ Reverse lookup created in v1/users/{user2-uid}/feeds/{feedId}
✅ Feed memberCount incremented to 2
✅ User 2's feedCount incremented
```

#### Test 3.4: Redeem Single-Use Flip Link
**Flow:** `generateFlipLinkFlow` + `redeemFlipLinkFlow`

**Test Case:**
```
1. User: Generate a single-use Flip Link for my Feed
2. User 3: Redeem it
3. User 4: Try to redeem the same link

Expected:
✅ User 3 joins successfully
✅ Flip Link marked as consumed
❌ User 4 gets error "Flip Link already used"
```

---

### Phase 4: Private Feed Invite Tests

These depend on Feeds existing.

#### Test 4.1: Generate Invite (Admin Only)
**Flow:** `generateInviteFlow`

**Test Case:**
```
User: Generate a single-use invite for my "My Test Feed"

Expected MCP Call:
{
  "tool": "generateInviteFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "feedId": "<feed-id>",
    "expiresInHours": 168
  }
}

Expected Response:
{
  "inviteId": "invite_...",
  "feedId": "...",
  "createdBy": "<uid>",
  "expiresAt": "<7-days-from-now>",
  "isConsumed": false
}

Success Criteria:
✅ Invite created in v1/feeds/{feedId}/invites/{inviteId}
✅ Only feed admin can generate invites
```

#### Test 4.2: Accept Invite
**Flow:** `acceptInviteFlow`

**Test Case:**
```
User 5: Accept invite "invite_..."

Expected MCP Call:
{
  "tool": "acceptInviteFlow",
  "arguments": {
    "uid": "<user5-uid>",
    "inviteId": "<invite-id-from-test-4.1>"
  }
}

Success Criteria:
✅ User 5 joins Feed
✅ Invite marked as consumed
✅ Cannot reuse invite
```

#### Test 4.3: List Feed Invites (Admin Only)
**Flow:** `listFeedInvitesFlow`

**Test Case:**
```
User: Show me all invites for my "My Test Feed"

Expected Response:
{
  "invites": [
    {
      "inviteId": "...",
      "isConsumed": true,
      "consumedBy": "<user5-uid>",
      "expiresAt": "...",
      "createdAt": "..."
    }
  ]
}

Success Criteria:
✅ Only feed admin can list invites
✅ Shows consumed status
```

#### Test 4.4: Get Invite Details
**Flow:** `getInviteFlow`

**Test Case:**
```
User: Get details for invite "invite_..."

Success Criteria:
✅ Returns invite metadata
✅ Shows if expired or consumed
```

---

### Phase 5: Flip Management Tests

These depend on Feeds existing.

#### Test 5.1: Create Flip
**Flow:** `createFlipFlow`

**Test Case:**
```
User: Create a Flip in my "My Test Feed" with video URL "https://example.com/video.mp4"

Expected MCP Call:
{
  "tool": "createFlipFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "feedId": "<feed-id>",
    "videoUrl": "https://example.com/video.mp4",
    "title": "My First Flip"
  }
}

Expected Response:
{
  "flipId": "flip_...",
  "feedId": "...",
  "authorId": "<uid>",
  "title": "My First Flip",
  "videoUrl": "https://example.com/video.mp4",
  "aiSummary": "Mock AI summary",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "createdAt": "..."
}

Success Criteria:
✅ Flip created in v1/flips/{flipId}
✅ Feed flipCount incremented
✅ Author data denormalized
```

#### Test 5.2: Get Flip Details
**Flow:** `getFlipFlow`

**Test Case:**
```
User: Show me details for Flip "flip_..."

Expected MCP Call:
{
  "tool": "getFlipFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "flipId": "<flip-id-from-test-5.1>"
  }
}

Success Criteria:
✅ Returns Flip details
✅ Includes AI summary and thumbnail
```

#### Test 5.3: List Feed Flips
**Flow:** `listFeedFlipsFlow`

**Test Case:**
```
User: Show me all Flips in my "My Test Feed"

Expected MCP Call:
{
  "tool": "listFeedFlipsFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "feedId": "<feed-id>",
    "limit": 10
  }
}

Expected Response:
{
  "flips": [
    {
      "flipId": "flip_...",
      "title": "My First Flip",
      "authorDisplayName": "Test User",
      "createdAt": "...",
      ...
    }
  ]
}

Success Criteria:
✅ Returns Flips ordered by createdAt DESC
✅ Includes denormalized author data
```

#### Test 5.4: List User's Aggregated Flips
**Flow:** `listUserFlipsFlow`

**Test Case:**
```
User: Show me all Flips from all my Feeds

Expected MCP Call:
{
  "tool": "listUserFlipsFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "limit": 20
  }
}

Success Criteria:
✅ Returns Flips from all user's Feeds
✅ Handles Firestore 'in' query limitation (max 10 feeds)
✅ Ordered by createdAt DESC
```

#### Test 5.5: Delete Flip (Author)
**Flow:** `deleteFlipFlow`

**Test Case:**
```
User: Delete Flip "flip_..."

Expected MCP Call:
{
  "tool": "deleteFlipFlow",
  "arguments": {
    "uid": "<auto-injected>",
    "flipId": "<flip-id>"
  }
}

Success Criteria:
✅ Flip deleted from v1/flips/{flipId}
✅ Feed flipCount decremented
✅ Only author or feed admin can delete
```

---

### Phase 6: Member Management Tests

These depend on Feeds with multiple members.

#### Test 6.1: Leave Feed
**Flow:** `leaveFeedFlow`

**Test Case:**
```
User 2: Leave the "My Test Feed"

Expected MCP Call:
{
  "tool": "leaveFeedFlow",
  "arguments": {
    "uid": "<user2-uid>",
    "feedId": "<feed-id>"
  }
}

Success Criteria:
✅ Member document deleted from v1/feeds/{feedId}/members/{user2-uid}
✅ Reverse lookup deleted from v1/users/{user2-uid}/feeds/{feedId}
✅ Feed memberCount decremented
✅ User feedCount decremented
```

#### Test 6.2: Kick Member (Admin Only)
**Flow:** `kickMemberFlow`

**Prerequisites:** Add User 2 back to the Feed first

**Test Case:**
```
User (Admin): Kick user2 from "My Test Feed"

Expected MCP Call:
{
  "tool": "kickMemberFlow",
  "arguments": {
    "uid": "<admin-uid>",
    "feedId": "<feed-id>",
    "targetUserId": "<user2-uid>"
  }
}

Success Criteria:
✅ Only admin can kick members
✅ User 2 removed from Feed
✅ Counts decremented
❌ Non-admin attempting to kick gets error
```

#### Test 6.3: Update Member Role (Admin Only)
**Flow:** `updateMemberRoleFlow`

**Prerequisites:** Add User 2 back to the Feed again

**Test Case:**
```
User (Admin): Promote user2 to moderator in "My Test Feed"

Expected MCP Call:
{
  "tool": "updateMemberRoleFlow",
  "arguments": {
    "uid": "<admin-uid>",
    "feedId": "<feed-id>",
    "targetUserId": "<user2-uid>",
    "newRole": "moderator"
  }
}

Success Criteria:
✅ Only admin can update roles
✅ User 2's role changed to "moderator"
✅ Role reflected in v1/feeds/{feedId}/members/{user2-uid}
```

---

## 🎯 Testing Summary Checklist

### User Flows (4)
- [ ] createUserFlow
- [ ] checkUsernameFlow
- [ ] updateUserProfileFlow
- [ ] getUserProfileFlow

### Feed Flows (8)
- [ ] createFeedFlow (private)
- [ ] createFeedFlow (public)
- [ ] listUserFeedsFlow
- [ ] getFeedDetailsFlow
- [ ] searchPublicFeedsFlow
- [ ] joinFeedFlow (via Flip Link redemption)
- [ ] leaveFeedFlow
- [ ] kickMemberFlow (admin)
- [ ] updateMemberRoleFlow (admin)

### Flip Link Flows (3)
- [ ] generateFlipLinkFlow (multi-use)
- [ ] generateFlipLinkFlow (single-use)
- [ ] redeemFlipLinkFlow
- [ ] getFlipLinkFlow

### Invite Flows (4)
- [ ] generateInviteFlow
- [ ] acceptInviteFlow
- [ ] getInviteFlow
- [ ] listFeedInvitesFlow

### Flip Flows (5)
- [ ] createFlipFlow
- [ ] getFlipFlow
- [ ] listFeedFlipsFlow
- [ ] listUserFlipsFlow
- [ ] deleteFlipFlow

---

## 🐛 Common Issues & Debugging

### Issue: "Tool not found"
**Debug:**
1. Check logs: `>  Found X FlipFeeds flows`
2. Verify flow name matches exactly
3. Ensure flows are imported in genkit.ts and mcpServer.ts

### Issue: "Authentication failed"
**Debug:**
1. Check OAuth flow completed
2. Verify JWT_SECRET in .secret.local
3. Check Bearer token in request headers

### Issue: "Permission denied"
**Debug:**
1. Verify uid is being auto-injected
2. Check role-based permissions (admin-only operations)
3. Verify Feed membership

### Issue: "Document not found"
**Debug:**
1. Check Firestore emulator UI (http://localhost:4000)
2. Verify document IDs from previous tests
3. Check collection paths match schema

---

## 📊 Success Criteria

**All tests pass when:**
- ✅ 24 flows execute without errors
- ✅ Firestore data matches expected schema
- ✅ Counts (memberCount, flipCount, feedCount) stay in sync
- ✅ Permissions enforced correctly (admin-only operations)
- ✅ Username uniqueness enforced
- ✅ Flip Links expire/consume correctly
- ✅ Denormalized data stays consistent

---

## 🚀 Next Steps After Testing

Once all tests pass:
1. ✅ Mark "Test MCP Integration" as complete in todo list
2. ✅ Update IMPLEMENTATION_COMPLETED.md
3. ➡️ Proceed to Phase 1.4 (Security Rules)
4. ➡️ Proceed to Phase 1.5 (Denormalization Triggers)
5. ➡️ Deploy to production Firebase project
6. ➡️ Test with real ChatGPT/Claude Desktop

---

**Ready to start testing!** Begin with Phase 1 (User Management) and work your way down. 🎯
