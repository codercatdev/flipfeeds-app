import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Flip {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  owner: string;
  createdAt: Date;
  [key: string]: any;
}

export async function getFlip(flipId: string): Promise<Flip | null> {
  console.log('[flips.ts] getFlip called with flipId:', flipId);

  if (!db) {
    console.error('[flips.ts] getFlip: Firebase db is not initialized');
    return null;
  }

  if (!flipId) {
    console.error('[flips.ts] getFlip: flipId is required but was not provided');
    return null;
  }

  try {
    console.log('[flips.ts] getFlip: Fetching flip document from Firestore');
    const flipRef = doc(db, 'flips', flipId);
    const flipSnap = await getDoc(flipRef);

    if (flipSnap.exists()) {
      const flipData = { id: flipSnap.id, ...flipSnap.data() } as Flip;
      console.log('[flips.ts] getFlip: Successfully retrieved flip:', {
        id: flipData.id,
        name: flipData.name,
        owner: flipData.owner,
        visibility: flipData.visibility,
      });
      return flipData;
    }

    console.warn('[flips.ts] getFlip: Flip document not found for flipId:', flipId);
    return null;
  } catch (error) {
    console.error('[flips.ts] getFlip: Error fetching flip:', {
      flipId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
