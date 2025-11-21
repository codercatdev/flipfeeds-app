'use client';

import { Home, Inbox, Lock, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelectedFeed } from '@/hooks/use-selected-feed';
import { useUserFeeds } from '@/hooks/use-user-feeds';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  userId: string;
  onAgentClick: () => void;
  className?: string;
}

export function MobileBottomNav({ userId, onAgentClick, className }: MobileBottomNavProps) {
  const { selectedFeedId, setSelectedFeedId, setSelectedNestedFeedId } = useSelectedFeed();
  const { feeds } = useUserFeeds(userId);
  const personalFeedId = `personal_${userId}`;

  const handleHomeClick = () => {
    // If currently on personal feed, switch to the first available public/shared feed
    if (selectedFeedId === personalFeedId) {
      const homeFeed = feeds.find((f) => f.id !== personalFeedId);
      if (homeFeed) {
        setSelectedFeedId(homeFeed.id);
        setSelectedNestedFeedId(null);
      }
    }
  };

  const handlePrivateClick = () => {
    setSelectedFeedId(personalFeedId);
    setSelectedNestedFeedId(null);
  };

  const isPrivateActive = selectedFeedId === personalFeedId;
  const isHomeActive = !isPrivateActive;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around bg-black/90 backdrop-blur-sm border-t border-white/10 pb-safe text-white md:hidden',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'flex flex-col items-center gap-1 h-auto py-1',
          isHomeActive ? 'text-white' : 'text-white/60'
        )}
        onClick={handleHomeClick}
      >
        <Home className="size-6" />
        <span className="text-[10px] font-medium">Home</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'flex flex-col items-center gap-1 h-auto py-1',
          isPrivateActive ? 'text-white' : 'text-white/60'
        )}
        onClick={handlePrivateClick}
      >
        <Lock className="size-6" />
        <span className="text-[10px] font-medium">Private</span>
      </Button>

      <div className="relative -top-3">
        <Button
          size="icon"
          className="size-12 rounded-full bg-white text-black hover:bg-white/90 shadow-lg border-2 border-black/20"
          onClick={onAgentClick}
        >
          <Plus className="size-7 stroke-[3]" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="flex flex-col items-center gap-1 h-auto py-1 text-white/60 hover:text-white"
        onClick={() => console.log('Inbox clicked')}
      >
        <Inbox className="size-6" />
        <span className="text-[10px] font-medium">Inbox</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="flex flex-col items-center gap-1 h-auto py-1 text-white/60 hover:text-white"
        onClick={() => console.log('Profile clicked')}
      >
        <User className="size-6" />
        <span className="text-[10px] font-medium">Profile</span>
      </Button>
    </div>
  );
}
