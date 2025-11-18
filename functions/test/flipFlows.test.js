const test = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { expect } = require('chai');

const { createFlipFlow } = require('../lib/genkit');

describe('flipFlows', () => {
  let db;

  before(() => {
    db = admin.firestore();
  });

  after(() => {
    test.cleanup();
  });

  describe('createFlipFlow', () => {
    const testUid = 'test-user-123';
    const testEmail = 'test@example.com';
    const testDisplayName = 'Test User';
    let feedId;

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

    beforeEach(async () => {
      const feedRef = await db.collection('feeds').add({
        owner: testUid,
        name: 'Test Feed',
        stats: {
          flipCount: 0,
        },
      });
      feedId = feedRef.id;
      await db.collection('feeds').doc(feedId).collection('members').doc(testUid).set({
        role: 'admin',
      });
    });

    afterEach(async () => {
      if (feedId) {
        await db.collection('feeds').doc(feedId).delete();
      }
      const flipQuery = await db
        .collection('flips')
        .where('feedIds', 'array-contains', feedId)
        .get();
      const deletePromises = [];
      flipQuery.forEach((doc) => {
        deletePromises.push(doc.ref.delete());
      });
      await Promise.all(deletePromises);
    });

    it('should create a new flip', async () => {
      const result = await createFlipFlow.run(
        {
          feedId,
          videoStoragePath: 'test/video.mp4',
          title: 'Test Flip',
        },
        { context: mockContext }
      );

      expect(result).to.have.property('flipId');
      const { flipId } = result;

      const flipDoc = await db.collection('flips').doc(flipId).get();
      expect(flipDoc.exists).to.be.true;
      expect(flipDoc.data()).to.have.property('title', 'Test Flip');

      const feedDoc = await db.collection('feeds').doc(feedId).get();
      expect(feedDoc.data().stats.flipCount).to.equal(1);
    });
  });
});
