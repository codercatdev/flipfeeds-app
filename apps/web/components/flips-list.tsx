'use client';

import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Video } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { db } from '@/lib/firebase';

interface Flip {
  id: string;
  title: string;
  summary?: string;
  feedIds: string[];
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  videoStoragePath: string;
  publicUrl?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
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
    const q = query(
      flipsRef,
      where('feedIds', 'array-contains', feedId),
      orderBy('createdAt', 'desc')
    );

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
              {flip.publicUrl ? (
                // biome-ignore lint/a11y/useMediaCaption: Captions will be added in future implementation
                <video
                  src={flip.publicUrl}
                  className="w-full h-full object-cover"
                  controls
                  aria-label={flip.title}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-linear-to-br from-primary/10 to-primary/5">
                  <Video className="size-12 text-muted-foreground" />
                  <div className="absolute bottom-2 left-2 right-2 text-xs text-muted-foreground bg-black/50 p-2 rounded">
                    {flip.videoStoragePath}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardHeader>
            <h3 className="font-semibold line-clamp-2">{flip.title}</h3>
            {flip.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{flip.summary}</p>
            )}
            <div className="flex items-center gap-2">
              <div className="relative size-6 rounded-full overflow-hidden">
                <Image
                  src={flip.authorPhotoURL}
                  alt={flip.authorName}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-sm text-muted-foreground">{flip.authorName}</span>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
