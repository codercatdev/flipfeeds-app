const test = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { expect } = require('chai');

const { createFeedFlow } = require('../lib/genkit');

describe('feedFlows', () => {
    let db;

    before(() => {
        db = admin.firestore();
    });

    after(() => {
        test.cleanup();
    });

    describe('createFeedFlow', () => {
        const testUid = 'test-user-123';
        const testEmail = 'test@example.com';
        const testDisplayName = 'Test User';

        const mockContext = {
            auth: {
                uid: testUid,
                token: {
                    email: testEmail,
                    email_verified: true,
                    name: testDisplayName,
                },
            },
        };

        afterEach(async () => {
            const feedQuery = await db.collection('feeds').where('owner', '==', testUid).get();
            const deletePromises = [];
            feedQuery.forEach((doc) => {
                deletePromises.push(doc.ref.delete());
            });
            await Promise.all(deletePromises);

            const userFeedQuery = await db
                .collection('users')
                .doc(testUid)
                .collection('feeds')
                .get();
            const deleteUserFeedPromises = [];
            userFeedQuery.forEach((doc) => {
                deleteUserFeedPromises.push(doc.ref.delete());
            });
            await Promise.all(deleteUserFeedPromises);
        });

        it('should create a new feed', async () => {
            const result = await createFeedFlow.run(
                {
                    name: 'Test Feed',
                    description: 'This is a test feed.',
                    visibility: 'public',
                },
                { context: mockContext }
            );

            expect(result).to.have.property('feedId');
            const { feedId } = result;

            const feedDoc = await db.collection('feeds').doc(feedId).get();
            expect(feedDoc.exists).to.be.true;
            expect(feedDoc.data()).to.have.property('name', 'Test Feed');

            const memberDoc = await db
                .collection('feeds')
                .doc(feedId)
                .collection('members')
                .doc(testUid)
                .get();
            expect(memberDoc.exists).to.be.true;
            expect(memberDoc.data()).to.have.property('role', 'admin');

            const userFeedDoc = await db
                .collection('users')
                .doc(testUid)
                .collection('feeds')
                .doc(feedId)
                .get();
            expect(userFeedDoc.exists).to.be.true;
        });
    });
});
