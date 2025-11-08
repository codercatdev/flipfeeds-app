# Firebase Cloud Functions Deployment Guide

## Prerequisites

1. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Google Cloud Project** with billing enabled

3. **Required APIs enabled**:
   - Cloud Functions API
   - Cloud Build API
   - Vertex AI API

## Initial Setup

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase Project

If not already initialized:

```bash
firebase init
```

Select:
- ✅ Functions
- ✅ Firestore
- Use an existing project (select your project)

### 3. Install Dependencies

```bash
cd functions
npm install
```

## Configuration

### Update Project ID

Edit `functions/src/index.ts` line 10:

```typescript
const vertexAI = new VertexAI({
  project: 'YOUR-PROJECT-ID', // ← Change this
  location: 'us-central1',
});
```

Find your project ID:
```bash
firebase projects:list
```

### Enable Vertex AI

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to Vertex AI
4. Enable the API
5. Ensure billing is enabled

## Local Development

### Start Emulators

```bash
# From project root
firebase emulators:start
```

This starts:
- Functions emulator on `localhost:5001`
- Firestore emulator on `localhost:8080`
- UI dashboard on `localhost:4000`

### Test Function Locally

In your mobile app, configure to use emulators:

```typescript
// Add to lib/firebaseConfig.ts (for development only)
if (__DEV__) {
  functions().useEmulator('localhost', 5001);
  firestore().useEmulator('localhost', 8080);
}
```

## Deployment

### Build Functions

```bash
cd functions
npm run build
```

Fix any TypeScript errors before deploying.

### Deploy to Firebase

**Option 1: Deploy only functions**
```bash
firebase deploy --only functions
```

**Option 2: Deploy specific function**
```bash
firebase deploy --only functions:getDailyTipTool
```

**Option 3: Deploy everything**
```bash
firebase deploy
```

### View Deployment Status

```bash
# See recent deployments
firebase deploy:status

# View function details
firebase functions:list
```

## Monitoring

### View Logs

**Real-time logs:**
```bash
firebase functions:log
```

**Logs for specific function:**
```bash
firebase functions:log --only getDailyTipTool
```

**Logs in Firebase Console:**
1. Go to Firebase Console
2. Functions section
3. Click on function name
4. View Logs tab

### Monitor Performance

Firebase Console > Functions > Dashboard shows:
- Invocation count
- Execution time
- Error rate
- Memory usage

## Testing Deployed Function

### From Mobile App

The app is already configured to call the function:

```typescript
const result = await functions().httpsCallable('getDailyTipTool')();
```

### From Command Line (for testing)

You cannot directly call `onCall` functions from curl, but you can test authentication:

```bash
# This should fail with "unauthenticated"
curl -X POST https://us-central1-YOUR-PROJECT.cloudfunctions.net/getDailyTipTool
```

## Troubleshooting

### Error: "Billing account not configured"

**Solution:**
1. Go to Google Cloud Console
2. Billing > Link a billing account
3. Enable Blaze plan in Firebase

### Error: "Vertex AI API not enabled"

**Solution:**
```bash
gcloud services enable aiplatform.googleapis.com
```

Or enable manually in Cloud Console.

### Error: "Function deployment failed"

**Check:**
1. TypeScript builds successfully: `npm run build`
2. No syntax errors in `index.ts`
3. All dependencies installed
4. Correct Node.js version (18)

```bash
# Check Node version
node --version

# Install dependencies again
cd functions
rm -rf node_modules package-lock.json
npm install
```

### Error: "CORS" when calling from web

**Solution:**
`onCall` functions automatically handle CORS. If testing from web:

```typescript
// Ensure Firebase is initialized correctly
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
```

## Function Configuration

### Environment Variables

Set environment variables for the function:

```bash
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
```

Access in code:
```typescript
const apiKey = functions.config().gemini.api_key;
```

### Increase Timeout/Memory

Edit `functions/src/index.ts`:

```typescript
export const getDailyTipTool = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

## Security Rules

### Firestore Rules

Deploy security rules:

```bash
firebase deploy --only firestore:rules
```

Verify rules in Firebase Console > Firestore > Rules.

### Function Security

The `onCall` function type automatically:
- ✅ Validates ID tokens
- ✅ Handles CORS
- ✅ Parses JSON
- ✅ Provides `context.auth` with user info

## Cost Considerations

### Pricing Tiers

**Spark Plan (Free):**
- 125K invocations/month
- 40K GB-seconds/month

**Blaze Plan (Pay-as-you-go):**
- Required for Vertex AI
- First 2M invocations free
- $0.40 per million invocations after
- Vertex AI charges separate

### Monitor Costs

1. Google Cloud Console > Billing
2. Set up budget alerts
3. Monitor Vertex AI usage

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: |
          cd functions
          npm install
          
      - name: Deploy to Firebase
        run: |
          npm install -g firebase-tools
          firebase deploy --only functions --token ${{ secrets.FIREBASE_TOKEN }}
```

Generate token:
```bash
firebase login:ci
```

## Best Practices

1. **Always build before deploying**
   ```bash
   npm run build && firebase deploy --only functions
   ```

2. **Test locally first**
   ```bash
   firebase emulators:start
   ```

3. **Monitor logs after deployment**
   ```bash
   firebase functions:log --only getDailyTipTool
   ```

4. **Use environment-specific configs**
   - Development: Use emulators
   - Staging: Separate Firebase project
   - Production: Main project

5. **Version your functions**
   ```typescript
   export const getDailyTipToolV2 = functions.https.onCall(...);
   ```

## Next Steps

After successful deployment:

1. ✅ Test function from mobile app
2. ✅ Monitor logs for errors
3. ✅ Set up alerts for failures
4. ✅ Document any environment-specific configuration
5. ✅ Create backup/rollback plan

---

**Function URL Format:**
```
https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME
```

**Example:**
```
https://us-central1-flipfeeds-app.cloudfunctions.net/getDailyTipTool
```
