'use client';

import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Heart, MessageCircle, Video } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { db } from '@/lib/firebase';

interface Flip {
  id: string;
  title: string;
  authorInfo: {
    displayName: string;
    photoURL: string;
  };
  type: string;
  media?: {
    video?: {
      url: string;
    };
    thumbnail?: {
      url: string;
    };
  };
  stats: {
    likeCount: number;
    commentCount: number;
  };
  createdAt: any;
}

interface FlipsListProps {
  feedId?: string;
}

export function FlipsList({ feedId }: FlipsListProps) {
  const [flips, setFlips] = useState<Flip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!feedId || !db) {
      setLoading(false);
      return;
    }

    const flipsRef = collection(db, 'flips');
    const q = query(flipsRef, where('feedId', '==', feedId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const flipsData: Flip[] = [];
        for (const doc of snapshot.docs) {
          flipsData.push({
            id: doc.id,
            ...doc.data(),
          } as Flip);
        }
        setFlips(flipsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching flips:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [feedId]);

  if (!feedId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <Video className="size-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Select a Feed</h2>
        <p className="text-muted-foreground">Choose a feed from the sidebar to see flips</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading flips...</p>
      </div>
    );
  }

  if (flips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <Video className="size-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Flips Yet</h2>
        <p className="text-muted-foreground">Be the first to post a flip to this feed!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {flips.map((flip) => (
        <Card key={flip.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-9/16 bg-muted relative">
              {flip.media?.video?.url ? (
                // biome-ignore lint/a11y/useMediaCaption: Captions will be added in future implementation
                <video
                  src={flip.media.video.url}
                  poster={flip.media.thumbnail?.url}
                  className="w-full h-full object-cover"
                  controls
                  aria-label={flip.title}
                />
              ) : flip.media?.thumbnail?.url ? (
                <Image
                  src={flip.media.thumbnail.url}
                  alt={flip.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Video className="size-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
          <CardHeader>
            <h3 className="font-semibold line-clamp-2">{flip.title}</h3>
            <div className="flex items-center gap-2">
              <div className="relative size-6 rounded-full overflow-hidden">
                <Image
                  src={flip.authorInfo.photoURL}
                  alt={flip.authorInfo.displayName}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-sm text-muted-foreground">{flip.authorInfo.displayName}</span>
            </div>
          </CardHeader>
          <CardFooter>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="size-4" />
                <span>{flip.stats.likeCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="size-4" />
                <span>{flip.stats.commentCount}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
