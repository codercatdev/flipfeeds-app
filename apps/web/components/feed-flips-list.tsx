'use client';

import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';

interface FlipData {
  id: string;
  // Add other flip properties here
  [key: string]: any;
}

interface FeedFlipsListProps {
  feedId: string;
}

export function FeedFlipsList({ feedId }: FeedFlipsListProps) {
  const [flips, setFlips] = useState<FlipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedId || !db) {
      setLoading(false);
      return;
    }

    const flipsRef = collection(db, 'flips');
    const q = query(flipsRef, where('feedIds', 'array-contains', feedId), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const flipsData: FlipData[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFlips(flipsData);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching flips for feed ${feedId}:`, err);
        setError('Failed to load flips.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [feedId]);

  if (loading) {
    return <p className="text-muted-foreground">Loading flips...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (flips.length === 0) {
    return <p className="text-muted-foreground">No flips found in this feed.</p>;
  }

  return (
    <div className="space-y-4">
      {flips.map((flip) => (
        <div key={flip.id} className="p-4 border rounded-lg">
          <h3 className="font-semibold">{flip.title || 'Untitled Flip'}</h3>
          <p className="text-sm text-muted-foreground">{flip.description || 'No description'}</p>
        </div>
      ))}
    </div>
  );
}
