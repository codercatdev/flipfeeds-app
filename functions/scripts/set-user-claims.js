#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../serviceAccountKey.json');

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    console.log('\nMake sure you have set GOOGLE_APPLICATION_CREDENTIALS or have gcloud configured.');
    process.exit(1);
}

/**
 * Set custom claims for a user to control access to Genkit flows/functions
 * @param {string} uid - User ID
 * @param {string[]} allowedFunctions - Array of function names the user can access
 */
async function setUserClaims(uid, allowedFunctions) {
    try {
        // Get current user to verify they exist
        const user = await admin.auth().getUser(uid);
        console.log(`\nFound user: ${user.email || user.uid}`);

        // Create claims object with allowed functions
        const claims = {
            allowedFunctions: allowedFunctions,
            updatedAt: new Date().toISOString()
        };

        // Set the custom claims
        await admin.auth().setCustomUserClaims(uid, claims);

        console.log(`\n✅ Successfully set custom claims for user ${uid}`);
        console.log('Allowed functions:', allowedFunctions);
        console.log('\nNote: The user will need to sign out and sign back in for claims to take effect.');

        // Display the updated user record
        const updatedUser = await admin.auth().getUser(uid);
        console.log('\nCurrent custom claims:', JSON.stringify(updatedUser.customClaims, null, 2));

    } catch (error) {
        console.error('❌ Error setting custom claims:', error.message);
        throw error;
    }
}

/**
 * List available Genkit functions/flows
 */
function listAvailableFunctions() {
    console.log('\nAvailable Genkit functions:');
    console.log('  - generatePoem');
    console.log('  - sendFlip (if uncommented)');
    console.log('  (Add more as you create them)');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run set-claims -- <uid> <function1> [function2] [function3] ...

Examples:
  # Grant access to generatePoem
  npm run set-claims -- abc123 generatePoem

  # Grant access to multiple functions
  npm run set-claims -- abc123 generatePoem sendFlip

  # List available functions
  npm run set-claims -- --list

Options:
  --help, -h    Show this help message
  --list, -l    List available Genkit functions
  `);
    process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
    listAvailableFunctions();
    process.exit(0);
}

// First argument is the user ID
const uid = args[0];

// Remaining arguments are function names
const functionNames = args.slice(1);

if (!uid) {
    console.error('❌ Error: User ID is required');
    console.log('Usage: npm run set-claims -- <uid> <function1> [function2] ...');
    process.exit(1);
}

if (functionNames.length === 0) {
    console.error('❌ Error: At least one function name is required');
    console.log('Usage: npm run set-claims -- <uid> <function1> [function2] ...');
    listAvailableFunctions();
    process.exit(1);
}

// Run the script
setUserClaims(uid, functionNames)
    .then(() => process.exit(0))
    .catch(error => {
        console.error('\n❌ Script failed:', error.message);
        process.exit(1);
    });
