'use client';

import { Compass, Home, Inbox, Plus, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const { selectedFeedId, setSelectedFeedId, setSelectedNestedFeedId } = useSelectedFeed();
  const { feeds } = useUserFeeds(userId);

  // Determine if we are on the feeds page (Home)
  const isFeedsPage = pathname === '/feeds' || pathname.startsWith('/feeds/');
  const isInboxPage = pathname === '/inbox';
  const isProfilePage = pathname === '/profile';
  const isDiscoverActive = false; // Placeholder for now

  const handleHomeClick = () => {
    // If not on feeds page, navigate there (this would be handled by Link, but logic for feed selection remains)
    // If we are already on feeds page, ensure we are on a "Home" feed (not a nested one or private one if desired)
    // For now, we keep current behavior: Select first available feed if none selected
    if (!selectedFeedId && feeds.length > 0) {
      setSelectedFeedId(feeds[0].id);
    }
    setSelectedNestedFeedId(null);
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 items-end h-16 bg-black border-t border-white/10 pb-safe text-white md:hidden',
        className
      )}
    >
      {/* Home */}
      <Button
        variant="ghost"
        className={cn(
          'flex flex-col items-center justify-center gap-1 h-full rounded-none hover:bg-transparent',
          isFeedsPage && !isDiscoverActive ? 'text-white' : 'text-white/50'
        )}
        asChild
        onClick={handleHomeClick}
      >
        <Link href="/feeds">
          <Home className={cn('size-6', isFeedsPage && !isDiscoverActive && 'fill-current')} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
      </Button>

      {/* Discover (Placeholder) */}
      <Button
        variant="ghost"
        className={cn(
          'flex flex-col items-center justify-center gap-1 h-full rounded-none hover:bg-transparent',
          isDiscoverActive ? 'text-white' : 'text-white/50'
        )}
        onClick={() => console.log('Discover clicked')}
      >
        <Compass className="size-6" />
        <span className="text-[10px] font-medium">Discover</span>
      </Button>

      {/* Center Add Button (Agent) */}
      <div className="flex items-center justify-center h-full">
        <Button
          size="icon"
          className="size-11 rounded-xl bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          onClick={onAgentClick}
        >
          <Plus className="size-7 stroke-[3]" />
        </Button>
      </div>

      {/* Inbox */}
      <Button
        variant="ghost"
        className={cn(
          'flex flex-col items-center justify-center gap-1 h-full rounded-none hover:bg-transparent',
          isInboxPage ? 'text-white' : 'text-white/50'
        )}
        asChild
      >
        <Link href="/inbox">
          <Inbox className={cn('size-6', isInboxPage && 'fill-current')} />
          <span className="text-[10px] font-medium">Inbox</span>
        </Link>
      </Button>

      {/* Profile */}
      <Button
        variant="ghost"
        className={cn(
          'flex flex-col items-center justify-center gap-1 h-full rounded-none hover:bg-transparent',
          isProfilePage ? 'text-white' : 'text-white/50'
        )}
        asChild
      >
        <Link href="/profile">
          <User className={cn('size-6', isProfilePage && 'fill-current')} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </Button>
    </div>
  );
}
