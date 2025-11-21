'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { Loader2, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FeedVideoItem } from '@/components/feed-video-item';
import { useInfiniteFlips } from '@/hooks/use-infinite-flips';
import { cn } from '@/lib/utils';

interface SwipeableFeedProps {
  feedId?: string;
  className?: string;
}

export function SwipeableFeed({ feedId, className }: SwipeableFeedProps) {
  const { flips, loading, loadMore, hasMore } = useInfiniteFlips(feedId);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    skipSnaps: false,
    duration: 25,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setActiveIndex(index);

    // Unmute after first swipe (interaction)
    if (index > 0 && isMuted) {
      setIsMuted(false);
    }

    // Load more if we are close to the end (e.g., 2 items remaining)
    if (hasMore && index >= flips.length - 2) {
      loadMore();
    }
  }, [emblaApi, flips.length, hasMore, loadMore, isMuted]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Toggle mute globally for the feed
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  if (loading && flips.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (flips.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white p-8 text-center">
        <Video className="size-16 text-zinc-700 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Flips Yet</h2>
        <p className="text-zinc-500">Swipe up to refresh or check back later.</p>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full bg-black', className)}>
      <div className="overflow-hidden h-full w-full" ref={emblaRef}>
        <div className="flex flex-col h-full w-full touch-pan-y">
          {flips.map((flip, index) => {
            // Optimization: Only render video content if within range
            // We keep the slide container to maintain scroll position
            const shouldRender = Math.abs(index - activeIndex) <= 3;
            const isActive = index === activeIndex;
            const isNeighbor = Math.abs(index - activeIndex) === 1;

            return (
              <div key={flip.id} className="relative h-full w-full flex-[0_0_100%]">
                {shouldRender ? (
                  <FeedVideoItem
                    flip={flip}
                    isActive={isActive}
                    isMuted={isMuted}
                    toggleMute={toggleMute}
                    preload={isNeighbor}
                  />
                ) : (
                  <div className="h-full w-full bg-black" />
                )}
              </div>
            );
          })}
          {/* Loading indicator at the bottom */}
          {hasMore && (
            <div className="flex items-center justify-center h-20 w-full absolute bottom-0 z-0">
              <Loader2 className="size-6 animate-spin text-white/20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
