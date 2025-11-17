'use client';

import { doc, getDoc } from 'firebase/firestore';
import { Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavUser } from '@/components/nav-user';
import { NestedFeedsNav } from '@/components/nested-feeds-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedFeed } from '@/hooks/use-selected-feed';
import { db } from '@/lib/firebase';

export function SecondarySidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { selectedFeedId } = useSelectedFeed();
  const [feedName, setFeedName] = useState<string>('Select a Feed');

  useEffect(() => {
    if (!selectedFeedId) {
      setFeedName('Select a Feed');
      return;
    }

    const fetchFeedName = async () => {
      const feedDoc = await getDoc(doc(db, 'feeds', selectedFeedId));
      if (feedDoc.exists()) {
        setFeedName(feedDoc.data()?.name || 'Feed');
      }
    };

    fetchFeedName();
  }, [selectedFeedId]);

  if (!user) {
    return null;
  }

  return (
    <Sidebar variant="sidebar" collapsible="none" className="hidden md:flex" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Video className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{feedName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {selectedFeedId ? 'Active Feed' : 'No feed selected'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NestedFeedsNav />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.displayName || 'User',
            email: user.email || '',
            avatar: user.photoURL || '/avatars/default.jpg',
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
