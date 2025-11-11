#!/usr/bin/env node

require('dotenv').config();

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { generateVersion } = require('./generate-version');

const platform = process.argv[2]; // 'android' or 'ios'

if (!platform || !['android', 'ios'].includes(platform)) {
    console.error('Usage: node upload-to-firebase.js <android|ios>');
    process.exit(1);
}

const versionInfo = generateVersion();

console.log(`\n🚀 Uploading ${platform} build to Firebase App Distribution\n`);

// Check for required environment variables
const androidAppId = process.env.FIREBASE_ANDROID_APP_ID;
const iosAppId = process.env.FIREBASE_IOS_APP_ID;

if (platform === 'android' && !androidAppId) {
    console.error('❌ Error: FIREBASE_ANDROID_APP_ID not set');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Add your Firebase Android App ID from Firebase Console');
    console.error('   3. Format: FIREBASE_ANDROID_APP_ID=1:123456789:android:abc123');
    process.exit(1);
}

if (platform === 'ios' && !iosAppId) {
    console.error('❌ Error: FIREBASE_IOS_APP_ID not set');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Add your Firebase iOS App ID from Firebase Console');
    console.error('   3. Format: FIREBASE_IOS_APP_ID=1:123456789:ios:abc123');
    process.exit(1);
}

// Determine file path
let appPath;
const releaseNotes = `Version: ${versionInfo.version}\nBranch: ${versionInfo.branch}\nCommit: ${versionInfo.commitHash}`;

if (platform === 'android') {
    appPath = path.join(__dirname, '../android/app/build/outputs/apk/release/app-release.apk');

    if (!fs.existsSync(appPath)) {
        console.error('❌ APK not found. Build the release first with: npm run android:release');
        process.exit(1);
    }
} else if (platform === 'ios') {
    // For iOS, we need the IPA file
    appPath = path.join(__dirname, '../ios/build/flipfeedsapp.ipa');

    if (!fs.existsSync(appPath)) {
        console.error(
            '❌ IPA not found. Build and export the release first with: npm run ios:export'
        );
        process.exit(1);
    }
}

// Get groups from environment or use default
const groups = process.env.FIREBASE_GROUPS || 'testers';

// Get the app ID for the platform
const appId = platform === 'android' ? androidAppId : iosAppId;

// Construct the Firebase CLI command
const command = [
    'firebase appdistribution:distribute',
    `"${appPath}"`,
    `--app ${appId}`,
    `--groups "${groups}"`,
    `--release-notes "${releaseNotes}"`,
].join(' ');

console.log('📦 File:', appPath);
console.log('🆔 App ID:', appId);
console.log('📝 Release Notes:', releaseNotes);
console.log('👥 Groups:', groups);
console.log('\nExecuting Firebase CLI...\n');

try {
    execSync(command, { stdio: 'inherit' });
    console.log('\n✅ Successfully uploaded to Firebase App Distribution!');
    console.log(`   Testers in "${groups}" group will receive a notification.`);
} catch (_error) {
    console.error('\n❌ Failed to upload to Firebase App Distribution');
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Firebase CLI is installed: npm install -g firebase-tools');
    console.error('  2. Login to Firebase: firebase login');
    console.error('  3. Check your .env file has the correct App IDs');
    console.error('  4. Verify the tester group exists in Firebase Console');
    console.error('  5. Ensure you have permission to distribute to this app');
    process.exit(1);
}
