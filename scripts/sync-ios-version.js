#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { generateVersion } = require('./generate-version');

// Generate version info with branch awareness
const versionInfo = generateVersion();
const { version, versionCode } = versionInfo;
const buildNumber = versionCode.toString();

console.log(`Syncing iOS version to: ${version} (build ${buildNumber})`);

// Update Info.plist
const infoPlistPath = path.join(__dirname, '../ios/flipfeedsapp/Info.plist');

if (!fs.existsSync(infoPlistPath)) {
    console.error('❌ Error: ios/flipfeedsapp/Info.plist not found');
    console.log('   Run "expo prebuild" first to generate native folders');
    process.exit(1);
}

let infoPlist = fs.readFileSync(infoPlistPath, 'utf8');

// Update CFBundleShortVersionString (version)
infoPlist = infoPlist.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>.*?<\/string>/,
    `<key>CFBundleShortVersionString</key>\n\t<string>${version}</string>`
);

// Update CFBundleVersion (build number)
infoPlist = infoPlist.replace(
    /<key>CFBundleVersion<\/key>\s*<string>.*?<\/string>/,
    `<key>CFBundleVersion</key>\n\t<string>${buildNumber}</string>`
);

fs.writeFileSync(infoPlistPath, infoPlist, 'utf8');

console.log('✅ iOS version synced successfully!');
console.log(`   Version: ${version}`);
console.log(`   Build: ${buildNumber}`);
console.log(`   Branch: ${versionInfo.branch}`);
console.log(`   Is Release: ${versionInfo.isRelease}`);
