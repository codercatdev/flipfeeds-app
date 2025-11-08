#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateVersion } = require('./generate-version');

const platform = process.argv[2]; // 'android' or 'ios'

if (!platform || !['android', 'ios'].includes(platform)) {
    console.error('Usage: node upload-to-firebase.js <android|ios>');
    process.exit(1);
}

const versionInfo = generateVersion();

console.log(`\n🚀 Uploading ${platform} build to Firebase App Distribution\n`);

// Determine file path
let appPath;
let releaseNotes = `Version: ${versionInfo.version}\nBranch: ${versionInfo.branch}\nCommit: ${versionInfo.commitHash}`;

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
        console.error('❌ IPA not found. Build and export the release first with: npm run ios:export');
        process.exit(1);
    }
}

// Get groups from environment or use default
const groups = process.env.FIREBASE_GROUPS || 'testers';

// Construct the Firebase CLI command
const command = [
    'firebase appdistribution:distribute',
    `"${appPath}"`,
    `--app ${platform === 'android' ? process.env.FIREBASE_ANDROID_APP_ID || 'YOUR_ANDROID_APP_ID' : process.env.FIREBASE_IOS_APP_ID || 'YOUR_IOS_APP_ID'}`,
    `--groups "${groups}"`,
    `--release-notes "${releaseNotes}"`,
].join(' ');

console.log('📦 File:', appPath);
console.log('📝 Release Notes:', releaseNotes);
console.log('👥 Groups:', groups);
console.log('\nExecuting Firebase CLI...\n');

try {
    execSync(command, { stdio: 'inherit' });
    console.log('\n✅ Successfully uploaded to Firebase App Distribution!');
} catch (error) {
    console.error('\n❌ Failed to upload to Firebase App Distribution');
    console.error('Make sure you have:');
    console.error('  1. Firebase CLI installed: npm install -g firebase-tools');
    console.error('  2. Logged in: firebase login');
    console.error('  3. Set FIREBASE_ANDROID_APP_ID and FIREBASE_IOS_APP_ID environment variables');
    process.exit(1);
}
