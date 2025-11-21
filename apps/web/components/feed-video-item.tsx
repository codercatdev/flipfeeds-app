'use client';

import { Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Flip } from '@/types/shared';

interface FeedVideoItemProps {
  flip: Flip;
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  preload?: boolean;
}

export function FeedVideoItem({
  flip,
  isActive,
  isMuted,
  toggleMute,
  preload = false,
}: FeedVideoItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [_isPlaying, setIsPlaying] = useState(false);

  // Handle playback based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.error('Autoplay prevented:', error);
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      // Reset time if desired? Usually we keep it or reset.
      // video.currentTime = 0;
    }
  }, [isActive]);

  const handleVideoClick = () => {
    toggleMute();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Video Player */}
      {flip.publicUrl ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={flip.publicUrl}
          loop
          muted={isMuted}
          playsInline
          preload={isActive || preload ? 'auto' : 'none'}
          onClick={handleVideoClick}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
          Video not available
        </div>
      )}

      {/* Mute Indicator (optional, if clicking toggles) */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        {isMuted ? (
          <VolumeX className="text-white/50 size-6" />
        ) : (
          <Volume2 className="text-white/50 size-6" />
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute bottom-24 right-2 z-20 flex flex-col items-center gap-6 md:right-4">
        {/* Author Profile */}
        <div className="relative">
          <Avatar className="size-12 border-2 border-white">
            <AvatarImage src={flip.authorPhotoURL} alt={flip.authorName} />
            <AvatarFallback>{flip.authorName?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {/* Follow Plus Button (could be added here) */}
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-full text-white hover:bg-white/20 hover:text-white"
          >
            <Heart className="size-8" />
          </Button>
          <span className="text-xs font-medium text-white shadow-black drop-shadow-md">Like</span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-full text-white hover:bg-white/20 hover:text-white"
          >
            <MessageCircle className="size-8" />
          </Button>
          <span className="text-xs font-medium text-white shadow-black drop-shadow-md">Reply</span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-full text-white hover:bg-white/20 hover:text-white"
          >
            <Share2 className="size-8" />
          </Button>
          <span className="text-xs font-medium text-white shadow-black drop-shadow-md">Share</span>
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-4 left-4 right-16 z-20 flex flex-col gap-2 text-white">
        <div className="font-semibold text-lg shadow-black drop-shadow-md">@{flip.authorName}</div>
        <div className="text-sm leading-tight line-clamp-2 shadow-black drop-shadow-md">
          {flip.title}
        </div>
        {flip.summary && (
          <div className="text-xs text-white/80 line-clamp-1 shadow-black drop-shadow-md">
            {flip.summary}
          </div>
        )}
      </div>

      {/* Gradient for better text visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-black/80 to-transparent z-10 pointer-events-none" />
    </div>
  );
}
