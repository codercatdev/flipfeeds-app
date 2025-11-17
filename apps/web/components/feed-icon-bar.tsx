'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSelectedFeed } from '@/hooks/use-selected-feed';
import { db } from '@/lib/firebase';

interface Feed {
  id: string;
  name: string;
  logoURL?: string;
  role: string;
}

interface FeedIconBarProps {
  userId: string;
}

export function FeedIconBar({ userId }: FeedIconBarProps) {
  const { selectedFeedId, setSelectedFeedId, setSelectedNestedFeedId } = useSelectedFeed();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const userFeedsRef = collection(db, `users/${userId}/feeds`);
    const q = query(userFeedsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedsData: Feed[] = [];
        for (const doc of snapshot.docs) {
          feedsData.push({
            id: doc.id,
            ...doc.data(),
          } as Feed);
        }
        setFeeds(feedsData);
        setLoading(false);

        // Auto-select first feed if none selected
        if (feedsData.length > 0 && !selectedFeedId) {
          setSelectedFeedId(feedsData[0].id);
        }
      },
      (error) => {
        console.error('Error fetching feeds:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, selectedFeedId, setSelectedFeedId]);

  const handleFeedClick = (feedId: string) => {
    setSelectedFeedId(feedId);
    setSelectedNestedFeedId(null); // Reset nested feed selection
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 p-2">
        <div className="size-12 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {feeds.map((feed) => (
        <button
          type="button"
          key={feed.id}
          onClick={() => handleFeedClick(feed.id)}
          className={`group relative flex size-12 items-center justify-center rounded-2xl transition-all hover:rounded-xl ${
            selectedFeedId === feed.id
              ? 'rounded-xl bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
          }`}
          title={feed.name}
        >
          {feed.logoURL ? (
            <div className="relative size-8 overflow-hidden rounded-lg">
              <Image src={feed.logoURL} alt={feed.name} fill className="object-cover" />
            </div>
          ) : (
            <span className="text-lg font-semibold">{feed.name.substring(0, 2).toUpperCase()}</span>
          )}
          {selectedFeedId === feed.id && (
            <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground" />
          )}
        </button>
      ))}
      <button
        type="button"
        className="group flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all hover:rounded-xl hover:bg-primary/10 hover:text-primary"
        title="Add Feed"
      >
        <span className="text-2xl">+</span>
      </button>
    </div>
  );
}
