'use client';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { MoreHorizontal, Settings, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { db } from '@/lib/firebase';

interface Feed {
  id: string;
  name: string;
  logoURL: string;
  role: string;
}

interface NavFeedsProps {
  userId: string;
}

export function NavFeeds({ userId }: NavFeedsProps) {
  const { isMobile } = useSidebar();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !db) return;

    const userFeedsRef = collection(db, `users/${userId}/feeds`);
    const q = query(userFeedsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedsData: Feed[] = [];
        for (const doc of snapshot.docs) {
          feedsData.push({
            id: doc.id,
            ...doc.data(),
          } as Feed);
        }
        setFeeds(feedsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching feeds:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>My Feeds</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <span className="text-muted-foreground">Loading...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>My Feeds</SidebarGroupLabel>
      <SidebarMenu>
        {feeds.map((feed) => (
          <SidebarMenuItem key={feed.id}>
            <SidebarMenuButton asChild>
              <a href={`/feeds/${feed.id}`}>
                <Star className="size-4" />
                <span>{feed.name}</span>
              </a>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem>
                  <Settings className="text-muted-foreground" />
                  <span>Feed Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <span>Leave Feed</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
