import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Feed {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  owner: string;
  createdAt: Date;
  [key: string]: any;
}

export async function getFeed(feedId: string): Promise<Feed | null> {
  if (!db) {
    return null;
  }
  const feedRef = doc(db, 'feeds', feedId);
  const feedSnap = await getDoc(feedRef);

  if (feedSnap.exists()) {
    return { id: feedSnap.id, ...feedSnap.data() } as Feed;
  }

  return null;
}
