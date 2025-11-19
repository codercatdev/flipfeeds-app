# Firebase App Hosting Deployment Guide

This guide explains how to deploy the Next.js web application to Firebase App Hosting.

## Overview

Firebase App Hosting is a serverless hosting platform optimized for Next.js applications. It provides:
- Automatic scaling based on traffic
- Global CDN for static assets
- Server-side rendering (SSR) support
- Built-in CI/CD from GitHub
- Environment variable management

## Prerequisites

1. **Firebase CLI** installed and authenticated:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **GitHub Repository** connected to your Firebase project

3. **Firebase Project** with App Hosting enabled:
   - Visit [Firebase Console](https://console.firebase.google.com/project/flipfeeds-app)
   - Enable App Hosting in the Build section

## Configuration Files

### 1. `apps/web/apphosting.yaml`
This file configures the Cloud Run instance that runs your Next.js app:

```yaml
runConfig:
  cpu: 1                    # CPU allocation
  memoryMiB: 512           # Memory in MB
  maxInstances: 10         # Max concurrent instances
  minInstances: 0          # Min instances (0 = scale to zero)
  concurrency: 80          # Requests per instance

env:
  - variable: NODE_ENV
    value: production
```

### 2. `apps/web/next.config.ts`
Ensure the Next.js config includes:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // Required for App Hosting
  // ... other config
};
```

### 3. `firebase.json`
App Hosting emulator configuration is already set up:

```json
{
  "emulators": {
    "apphosting": {
      "port": 5003,
      "rootDirectory": "./apps/web",
      "startCommand": "pnpm dev"
    }
  }
}
```

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

App Hosting automatically deploys from your GitHub repository.

1. **Create the backend** (one-time setup):
   ```bash
   # From the project root
   pnpm deploy:apphosting
   
   # Or manually:
   firebase apphosting:backends:create \
     --project flipfeeds-app \
     --location us-central1
   ```

2. **Configure the backend**:
   - Follow the prompts to connect your GitHub repository
   - Select the branch to deploy from (usually `main`)
   - Set the root directory to `apps/web`
   - Configure build settings:
     - Build command: `pnpm install && pnpm build`
     - Output directory: `.next`

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Configure App Hosting"
   git push origin main
   ```

   Firebase will automatically build and deploy your app!

### Method 2: Manual Deployment

Deploy directly from your local machine:

```bash
# From apps/web directory
cd apps/web
firebase apphosting:backends:deploy

# Or from project root
pnpm deploy:web
```

## Environment Variables

### Adding Environment Variables

1. **Via Firebase Console**:
   - Go to App Hosting → Your Backend → Configuration
   - Add environment variables in the "Environment variables" section

2. **Via `apphosting.yaml`**:
   ```yaml
   env:
     - variable: NEXT_PUBLIC_API_URL
       value: https://api.example.com
     
     # For secrets, use Cloud Secret Manager
     - variable: DATABASE_PASSWORD
       secret: database-password-secret
   ```

### Required Environment Variables

For FlipFeeds, you'll need:

```yaml
env:
  - variable: NODE_ENV
    value: production
  
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: your-firebase-api-key
  
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: flipfeeds-app.firebaseapp.com
  
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: flipfeeds-app
  
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: flipfeeds-app.firebasestorage.app
  
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: your-sender-id
  
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: your-app-id
```

## Testing Locally

### Run with Emulator

```bash
# From project root
firebase emulators:start

# The web app will be available at:
# http://localhost:5003
```

### Run in Development Mode

```bash
# From project root
pnpm dev:web

# Or from apps/web
cd apps/web
pnpm dev
```

## Monitoring & Logs

### View Deployment Status

```bash
firebase apphosting:backends:list
```

### View Logs

1. **Via Firebase Console**:
   - App Hosting → Your Backend → Logs

2. **Via Cloud Console**:
   - [Cloud Run Logs](https://console.cloud.google.com/run?project=flipfeeds-app)

### Metrics & Performance

- Visit the Cloud Run service in [Google Cloud Console](https://console.cloud.google.com/run?project=flipfeeds-app)
- Check CPU, memory, request count, and latency

## Rollback

To rollback to a previous deployment:

```bash
# List revisions
firebase apphosting:backends:list --project flipfeeds-app

# Rollback to specific revision
firebase apphosting:rollout:create BACKEND_ID \
  --revision REVISION_ID \
  --project flipfeeds-app
```

## Custom Domain

1. **Add domain in Firebase Console**:
   - App Hosting → Your Backend → Custom domains
   - Follow the DNS configuration instructions

2. **DNS Configuration**:
   - Add the provided TXT record for verification
   - Add A/AAAA records pointing to Firebase

## Troubleshooting

### Build Failures

1. Check build logs in Firebase Console
2. Verify `package.json` scripts are correct
3. Ensure all dependencies are in `package.json` (not just `devDependencies`)

### Runtime Errors

1. Check Cloud Run logs
2. Verify environment variables are set correctly
3. Check `next.config.ts` for `output: 'standalone'`

### Memory Issues

If the app runs out of memory:
1. Increase `memoryMiB` in `apphosting.yaml`
2. Optimize bundle size with `next-bundle-analyzer`

### Cold Start Performance

If cold starts are slow:
1. Set `minInstances: 1` in `apphosting.yaml` (costs more)
2. Optimize dependencies and reduce bundle size

## Additional Resources

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)

## Quick Reference

```bash
# Create backend (one-time)
pnpm deploy:apphosting

# Deploy from local
pnpm deploy:web

# Run emulator
firebase emulators:start

# View backends
firebase apphosting:backends:list

# View logs
firebase apphosting:backends:logs BACKEND_ID
```
