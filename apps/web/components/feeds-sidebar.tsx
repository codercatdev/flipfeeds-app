'use client';

import { Video } from 'lucide-react';
import { NavFeeds } from '@/components/nav-feeds';
import { NavNestedFeeds } from '@/components/nav-nested-feeds';
import { NavUser } from '@/components/nav-user';
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

export function FeedsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Video className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">FlipFeeds</span>
                  <span className="truncate text-xs">Video Social</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavFeeds userId={user.uid} />
        <NavNestedFeeds />
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
