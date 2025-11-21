'use client';

import {
  collection,
  type DocumentData,
  getDocs,
  limit,
  orderBy,
  type QueryDocumentSnapshot,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import type { Flip } from '@/types/shared';

const PAGE_SIZE = 5;

export function useInfiniteFlips(feedId?: string) {
  const [flips, setFlips] = useState<Flip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Reset when feedId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Valid dependency on prop
  useEffect(() => {
    setFlips([]);
    setLastDoc(null);
    setHasMore(true);
    setLoading(true);
    setError(null);
  }, [feedId]);

  const loadFlips = useCallback(
    async (isInitial: boolean = false) => {
      if (!feedId || !db) {
        setLoading(false);
        return;
      }

      if (!isInitial && (loadingMore || !hasMore)) return;

      try {
        if (isInitial) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const flipsRef = collection(db, 'flips');

        let q = query(
          flipsRef,
          where('feedIds', 'array-contains', feedId),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        if (!isInitial && lastDoc) {
          q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);

        const newFlips: Flip[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Flip
        );

        if (isInitial) {
          setFlips(newFlips);
        } else {
          setFlips((prev) => [...prev, ...newFlips]);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error('Error fetching flips:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [feedId, lastDoc, loadingMore, hasMore]
  );

  // Initial load
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadFlips dependency causes infinite loop
  useEffect(() => {
    if (feedId) {
      loadFlips(true);
    } else {
      setLoading(false);
    }
  }, [feedId]);

  return {
    flips,
    loading,
    loadingMore,
    hasMore,
    loadMore: () => loadFlips(false),
    error,
  };
}
