# Version Management Scripts

These scripts automatically sync the app version with **semantic versioning** and **branch-aware** version strings from `package.json` to both Android and iOS native configurations.

## Scripts

### `generate-version.js`
Core version generator with semantic versioning and branch awareness:
- **Main branch**: Uses version as-is (e.g., `1.2.3`)
- **Other branches**: Adds prerelease identifier (e.g., `1.2.3-dev.45+abc123`)
- Calculates version codes automatically
- Outputs: version, versionCode, branch, commit hash, release status

### `sync-android-version.js`
Syncs version to Android's `build.gradle`:
- Updates `versionCode`
- Updates `versionName` (with branch info on non-main branches)

### `sync-ios-version.js`
Syncs version to iOS's `Info.plist`:
- Updates `CFBundleShortVersionString` (display version)
- Updates `CFBundleVersion` (build number)

### `upload-to-firebase.js`
Uploads builds to Firebase App Distribution:
- Automatically includes version and branch info in release notes
- Supports tester groups configuration
- Works for both Android APK and iOS IPA

## Semantic Versioning

### Version Format

**Main/Master Branch (Production):**
```
1.2.3
```

**Feature/Dev Branches:**
```
1.2.3-branch-name.123+abc1234
       │          │    │
       │          │    └─ Git commit hash (short)
       │          └────── Commit count
       └─────────────── Sanitized branch name
```

### Version Code Formula

```
versionCode = (major * 10000) + (minor * 100) + patch + commitCount
```

Examples:
- Main: `1.2.3` → versionCode `10203`
- Dev: `1.2.3-dev.45+abc123` → versionCode `10248` (10203 + 45)

This ensures:
- ✅ Every build has a unique, incrementing version code
- ✅ Branch builds don't conflict with production
- ✅ Easy to identify branch and commit from version string

## Usage

### View Current Version Info

```bash
npm run version:show
```

Output:
```
📦 Version Info:
   Version: 1.2.3-feature-auth.127+a1b2c3d
   Version Code: 10330
   Branch: feature/auth
   Commit: a1b2c3d
   Is Release: false
```

### Build & Distribute

**Android:**
```bash
# Build only
npm run android:release

# Build + Upload to Firebase
npm run android:distribute
```

**iOS:**
```bash
# Build only
npm run ios:release

# Build + Upload to Firebase  
npm run ios:distribute
```

### Manual Steps

1. Update version in `package.json`:
   ```json
   {
     "version": "1.2.3"
   }
   ```

2. Run prebuild (if native folders don't exist):
   ```bash
   npm run prebuild
   ```

3. Build and distribute:
   ```bash
   npm run android:distribute
   npm run ios:distribute
   ```

## Firebase App Distribution Setup

### 1. Get Firebase App IDs

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings > Your apps
4. Copy the App IDs for Android and iOS

### 2. Configure Environment Variables

Create a `.env` file (see `.env.example`):

```bash
FIREBASE_ANDROID_APP_ID=1:123456789:android:abc123
FIREBASE_IOS_APP_ID=1:123456789:ios:abc123
FIREBASE_TOKEN=your-ci-token
FIREBASE_GROUPS=internal-testers
```

Get Firebase token:
```bash
firebase login:ci
```

### 3. Set Up Tester Groups

In Firebase Console > App Distribution > Testers & Groups:
- Create groups like `internal-testers`, `production-testers`, `qa-team`
- Add tester emails to groups

### 4. GitHub Secrets (for CI/CD)

Add these secrets in GitHub Settings > Secrets:
- `FIREBASE_TOKEN`
- `FIREBASE_ANDROID_APP_ID`
- `FIREBASE_IOS_APP_ID`
- `EXPO_TOKEN`

## CI/CD (GitHub Actions)

### Triggers

Builds automatically run on:
- Push to `main`, `develop`, `feature/*`, `release/*` branches
- Pull requests to `main`
- Tag pushes (e.g., `v1.2.3`)
- Manual workflow dispatch

### Branch-Based Distribution

```yaml
# Main branch → production-testers group
# Other branches → internal-testers group
```

The workflow automatically:
1. Calculates branch-aware version
2. Builds the app
3. Uploads to Firebase App Distribution with appropriate tester group

## Workflow Examples

### Development Build (feature branch)

```bash
git checkout -b feature/new-login
# Make changes
git commit -m "Add new login flow"
git push
```

GitHub Actions will:
- Build version: `1.2.3-feature-new-login.45+abc123`
- Upload to `internal-testers` group

### Production Release

```bash
# Update version in package.json to 1.3.0
git checkout main
git commit -m "Bump version to 1.3.0"
git tag v1.3.0
git push --tags
```

GitHub Actions will:
- Build version: `1.3.0`
- Upload to `production-testers` group

## Important Notes

- **Never commit** `android/` and `ios/` folders when using Expo managed workflow
- Version sync scripts must run **after** `expo prebuild`
- Both scripts exit with error if native folders don't exist
- Version sync is automatically included in all release build commands
- Firebase App Distribution requires Firebase CLI to be installed
