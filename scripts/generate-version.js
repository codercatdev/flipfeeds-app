#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Get the current git branch name
 */
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (_error) {
    console.warn('Warning: Could not determine git branch, defaulting to "main"');
    return 'main';
  }
}

/**
 * Get the current git commit hash (short)
 */
function getCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_error) {
    return 'unknown';
  }
}

/**
 * Get the number of commits on current branch
 */
function getCommitCount() {
  try {
    return parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim(), 10);
  } catch (_error) {
    return 0;
  }
}

/**
 * Convert version to version code
 * e.g., "1.2.3" -> 10203
 */
function getVersionCode(versionName) {
  // Extract just the semver part (remove prerelease/metadata)
  const semverMatch = versionName.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!semverMatch) {
    console.error('Invalid version format:', versionName);
    return 1;
  }

  const major = parseInt(semverMatch[1], 10);
  const minor = parseInt(semverMatch[2], 10);
  const patch = parseInt(semverMatch[3], 10);

  return major * 10000 + minor * 100 + patch;
}

/**
 * Generate a semver-compliant version string with branch info
 */
function generateVersion() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const baseVersion = packageJson.version;

  const branch = getCurrentBranch();
  const commitHash = getCommitHash();
  const commitCount = getCommitCount();

  let version;
  let versionCode;

  if (branch === 'main' || branch === 'master') {
    // Production build: use version as-is
    version = baseVersion;
    versionCode = getVersionCode(baseVersion);
  } else {
    // Development/feature build: add prerelease identifier
    // Sanitize branch name for semver (only alphanumeric and hyphens)
    const sanitizedBranch = branch.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

    // Format: 1.2.3-branch.commitCount+hash
    version = `${baseVersion}-${sanitizedBranch}.${commitCount}+${commitHash}`;

    // For non-main branches, add commit count to version code to ensure it increments
    versionCode = getVersionCode(baseVersion) + commitCount;
  }

  return {
    version,
    versionCode,
    branch,
    commitHash,
    commitCount,
    baseVersion,
    isRelease: branch === 'main' || branch === 'master',
  };
}

// If run directly, output the version info as JSON
if (require.main === module) {
  const versionInfo = generateVersion();

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(versionInfo, null, 2));
  } else {
    console.log('📦 Version Info:');
    console.log(`   Version: ${versionInfo.version}`);
    console.log(`   Version Code: ${versionInfo.versionCode}`);
    console.log(`   Branch: ${versionInfo.branch}`);
    console.log(`   Commit: ${versionInfo.commitHash}`);
    console.log(`   Is Release: ${versionInfo.isRelease}`);
  }
}

module.exports = { generateVersion, getVersionCode };
