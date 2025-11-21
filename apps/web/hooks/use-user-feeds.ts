'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';

export interface UserFeed {
  id: string;
  name: string;
  logoURL?: string;
  role?: string;
}

export function useUserFeeds(userId?: string) {
  const [feeds, setFeeds] = useState<UserFeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !db) {
      setLoading(false);
      return;
    }

    const userFeedsRef = collection(db, `users/${userId}/feeds`);
    const q = query(userFeedsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedsData: UserFeed[] = [];
        for (const doc of snapshot.docs) {
          feedsData.push({
            id: doc.id,
            ...doc.data(),
          } as UserFeed);
        }
        setFeeds(feedsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching feeds:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { feeds, loading };
}
