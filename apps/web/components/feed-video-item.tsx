'use client';

import { Heart, MessageCircle, Plus, Share2, VolumeX } from 'lucide-react';
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
      <div className="absolute top-safe-offset-4 right-4 z-20 pointer-events-none transition-opacity duration-300">
        {isMuted ? (
          <div className="bg-black/40 p-2 rounded-full backdrop-blur-sm">
            <VolumeX className="text-white size-4" />
          </div>
        ) : null}
      </div>

      {/* Right Side Actions */}
      <div className="absolute bottom-[100px] right-2 z-20 flex flex-col items-center gap-4 md:right-4 md:bottom-8">
        {/* Author Profile */}
        <div className="relative mb-4">
          <Avatar className="size-12 border border-white shadow-sm">
            <AvatarImage src={flip.authorPhotoURL} alt={flip.authorName} />
            <AvatarFallback>{flip.authorName?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {/* Follow Plus Button */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 rounded-full p-0.5">
            <Plus className="size-3 text-white" />
          </div>
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-full text-white hover:bg-white/20 hover:text-white [&_svg]:size-8"
          >
            <Heart className="fill-white/10" />
          </Button>
          <span className="text-xs font-medium text-white drop-shadow-md">Like</span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-full text-white hover:bg-white/20 hover:text-white [&_svg]:size-8"
          >
            <MessageCircle className="fill-white/10" />
          </Button>
          <span className="text-xs font-medium text-white drop-shadow-md">Reply</span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-full text-white hover:bg-white/20 hover:text-white [&_svg]:size-8"
          >
            <Share2 className="fill-white/10" />
          </Button>
          <span className="text-xs font-medium text-white drop-shadow-md">Share</span>
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-[80px] left-4 right-20 z-20 flex flex-col gap-2 text-white md:bottom-8 pointer-events-none">
        <div className="flex flex-col items-start text-shadow-sm">
          <div className="font-bold text-lg hover:underline cursor-pointer pointer-events-auto">
            @{flip.authorName}
          </div>
          <div className="text-base leading-tight line-clamp-2 text-white/90">{flip.title}</div>
          {flip.summary && (
            <div className="text-sm text-white/80 line-clamp-1 mt-1">{flip.summary}</div>
          )}
        </div>
      </div>

      {/* Gradient for better text visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
    </div>
  );
}
