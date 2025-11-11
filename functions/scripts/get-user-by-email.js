#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    process.exit(1);
}

async function getUserByEmail(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);

        console.log('\n✅ User found:');
        console.log('  UID:', user.uid);
        console.log('  Email:', user.email);
        console.log('  Email Verified:', user.emailVerified);
        console.log('  Display Name:', user.displayName || '(not set)');
        console.log('\nCustom Claims:', JSON.stringify(user.customClaims || {}, null, 2));

        return user.uid;
    } catch (error) {
        console.error('❌ Error finding user:', error.message);
        throw error;
    }
}

// Parse command line arguments
const email = process.argv[2];

if (!email || email === '--help' || email === '-h') {
    console.log(`
Usage: npm run get-user -- <email>

Example:
  npm run get-user -- user@example.com
  `);
    process.exit(0);
}

getUserByEmail(email)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
