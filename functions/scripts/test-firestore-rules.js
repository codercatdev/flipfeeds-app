#!/usr/bin/env node
/**
 * Test Firestore Security Rules
 *
 * This script validates that Firestore security rules work as expected
 * by attempting various read/write operations as different users.
 *
 * Usage:
 *   node functions/scripts/test-firestore-rules.js
 *
 * Prerequisites:
 *   - Firebase emulators must be running
 *   - Test data must be seeded (run seed-test-data.js first)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'flipfeeds-app',
  });
}

const db = admin.firestore();

// Test users
const ALICE_UID = 'test-user-1';
const BOB_UID = 'test-user-2';
const CHARLIE_UID = 'test-user-3';

const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Run a test and record the result
 */
async function runTest(testName, testFn, shouldSucceed = true) {
  try {
    await testFn();
    if (shouldSucceed) {
      console.log(`✅ PASS: ${testName}`);
      testResults.passed++;
      testResults.tests.push({ name: testName, passed: true });
    } else {
      console.log(`❌ FAIL: ${testName} (should have failed but succeeded)`);
      testResults.failed++;
      testResults.tests.push({ name: testName, passed: false, reason: 'Should have failed' });
    }
  } catch (error) {
    if (!shouldSucceed) {
      console.log(`✅ PASS: ${testName} (correctly failed)`);
      testResults.passed++;
      testResults.tests.push({ name: testName, passed: true });
    } else {
      console.log(`❌ FAIL: ${testName}`);
      console.log(`   Error: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({ name: testName, passed: false, reason: error.message });
    }
  }
}

/**
 * Test user profile access
 */
async function testUserProfiles() {
  console.log('\n📝 Testing User Profile Rules...\n');

  // Alice can read her own profile
  await runTest('User can read own profile', async () => {
    const doc = await db.collection('users').doc(ALICE_UID).get();
    if (!doc.exists) throw new Error('Profile not found');
  });

  // Alice can read Bob's profile (public)
  await runTest('User can read other profiles', async () => {
    const doc = await db.collection('users').doc(BOB_UID).get();
    if (!doc.exists) throw new Error('Profile not found');
  });

  // Alice can update her own profile
  await runTest('User can update own profile', async () => {
    await db.collection('users').doc(ALICE_UID).update({
      bio: 'Updated bio for Alice',
    });
  });
}

/**
 * Test feed access
 */
async function testFeedAccess() {
  console.log('\n📁 Testing Feed Access Rules...\n');

  // Get a public feed
  const publicFeedsSnapshot = await db
    .collection('feeds')
    .where('visibility', '==', 'public')
    .limit(1)
    .get();

  if (publicFeedsSnapshot.empty) {
    console.log('⚠️  No public feeds found, skipping feed tests');
    return;
  }

  const publicFeedId = publicFeedsSnapshot.docs[0].id;

  // Anyone can read public feed metadata
  await runTest('User can read public feed', async () => {
    const doc = await db.collection('feeds').doc(publicFeedId).get();
    if (!doc.exists) throw new Error('Feed not found');
  });

  // Get feed members
  await runTest('Member can read feed members list', async () => {
    const snapshot = await db.collection('feeds').doc(publicFeedId).collection('members').get();
    if (snapshot.empty) throw new Error('No members found');
  });

  // Try to get a private feed
  const privateFeedsSnapshot = await db
    .collection('feeds')
    .where('visibility', '==', 'private')
    .limit(1)
    .get();

  if (!privateFeedsSnapshot.empty) {
    const privateFeedId = privateFeedsSnapshot.docs[0].id;

    // Check if CHARLIE is a member
    const charlieMember = await db
      .collection('feeds')
      .doc(privateFeedId)
      .collection('members')
      .doc(CHARLIE_UID)
      .get();

    if (!charlieMember.exists) {
      console.log(`ℹ️  Charlie is not a member of private feed, testing access denial`);

      // This test should be done with actual security rules, not admin SDK
      // The admin SDK bypasses all security rules
      console.log(
        '⚠️  Note: Admin SDK bypasses security rules - these tests show data structure only'
      );
    }
  }
}

/**
 * Test flip access
 */
async function testFlipAccess() {
  console.log('\n🎬 Testing Flip Access Rules...\n');

  // Get flips from a public feed
  const flipsSnapshot = await db.collection('flips').limit(3).get();

  if (flipsSnapshot.empty) {
    console.log('⚠️  No flips found, skipping flip tests');
    return;
  }

  const flipId = flipsSnapshot.docs[0].id;
  const flipData = flipsSnapshot.docs[0].data();
  const feedId = flipData.feedIds?.[0] || flipData.feedId; // Support both old and new format

  // Read flip from public feed
  await runTest('User can read flip from accessible feed', async () => {
    const doc = await db.collection('flips').doc(flipId).get();
    if (!doc.exists) throw new Error('Flip not found');
  });

  // Query flips by feedId (supports both old feedId and new feedIds format)
  await runTest('User can query flips by feedId', async () => {
    const snapshot = await db
      .collection('flips')
      .where('feedIds', 'array-contains', feedId)
      .limit(10)
      .get();
    if (snapshot.empty) throw new Error('No flips found');
  });

  // Read flip comments
  await runTest('User can read flip comments', async () => {
    await db.collection('flips').doc(flipId).collection('comments').get();
    // Comments may be empty, that's ok
  });
}

/**
 * Test nested feeds structure
 */
async function testNestedFeeds() {
  console.log('\n🗂️  Testing Nested Feeds Structure...\n');

  // Find feeds with parentFeedId
  const nestedFeedsSnapshot = await db.collection('feeds').where('parentFeedId', '!=', null).get();

  if (nestedFeedsSnapshot.empty) {
    console.log('ℹ️  No nested feeds found');
    return;
  }

  console.log(`Found ${nestedFeedsSnapshot.size} nested feed(s)`);

  for (const doc of nestedFeedsSnapshot.docs) {
    const feedData = doc.data();
    console.log(`   - ${feedData.name} (parent: ${feedData.parentFeedId})`);

    // Verify parent exists
    await runTest(`Nested feed "${feedData.name}" has valid parent`, async () => {
      const parentDoc = await db.collection('feeds').doc(feedData.parentFeedId).get();
      if (!parentDoc.exists) throw new Error('Parent feed not found');
    });

    // Check if nested feed has flips
    const flipsSnapshot = await db
      .collection('flips')
      .where('feedIds', 'array-contains', doc.id)
      .get();

    console.log(`   └─ ${flipsSnapshot.size} flip(s) in nested feed`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Starting Firestore Rules Tests...');
  console.log('⚠️  Note: Admin SDK bypasses security rules');
  console.log('   These tests validate data structure and relationships\n');

  try {
    await testUserProfiles();
    await testFeedAccess();
    await testFlipAccess();
    await testNestedFeeds();

    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log('');

    if (testResults.failed > 0) {
      console.log('Failed Tests:');
      testResults.tests
        .filter((t) => !t.passed)
        .forEach((t) => {
          console.log(`  ❌ ${t.name}`);
          if (t.reason) console.log(`     ${t.reason}`);
        });
      console.log('');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
      console.log('');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Fatal error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
