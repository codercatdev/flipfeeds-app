'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { Check, Plus } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSelectedFeed } from '@/hooks/use-selected-feed';
import { db } from '@/lib/firebase';

interface Feed {
  id: string;
  name: string;
  logoURL?: string;
  role: string;
}

interface MobileFeedSelectorProps {
  userId: string;
  onSelect?: () => void;
}

export function MobileFeedSelector({ userId, onSelect }: MobileFeedSelectorProps) {
  const { selectedFeedId, setSelectedFeedId, setSelectedNestedFeedId } = useSelectedFeed();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !db) return;

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
    setSelectedNestedFeedId(null);
    onSelect?.();
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
          <div className="size-12 rounded-lg bg-muted-foreground/20" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-32" />
            <div className="h-3 bg-muted-foreground/20 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {feeds.map((feed) => (
        <button
          type="button"
          key={feed.id}
          onClick={() => handleFeedClick(feed.id)}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
            selectedFeedId === feed.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          {feed.logoURL ? (
            <div className="relative size-12 overflow-hidden rounded-lg shrink-0">
              <Image src={feed.logoURL} alt={feed.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted shrink-0">
              <span className="text-lg font-semibold">
                {feed.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{feed.name}</div>
            <div
              className={`text-sm truncate ${
                selectedFeedId === feed.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              {feed.role}
            </div>
          </div>
          {selectedFeedId === feed.id && <Check className="size-5 shrink-0" />}
        </button>
      ))}
      <Button variant="outline" className="w-full justify-start gap-3 h-auto p-3 mt-2">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted shrink-0">
          <Plus className="size-6" />
        </div>
        <span className="font-semibold">Add New Feed</span>
      </Button>
    </div>
  );
}
