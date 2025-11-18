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
  if (!db) {
    return null;
  }
  const flipRef = doc(db, 'flips', flipId);
  const flipSnap = await getDoc(flipRef);

  if (flipSnap.exists()) {
    return { id: flipSnap.id, ...flipSnap.data() } as Flip;
  }

  return null;
}
