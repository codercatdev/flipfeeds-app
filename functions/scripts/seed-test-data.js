#!/usr/bin/env node
/**
 * Seed Test Data for Firestore Emulator
 *
 * This script creates test users, feeds (including nested feeds), and flips
 * to validate Firestore security rules and enable local development.
 *
 * Usage:
 *   node functions/scripts/seed-test-data.js
 *
 * Prerequisites:
 *   - Firebase emulators must be running (pnpm emulators)
 *   - Set FIRESTORE_EMULATOR_HOST=localhost:8080
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
const auth = admin.auth();

// Test user data
const TEST_USERS = [
  {
    uid: 'test-user-1',
    email: 'alice@test.com',
    displayName: 'Alice Johnson',
    photoURL: 'https://i.pravatar.cc/150?img=1',
    bio: 'Tech enthusiast and video creator',
  },
  {
    uid: 'test-user-2',
    email: 'bob@test.com',
    displayName: 'Bob Smith',
    photoURL: 'https://i.pravatar.cc/150?img=2',
    bio: 'Developer and open source contributor',
  },
  {
    uid: 'test-user-3',
    email: 'charlie@test.com',
    displayName: 'Charlie Davis',
    photoURL: 'https://i.pravatar.cc/150?img=3',
    bio: 'Content creator and educator',
  },
];

/**
 * Create test users in Auth and Firestore
 */
async function createTestUsers() {
  console.log('📝 Creating test users...');

  for (const userData of TEST_USERS) {
    try {
      // Create in Auth emulator
      await auth.createUser({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
      });

      // Create user profile in Firestore
      await db
        .collection('users')
        .doc(userData.uid)
        .set({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          bio: userData.bio,
          username: userData.email.split('@')[0],
          feedCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`✅ Created user: ${userData.displayName} (${userData.email})`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists') {
        console.log(`⚠️  User already exists: ${userData.displayName}`);
      } else {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }
  }
}

/**
 * Create a feed with members
 */
async function createFeed(feedData) {
  const feedRef = db.collection('feeds').doc();
  const feedId = feedRef.id;

  await db.runTransaction(async (transaction) => {
    // Create feed document
    transaction.set(feedRef, {
      ...feedData,
      stats: { memberCount: feedData.members.length, flipCount: 0 },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add members to feed
    for (const member of feedData.members) {
      const memberRef = feedRef.collection('members').doc(member.userId);
      const user = TEST_USERS.find((u) => u.uid === member.userId);

      transaction.set(memberRef, {
        userId: member.userId,
        role: member.role,
        displayName: user.displayName,
        photoURL: user.photoURL,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add reverse lookup in user's feeds subcollection
      const userFeedRef = db.collection('users').doc(member.userId).collection('feeds').doc(feedId);
      transaction.set(userFeedRef, {
        feedId,
        role: member.role,
        name: feedData.name,
        logoURL: feedData.logoURL,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  console.log(`✅ Created feed: ${feedData.name} (${feedId})`);
  return feedId;
}

/**
 * Create a flip (video post) in a feed
 */
async function createFlip(feedId, authorId, flipData) {
  const flipRef = db.collection('flips').doc();
  const flipId = flipRef.id;
  const author = TEST_USERS.find((u) => u.uid === authorId);

  await flipRef.set({
    feedId,
    authorId,
    authorInfo: {
      displayName: author.displayName,
      photoURL: author.photoURL,
    },
    type: 'video',
    title: flipData.title,
    media: {
      video: {
        url: `https://example.com/videos/${flipId}.mp4`,
        storagePath: `videos/${feedId}/${flipId}/video.mp4`,
        durationMs: 30000,
      },
      thumbnail: {
        url: `https://picsum.photos/seed/${flipId}/640/360`,
        storagePath: `videos/${feedId}/${flipId}/thumb.jpg`,
      },
    },
    aiData: {
      summary: flipData.summary || 'AI-generated summary',
      isModerated: true,
      moderationFlags: [],
      tags: flipData.tags || [],
    },
    stats: {
      likeCount: Math.floor(Math.random() * 50),
      commentCount: Math.floor(Math.random() * 20),
      viewCount: Math.floor(Math.random() * 200),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update feed flip count
  await db
    .collection('feeds')
    .doc(feedId)
    .update({
      'stats.flipCount': admin.firestore.FieldValue.increment(1),
    });

  return flipId;
}

/**
 * Main seeding function
 */
async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');

  try {
    // 1. Create test users
    await createTestUsers();
    console.log('');

    // 2. Create main feeds with nested structure
    console.log('📁 Creating feeds...');

    // Main Tech Feed
    const techFeedId = await createFeed({
      name: 'Tech Talks',
      description: 'All things technology and development',
      logoURL: 'https://api.dicebear.com/7.x/shapes/svg?seed=tech',
      visibility: 'public',
      owner: TEST_USERS[0].uid,
      tags: ['technology', 'development', 'coding'],
      members: [
        { userId: TEST_USERS[0].uid, role: 'admin' },
        { userId: TEST_USERS[1].uid, role: 'moderator' },
        { userId: TEST_USERS[2].uid, role: 'member' },
      ],
    });

    // Nested Feed 1: JavaScript
    const jsFeedId = await createFeed({
      name: 'JavaScript Deep Dive',
      description: 'Advanced JavaScript concepts and patterns',
      logoURL: 'https://api.dicebear.com/7.x/shapes/svg?seed=javascript',
      visibility: 'public',
      owner: TEST_USERS[0].uid,
      tags: ['javascript', 'js', 'webdev'],
      parentFeedId: techFeedId, // Nested under Tech Talks
      members: [
        { userId: TEST_USERS[0].uid, role: 'admin' },
        { userId: TEST_USERS[1].uid, role: 'member' },
      ],
    });

    // Nested Feed 2: React
    const reactFeedId = await createFeed({
      name: 'React Mastery',
      description: 'React tips, tricks, and best practices',
      logoURL: 'https://api.dicebear.com/7.x/shapes/svg?seed=react',
      visibility: 'public',
      owner: TEST_USERS[1].uid,
      tags: ['react', 'frontend', 'hooks'],
      parentFeedId: techFeedId, // Nested under Tech Talks
      members: [
        { userId: TEST_USERS[0].uid, role: 'member' },
        { userId: TEST_USERS[1].uid, role: 'admin' },
        { userId: TEST_USERS[2].uid, role: 'member' },
      ],
    });

    // Gaming Feed
    const gamingFeedId = await createFeed({
      name: 'Gaming Central',
      description: 'Gaming highlights and tutorials',
      logoURL: 'https://api.dicebear.com/7.x/shapes/svg?seed=gaming',
      visibility: 'public',
      owner: TEST_USERS[2].uid,
      tags: ['gaming', 'esports', 'streams'],
      members: [
        { userId: TEST_USERS[2].uid, role: 'admin' },
        { userId: TEST_USERS[0].uid, role: 'member' },
      ],
    });

    // Private Feed
    const privateFeedId = await createFeed({
      name: 'Team Internal',
      description: 'Private team updates and discussions',
      logoURL: 'https://api.dicebear.com/7.x/shapes/svg?seed=private',
      visibility: 'private',
      owner: TEST_USERS[0].uid,
      tags: ['internal', 'team'],
      members: [
        { userId: TEST_USERS[0].uid, role: 'admin' },
        { userId: TEST_USERS[1].uid, role: 'member' },
      ],
    });

    console.log('');

    // 3. Create flips in feeds
    console.log('🎬 Creating flips...');

    // Flips for Tech Talks
    await createFlip(techFeedId, TEST_USERS[0].uid, {
      title: 'Introduction to Firebase Genkit',
      summary: 'Learn how to build AI-powered applications with Firebase Genkit',
      tags: ['firebase', 'genkit', 'ai'],
    });

    await createFlip(techFeedId, TEST_USERS[1].uid, {
      title: 'Cloud Functions Best Practices',
      summary: 'Optimize your Cloud Functions for performance and cost',
      tags: ['firebase', 'cloud-functions', 'serverless'],
    });

    await createFlip(techFeedId, TEST_USERS[2].uid, {
      title: 'Firestore Security Rules Explained',
      summary: 'Master Firestore security rules for multi-tenant apps',
      tags: ['firestore', 'security', 'database'],
    });

    // Flips for JavaScript Feed (nested)
    await createFlip(jsFeedId, TEST_USERS[0].uid, {
      title: 'Understanding JavaScript Closures',
      summary: 'Deep dive into closures and lexical scoping',
      tags: ['javascript', 'closures', 'fundamentals'],
    });

    await createFlip(jsFeedId, TEST_USERS[1].uid, {
      title: 'Async/Await vs Promises',
      summary: 'When to use async/await and when to stick with promises',
      tags: ['javascript', 'async', 'promises'],
    });

    // Flips for React Feed (nested)
    await createFlip(reactFeedId, TEST_USERS[1].uid, {
      title: 'React Hooks Tips',
      summary: 'Advanced patterns for useState and useEffect',
      tags: ['react', 'hooks', 'patterns'],
    });

    await createFlip(reactFeedId, TEST_USERS[2].uid, {
      title: 'Server Components in Next.js',
      summary: 'Build faster apps with React Server Components',
      tags: ['react', 'nextjs', 'rsc'],
    });

    await createFlip(reactFeedId, TEST_USERS[0].uid, {
      title: 'State Management in 2024',
      summary: 'Comparing Redux, Zustand, and Context API',
      tags: ['react', 'state', 'redux'],
    });

    // Flips for Gaming Feed
    await createFlip(gamingFeedId, TEST_USERS[2].uid, {
      title: 'Epic Gaming Moments',
      summary: 'Best highlights from this week',
      tags: ['gaming', 'highlights', 'montage'],
    });

    await createFlip(gamingFeedId, TEST_USERS[0].uid, {
      title: 'Gaming Setup Tour',
      summary: 'Check out my new streaming setup',
      tags: ['gaming', 'setup', 'streaming'],
    });

    // Flips for Private Feed
    await createFlip(privateFeedId, TEST_USERS[0].uid, {
      title: 'Team Q1 Update',
      summary: 'Quarterly progress and goals',
      tags: ['internal', 'update'],
    });

    console.log('');
    console.log('✅ Test data seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Users: ${TEST_USERS.length}`);
    console.log('   - Feeds: 5 (3 public, 1 private, 2 nested)');
    console.log('   - Flips: 11');
    console.log('');
    console.log('🔗 Access the Emulator UI: http://localhost:4000');
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
