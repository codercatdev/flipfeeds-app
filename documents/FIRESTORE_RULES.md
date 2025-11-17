# FlipFeeds Firestore Security Rules

This document explains the comprehensive security rules for the FlipFeeds application.

## Overview

The Firestore security rules implement a **multi-tenant, feed-based permission system** where:
- **Feeds** are the primary organizational unit (tenants)
- **Users** can be members of multiple Feeds with different roles
- **Personal Feeds** provide private spaces for each user
- **Flips** (short-form videos) inherit permissions from their parent Feed
- All sensitive operations are handled by **backend Genkit flows**

## Core Security Principles

### 1. **Firebase-First Authentication**
- All operations require authentication (`isAuthenticated()`)
- User identity is verified via `request.auth.uid`
- Phone number verification is mandatory (handled in Auth rules)

### 2. **Principle of Least Privilege**
- Users can only access data they're explicitly permitted to see
- Write operations are restricted to backend flows for sensitive data
- Read operations are scoped by Feed membership

### 3. **Multi-Tenant Security**
- Feeds act as security boundaries
- Membership in `feeds/{feedId}/members/{userId}` controls access
- Role-based permissions: `admin`, `moderator`, `member`

### 4. **Defense in Depth**
- Client-side rules prevent unauthorized access
- Backend Genkit flows provide additional validation
- Firestore indexes enforce efficient queries

## Collection Rules

### `/users/{userId}`

**Purpose**: Store user profiles and account data.

**Read Access**:
- ✅ Any authenticated user can read any profile (for social features)
- ✅ Users can read their own sub-collections

**Write Access**:
- ✅ Users can create their own profile (via `userFlows`)
- ✅ Users can update their own profile
- ❌ Users cannot delete profiles (use backend flows for account deletion)

**Sub-collections**:
- `usernameHistory/{historyId}` - Immutable audit log of username changes
- `feeds/{feedId}` - Reverse lookup of user's feed memberships (read-only from client)
- `personalFeed` - Reference to user's personal feed (read-only from client)

**Key Rules**:
```javascript
allow get: if isAuthenticated();
allow create: if isAuthenticated() && isOwner(userId);
allow update: if isAuthenticated() && isOwner(userId);
```

---

### `/feeds/{feedId}`

**Purpose**: Central collection for all Feeds (public, private, and personal).

**Read Access**:
- ✅ Personal feeds: Only the owner
- ✅ Public feeds: All authenticated users
- ✅ Private feeds: Members only

**Write Access**:
- ❌ Create: Backend only (`createFeedFlow`)
- ✅ Update: Feed admins only (cannot change owner)
- ✅ Delete: Feed admins only

**Feed Types**:
1. **Public Feeds**: `visibility: "public"` - Discoverable and joinable
2. **Private Feeds**: `visibility: "private"` - Invite-only
3. **Personal Feeds**: `feedId: "personal_{userId}"` - Single-user private space

**Key Rules**:
```javascript
// Personal feed access
allow get: if isPersonalFeed(feedId) && ownsPersonalFeed(feedId);

// Public feed access
allow get: if !isPersonalFeed(feedId) && isAuthenticated() && 
            (isPublicFeed(feedId) || isMember(feedId));

// Admin-only updates
allow update: if isAuthenticated() && hasRole(feedId, 'admin');
```

**Sub-collection: `/feeds/{feedId}/members/{userId}`**

**Purpose**: Track feed membership and roles.

**Read Access**:
- ✅ Members can read the member list

**Write Access**:
- ❌ Create: Backend only (`joinFeedFlow`, invitation flows)
- ✅ Update: Admins can change roles (except their own)
- ✅ Delete: Users can leave; admins can remove others (not themselves)

**Roles**:
- `admin` - Full control over feed settings, members, and content
- `moderator` - Can moderate content (delete flips/comments)
- `member` - Can post flips and comments

---

### `/flips/{flipId}`

**Purpose**: Store all flips (short-form videos) across all feeds.

**Read Access**:
- ✅ Public feed flips: All authenticated users
- ✅ Private feed flips: Feed members only
- ⚠️ List queries must include `feedId` filter

**Write Access**:
- ✅ Create: Feed members only (after AI moderation via `createFlipFlow`)
- ✅ Update: Author only (cannot change feed or author)
- ✅ Delete: Author, or feed admin/moderator

**Required Fields** (enforced by `isValidFlipData()`):
- `feedId` - Parent feed
- `authorId` - Must match authenticated user
- `createdAt` - Server timestamp

**Key Rules**:
```javascript
// Read if member or public
allow get: if isAuthenticated() && 
            (isPublicFeed(feedId) || isMember(feedId));

// Create if member with valid data
allow create: if isAuthenticated() && 
               isMember(incomingFeedId) && 
               isValidFlipData();

// Delete by author or moderators
allow delete: if isAuthenticated() && 
               (isOwner(resource.data.authorId) || isAdminOrMod(feedId));
```

**Sub-collection: `/flips/{flipId}/comments/{commentId}`**

**Purpose**: Comments on flips.

**Read Access**:
- ✅ Same as parent flip (public or member-only)

**Write Access**:
- ✅ Create: Feed members only
- ✅ Update: Comment author only
- ✅ Delete: Comment author, or feed admin/moderator

**Sub-collection: `/flips/{flipId}/likes/{likeId}`**

**Purpose**: Track user likes on flips (future feature).

**Rules**:
- Like ID must equal user ID (prevents duplicate likes)
- Can only like flips in feeds you're a member of
- Can only delete your own likes

---

### `/friendships/{friendshipId}`

**Purpose**: Track user-to-user friendships.

**Read Access**:
- ✅ Users can read friendships they're part of
- ✅ List queries automatically filter by participant

**Write Access**:
- ✅ Create: If you're the requester and a participant
- ✅ Update: If you're a participant (for accepting requests)
- ✅ Delete: If you're a participant

**Key Fields**:
- `users` - Array of two user IDs
- `requesterId` - User who initiated the friendship

---

### `/invites/{inviteId}` (Future Feature)

**Purpose**: Feed invitations for private feeds.

**Read Access**:
- ✅ Inviter and invitee can read

**Write Access**:
- ✅ Create: Feed admins/moderators only
- ✅ Update: Invitee only (to accept/decline)
- ✅ Delete: Inviter or invitee

---

### `/flipLinks/{linkId}` (Future Feature)

**Purpose**: Viral sharing links for flips (one-tap join mechanism).

**Read Access**:
- ✅ Anyone (public sharing mechanism)
- ❌ Cannot list (prevents enumeration)

**Write Access**:
- ✅ Create: Feed members only
- ✅ Update/Delete: Creator only

---

## Helper Functions

### Authentication & Ownership

```javascript
isAuthenticated() // User is logged in
isOwner(userId)   // User owns the document
```

### Feed Membership & Roles

```javascript
isMember(feedId)         // User is a member of feed
hasRole(feedId, role)    // User has specific role in feed
isAdminOrMod(feedId)     // User is admin or moderator
getMemberData(feedId)    // Get user's membership document
```

### Feed Properties

```javascript
isPublicFeed(feedId)     // Feed has public visibility
isPersonalFeed(feedId)   // Feed ID matches personal_* pattern
ownsPersonalFeed(feedId) // User owns this personal feed
```

### Data Validation

```javascript
isValidFeedData()  // Validates feed document structure
isValidFlipData()  // Validates flip document structure
```

## Security Best Practices

### 1. **Query Limits**
All list operations have query limits to prevent abuse:
- Feeds: Max 50 per query
- Flips: Max 100 per query

### 2. **Backend-Only Operations**
Sensitive operations must go through Genkit flows:
- Creating feeds (`createFeedFlow`)
- Joining feeds (`joinFeedFlow` - future)
- Creating flips (`createFlipFlow` - includes AI moderation)
- User profile creation (`userFlows`)

### 3. **Immutable Fields**
Certain fields cannot be changed after creation:
- Feed owner (`owner` field)
- Flip author (`authorId` field)
- Flip feed association (`feedId` field)
- Username history (entire sub-collection)

### 4. **Role Restrictions**
Admins cannot:
- Promote themselves to a higher role
- Remove themselves from a feed
- Change feed ownership

### 5. **Personal Feed Protection**
Personal feeds (`personal_{userId}`):
- Never appear in discovery/list queries
- Only accessible by the owner
- Cannot be deleted by clients
- Always have `visibility: "personal"`

## Testing the Rules

### Using Firebase Emulator

```bash
# Start emulators
pnpm emulators

# Run in another terminal
firebase emulators:start --only firestore
```

### Test Cases to Verify

1. **User Profile Access**
   - ✅ Can create own profile
   - ✅ Can update own profile
   - ✅ Can read any profile
   - ❌ Cannot update others' profiles

2. **Public Feed Access**
   - ✅ Can read public feed metadata
   - ✅ Can read flips in public feeds
   - ❌ Cannot create feed without backend flow
   - ❌ Cannot join without membership record

3. **Private Feed Access**
   - ✅ Members can read feed and flips
   - ❌ Non-members cannot read feed or flips
   - ✅ Admins can update feed settings
   - ❌ Members cannot update feed settings

4. **Personal Feed Access**
   - ✅ Owner can read/write to personal feed
   - ❌ Others cannot access personal feed
   - ❌ Personal feeds don't appear in listings

5. **Flip Operations**
   - ✅ Members can create flips
   - ✅ Authors can update/delete own flips
   - ✅ Moderators can delete any flip
   - ❌ Non-members cannot create flips

6. **Role-Based Permissions**
   - ✅ Admins can change member roles
   - ✅ Members can leave feeds
   - ❌ Admins cannot promote themselves
   - ❌ Members cannot change roles

## Integration with Genkit Flows

### Backend Flow Security

All Genkit flows in `/functions/src/flows/` implement additional security:

1. **Authentication Check**: `requireAuth(context)`
2. **Permission Validation**: Verify feed membership, roles
3. **AI Moderation**: Content moderation before creation
4. **Data Validation**: Strict schema validation with Zod

### Flow Examples

**`createFeedFlow`**:
```typescript
// Backend creates both:
// 1. feeds/{feedId} document
// 2. feeds/{feedId}/members/{uid} document
// 3. users/{uid}/feeds/{feedId} reverse lookup
```

**`createFlipFlow`**:
```typescript
// Backend handles:
// 1. Membership verification
// 2. AI moderation (moderateVideo)
// 3. AI title/summary generation
// 4. Flip creation
```

## Migration Notes

### From Existing Rules

The new rules add:
- ✅ Complete feed-based multi-tenancy
- ✅ Personal feed protection
- ✅ Role-based access control
- ✅ Flip and comment permissions
- ✅ Future-ready invites and flip links

### Backward Compatibility

Existing collections retained:
- ✅ `users` collection (enhanced)
- ✅ `friendships` collection (unchanged)
- ✅ `usernameHistory` sub-collection (unchanged)

## Deployment

```bash
# Test with emulators first
pnpm emulators

# Deploy to production
firebase deploy --only firestore:rules

# Or deploy everything
pnpm deploy:all
```

## Monitoring & Auditing

### Firestore Usage Monitoring

Monitor these metrics in Firebase Console:
- Read/write operations per collection
- Query performance and indexes
- Security rule denials (potential attacks)

### Security Rule Denials

Check Cloud Logging for denied operations:
```
resource.type="cloud_firestore_database"
protoPayload.status.code=7
```

## Future Enhancements

1. **Invite System**: Full implementation of `/invites` collection
2. **Flip Links**: Viral sharing mechanism via `/flipLinks`
3. **Nested Feeds**: Support for feeds containing other feeds
4. **Advanced Roles**: Custom roles beyond admin/moderator/member
5. **Feed Analytics**: Read-only analytics sub-collections
6. **Notifications**: Push notification permissions and preferences

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.0  
**Adherence**: Follows all conventions in `AGENTS.md`
