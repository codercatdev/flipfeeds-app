/**
 * Unit tests for userFlows
 *
 * These tests verify that userFlows work correctly with userTools,
 * ensuring proper context propagation and authentication.
 *
 * Run tests:
 *   npm test
 *
 * Run with emulators:
 *   firebase emulators:exec "npm test"
 */

const test = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { expect } = require('chai');

// Mock config values if needed
test.mockConfig({
    // Add any config values your functions use
});

// Import functions after test initialization
const myFunctions = require('../lib/flows/userFlows');

describe('userFlows', () => {
    let db;

    before(() => {
        // Initialize Firestore
        db = admin.firestore();
    });

    after(() => {
        // Clean up
        test.cleanup();
    });

    describe('conversationalProfileFlow', () => {
        const testUid = 'test-user-123';
        const testEmail = 'test@example.com';
        const testDisplayName = 'Test User';

        // Mock context with auth
        const mockContext = {
            auth: {
                uid: testUid,
                token: {
                    email: testEmail,
                    email_verified: true,
                },
                email: testEmail,
                displayName: testDisplayName,
            },
        };

        beforeEach(async () => {
            // Clean up test user before each test
            try {
                await db.collection('users').doc(testUid).delete();
            } catch (e) {
                // User doesn't exist yet
            }
        });

        afterEach(async () => {
            // Clean up test user after each test
            try {
                await db.collection('users').doc(testUid).delete();
            } catch (e) {
                // Already cleaned up
            }
        });

        it('should create profile for new user', async () => {
            // Call the flow
            const result = await myFunctions.conversationalProfileFlow(
                { message: 'hello' },
                { context: mockContext }
            );

            // Assertions
            expect(result).to.have.property('response');
            expect(result.response).to.include('Welcome');
            expect(result).to.have.property('profile');
            expect(result.profile).to.have.property('uid', testUid);
            expect(result.profile).to.have.property('displayName', testDisplayName);

            // Verify profile was created in Firestore
            const userDoc = await db.collection('users').doc(testUid).get();
            expect(userDoc.exists).to.be.true;
            expect(userDoc.data()).to.have.property('displayName', testDisplayName);
        });

        it('should return existing profile', async () => {
            // Create profile first
            await db.collection('users').doc(testUid).set({
                displayName: testDisplayName,
                email: testEmail,
                username: 'testuser',
                feedCount: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Call the flow
            const result = await myFunctions.conversationalProfileFlow(
                { message: 'hello' },
                { context: mockContext }
            );

            // Assertions
            expect(result).to.have.property('profile');
            expect(result.profile).to.have.property('username', 'testuser');
        });
    });

    describe('updateProfileFieldFlow', () => {
        const testUid = 'test-user-456';
        const testEmail = 'update@example.com';

        const mockContext = {
            auth: {
                uid: testUid,
                token: {
                    email: testEmail,
                    email_verified: true,
                },
                email: testEmail,
                displayName: 'Update Test',
            },
        };

        beforeEach(async () => {
            // Create test user before each test
            await db.collection('users').doc(testUid).set({
                displayName: 'Update Test',
                email: testEmail,
                feedCount: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        afterEach(async () => {
            // Clean up test user
            try {
                await db.collection('users').doc(testUid).delete();
                // Clean up username if claimed
                await db.collection('usernames').doc('testnewusername').delete();
            } catch (e) {
                // Already cleaned up
            }
        });

        it('should update username', async () => {
            const result = await myFunctions.updateProfileFieldFlow(
                {
                    field: 'username',
                    value: 'testnewusername',
                },
                { context: mockContext }
            );

            // Assertions
            expect(result).to.have.property('success', true);
            expect(result).to.have.property('profile');
            expect(result.profile).to.have.property('username', 'testnewusername');

            // Verify in Firestore
            const userDoc = await db.collection('users').doc(testUid).get();
            expect(userDoc.data()).to.have.property('username', 'testnewusername');

            // Verify username was claimed
            const usernameDoc = await db.collection('usernames').doc('testnewusername').get();
            expect(usernameDoc.exists).to.be.true;
            expect(usernameDoc.data()).to.have.property('userId', testUid);
        });

        it('should update bio', async () => {
            const result = await myFunctions.updateProfileFieldFlow(
                {
                    field: 'bio',
                    value: 'This is my test bio',
                },
                { context: mockContext }
            );

            // Assertions
            expect(result).to.have.property('success', true);
            expect(result.profile).to.have.property('bio', 'This is my test bio');

            // Verify in Firestore
            const userDoc = await db.collection('users').doc(testUid).get();
            expect(userDoc.data()).to.have.property('bio', 'This is my test bio');
        });

        it('should reject username that is too short', async () => {
            const result = await myFunctions.updateProfileFieldFlow(
                {
                    field: 'username',
                    value: 'ab',
                },
                { context: mockContext }
            );

            expect(result).to.have.property('success', false);
            expect(result.message).to.include('3 and 20 characters');
        });
    });
});
