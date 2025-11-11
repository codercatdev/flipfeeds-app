#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { generateVersion } = require('./generate-version');

// Generate version info with branch awareness
const versionInfo = generateVersion();
const { version, versionCode } = versionInfo;

console.log(`Syncing Android version to: ${version} (versionCode ${versionCode})`);

// Update build.gradle
const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');

if (!fs.existsSync(buildGradlePath)) {
    console.error('❌ Error: android/app/build.gradle not found');
    console.log('   Run "expo prebuild" first to generate native folders');
    process.exit(1);
}

let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

// Update versionCode
buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);

// Update versionName
buildGradle = buildGradle.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);

fs.writeFileSync(buildGradlePath, buildGradle, 'utf8');

console.log('✅ Android version synced successfully!');
console.log(`   Version: ${version}`);
console.log(`   Version Code: ${versionCode}`);
console.log(`   Branch: ${versionInfo.branch}`);
console.log(`   Is Release: ${versionInfo.isRelease}`);
