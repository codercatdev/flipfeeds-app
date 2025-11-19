/**
 * Script to manage allowed users in the allowedUsers collection
 * 
 * Usage:
 *   node scripts/manage-allowed-users.js add user@example.com
 *   node scripts/manage-allowed-users.js remove user@example.com
 *   node scripts/manage-allowed-users.js list
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables if needed
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Use emulator
    admin.initializeApp({
      projectId: 'demo-flipfeeds-app',
    });
    console.log('Using Firestore Emulator at:', process.env.FIRESTORE_EMULATOR_HOST);
  } else {
    // Use production or service account
    admin.initializeApp();
    console.log('Using production Firestore');
  }
}

const db = admin.firestore();

/**
 * Add a user to the allowedUsers collection
 */
async function addAllowedUser(email) {
  try {
    await db.collection('allowedUsers').doc(email).set({
      email,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: 'admin-script',
    });
    console.log(`✅ Successfully added ${email} to allowed users`);
  } catch (error) {
    console.error(`❌ Error adding ${email}:`, error.message);
    process.exit(1);
  }
}

/**
 * Remove a user from the allowedUsers collection
 */
async function removeAllowedUser(email) {
  try {
    await db.collection('allowedUsers').doc(email).delete();
    console.log(`✅ Successfully removed ${email} from allowed users`);
  } catch (error) {
    console.error(`❌ Error removing ${email}:`, error.message);
    process.exit(1);
  }
}

/**
 * List all allowed users
 */
async function listAllowedUsers() {
  try {
    const snapshot = await db.collection('allowedUsers').get();
    
    if (snapshot.empty) {
      console.log('No allowed users found.');
      return;
    }

    console.log('\n📋 Allowed Users:');
    console.log('─'.repeat(60));
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const addedAt = data.addedAt?.toDate?.() || 'Unknown';
      console.log(`  • ${doc.id}`);
      console.log(`    Added: ${addedAt}`);
      console.log('');
    });
    
    console.log(`Total: ${snapshot.size} user(s)`);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];

  if (!command) {
    console.log('Usage:');
    console.log('  node scripts/manage-allowed-users.js add <email>');
    console.log('  node scripts/manage-allowed-users.js remove <email>');
    console.log('  node scripts/manage-allowed-users.js list');
    process.exit(1);
  }

  switch (command.toLowerCase()) {
    case 'add':
      if (!email) {
        console.error('❌ Please provide an email address');
        process.exit(1);
      }
      await addAllowedUser(email);
      break;

    case 'remove':
      if (!email) {
        console.error('❌ Please provide an email address');
        process.exit(1);
      }
      await removeAllowedUser(email);
      break;

    case 'list':
      await listAllowedUsers();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Valid commands: add, remove, list');
      process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
