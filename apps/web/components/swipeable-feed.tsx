'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronDown, ChevronUp, Loader2, Plus, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FeedVideoItem } from '@/components/feed-video-item';
import { Button } from '@/components/ui/button';
import { useInfiniteFlips } from '@/hooks/use-infinite-flips';
import { cn } from '@/lib/utils';

interface SwipeableFeedProps {
  feedId?: string;
  className?: string;
  onAgentClick: () => void;
}

export function SwipeableFeed({ feedId, className, onAgentClick }: SwipeableFeedProps) {
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

  // Desktop Navigation Handlers
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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
        {/* 
          touch-pan-y allows the browser to handle vertical scrolling, which conflicts with 
          the vertical carousel. We use touch-pan-x (or touch-none) to let the carousel 
          handle vertical swipes while allowing horizontal browser gestures (like back/forward).
        */}
        <div className="flex flex-col h-full w-full touch-pan-x">
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

      {/* Desktop Navigation Buttons */}
      <div className="hidden md:flex flex-col gap-4 absolute right-[-60px] top-1/2 -translate-y-1/2 z-50">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 backdrop-blur-sm border border-white/10"
          onClick={scrollPrev}
          disabled={activeIndex === 0}
        >
          <ChevronUp className="size-6" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 backdrop-blur-sm border border-white/10"
          onClick={scrollNext}
          disabled={!hasMore && activeIndex === flips.length - 1}
        >
          <ChevronDown className="size-6" />
        </Button>
        <Button
          size="icon"
          className="size-11 rounded-xl hover:bg-white/90 hover:scale-105 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          onClick={onAgentClick}
        >
          <Plus className="size-7 stroke-3" />
        </Button>
      </div>
    </div>
  );
}
