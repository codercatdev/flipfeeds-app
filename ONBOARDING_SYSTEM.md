# Username & Onboarding System

## Overview
FlipFeeds now includes a comprehensive username system with onboarding flow and change restrictions to prevent abuse and ensure unique user identification.

## Key Features

### 1. **Onboarding Flow**
- New users (especially Google sign-in) must complete onboarding before accessing the app
- Onboarding screen (`app/(auth)/onboarding.tsx`) requires selecting a unique username
- Username availability is checked in real-time against Firestore
- Users can only proceed once they've selected an available username

### 2. **Username Requirements**
- Minimum 3 characters
- Only lowercase letters (a-z), numbers (0-9), and underscores (_)
- Must be unique across all users
- Auto-sanitized on input to prevent invalid characters

### 3. **Change Restrictions**
- Users can update their username from the Profile screen
- **7-day cooldown** between username changes
- Cooldown timer displays remaining days in the profile
- Change history tracked in `usernameHistory` subcollection

### 4. **Data Model**

#### User Document (`users/{userId}`)
```typescript
{
  uid: string;
  username?: string;                    // Optional until onboarding complete
  displayName: string;
  email: string;
  photoURL?: string;
  fcmToken?: string;
  createdAt: number;
  hasCompletedOnboarding?: boolean;     // True once username is set
  usernameLastChanged?: number;         // Timestamp for 7-day cooldown
}
```

#### Username History (`users/{userId}/usernameHistory/{historyId}`)
```typescript
{
  oldUsername: string | null;          // null for initial username
  newUsername: string;
  timestamp: number;
}
```

## Navigation Flow

### For New Users
1. Sign up via Google or Email
2. User profile created with `hasCompletedOnboarding: false`
3. **Redirected to onboarding screen** (`/(auth)/onboarding`)
4. Must choose available username
5. Once username set, redirected to app (`/(tabs)`)

### For Existing Users
1. Sign in
2. If `hasCompletedOnboarding === false`, redirect to onboarding
3. Otherwise, proceed to main app

## Implementation Details

### AuthContext Functions

#### `completeOnboarding(username: string)`
- Called from onboarding screen
- Validates username uniqueness
- Updates user document with username, sets `hasCompletedOnboarding: true`
- Records change in `usernameHistory` subcollection

#### `updateUsername(newUsername: string)`
- Called from profile screen
- Validates 7-day cooldown
- Validates username uniqueness
- Updates user document and records history

#### `canChangeUsername()`
- Returns `{ canChange: boolean, daysRemaining: number }`
- Calculates time since last change
- Used to disable/enable username change UI

### Firestore Security Rules

```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && isOwner(userId);
  allow update: if isAuthenticated() && isOwner(userId);
  
  match /usernameHistory/{historyId} {
    allow read: if isAuthenticated() && isOwner(userId);
    allow create: if isAuthenticated() && isOwner(userId);
    allow update, delete: if false; // Immutable history
  }
}
```

### Firestore Indexes

Username field is indexed for efficient queries:
```json
{
  "collectionGroup": "users",
  "fieldPath": "username",
  "indexes": [
    {
      "order": "ASCENDING",
      "queryScope": "COLLECTION"
    }
  ]
}
```

## User Interface

### Onboarding Screen
- Welcome message explaining username system
- Input with @ prefix
- "Check Availability" button
- Green/red feedback for availability
- "Continue" button (only enabled when username available)

### Profile Screen
- Username displayed as clickable `@username` with edit icon
- Tapping opens modal for username change
- Modal shows:
  - Current username pre-filled
  - 7-day cooldown warning (if applicable)
  - Username input with validation
  - Cancel/Update buttons

## Backward Compatibility

### Email Signup (Legacy)
- Login screen still supports username input during signup
- Uses `signUpWithEmail(email, password, displayName, username)`
- Immediately sets username and completes onboarding
- Maintains compatibility for email-based signups

### Google Sign-In (New Flow)
- Creates user without username
- Redirects to onboarding
- User must choose username before app access

## Best Practices

### For Development
1. Test onboarding flow by signing in with new Google account
2. Test username change cooldown by manually setting `usernameLastChanged`
3. Verify username uniqueness by attempting to use existing username
4. Check navigation redirects work correctly

### For Production
1. Deploy Firestore rules and indexes before app release
2. Consider creating Cloud Function to enforce username uniqueness at database level
3. Monitor `usernameHistory` collection for abuse patterns
4. Consider adding username reclaim logic (if user deletes account)

## Future Enhancements

Potential improvements to consider:
- Reserved usernames list (e.g., 'admin', 'support', 'flipfeeds')
- Username validation Cloud Function (server-side enforcement)
- Username suggestions when chosen name is taken
- Username search autocomplete
- Display name vs username differentiation in UI
- Transfer username history on account merge
- Analytics on username change patterns

## Files Modified

### Core Implementation
- `types/index.ts` - Added User fields and UsernameChange interface
- `contexts/AuthContext.tsx` - Added onboarding and username functions
- `app/(auth)/onboarding.tsx` - New onboarding screen (created)
- `app/_layout.tsx` - Navigation logic for onboarding redirect
- `app/(tabs)/profile.tsx` - Username editing UI and modal

### Configuration
- `firestore.rules` - Security rules for usernameHistory
- `firestore.indexes.json` - Index for username field

### Backward Compatibility
- `app/(auth)/login.tsx` - Legacy email signup with username

## Testing Checklist

- [ ] New Google sign-in redirects to onboarding
- [ ] Onboarding validates username availability
- [ ] Onboarding prevents submission with invalid username
- [ ] Onboarding completes and redirects to app
- [ ] Profile shows current username
- [ ] Username modal displays correctly
- [ ] 7-day cooldown prevents premature changes
- [ ] Username change validates uniqueness
- [ ] Username change updates profile immediately
- [ ] History subcollection records all changes
- [ ] Email signup still works (legacy flow)
- [ ] Sign out and sign in preserves username
