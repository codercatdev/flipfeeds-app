'use client';

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Hash, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useSelectedFeed } from '@/hooks/use-selected-feed';
import { db } from '@/lib/firebase';

interface NestedFeed {
  id: string;
  name: string;
  logoURL?: string;
  parentFeedId: string;
}

export function NestedFeedsNav() {
  const { selectedFeedId, selectedNestedFeedId, setSelectedNestedFeedId } = useSelectedFeed();
  const [nestedFeeds, setNestedFeeds] = useState<NestedFeed[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFeedId) {
      setNestedFeeds([]);
      setSelectedNestedFeedId(null);
      return;
    }

    setLoading(true);

    // Query for feeds that have this feed as their parent
    const feedsRef = collection(db, 'feeds');
    const q = query(feedsRef, where('parentFeedId', '==', selectedFeedId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedsData: NestedFeed[] = [];
        for (const doc of snapshot.docs) {
          feedsData.push({
            id: doc.id,
            ...doc.data(),
          } as NestedFeed);
        }
        setNestedFeeds(feedsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching nested feeds:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedFeedId, setSelectedNestedFeedId]);

  if (!selectedFeedId) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Nested Feeds</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading && (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <span className="text-muted-foreground">Loading...</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {!loading && nestedFeeds.length === 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <Hash className="size-4" />
                <span className="text-muted-foreground">No nested feeds</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {nestedFeeds.map((feed) => (
            <SidebarMenuItem key={feed.id}>
              <SidebarMenuButton
                isActive={selectedNestedFeedId === feed.id}
                onClick={() => setSelectedNestedFeedId(feed.id)}
              >
                <Hash className="size-4" />
                <span>{feed.name}</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction>
                    <Settings className="size-4" />
                    <span className="sr-only">Settings</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem>
                    <span>View Feed</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Feed Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
