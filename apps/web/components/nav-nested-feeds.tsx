'use client';

import { ChevronRight, Folder } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

// This component will show nested feeds within the selected feed
// For now, we'll show it as a placeholder that can be expanded later
export function NavNestedFeeds() {
  // TODO: Get the currently selected feed from context/state
  // TODO: Fetch nested feeds for the selected feed from Firestore

  // Placeholder data - will be replaced with real data
  const selectedFeed = null;

  if (!selectedFeed) {
    return null;
  }

  const nestedFeeds = [
    {
      title: 'Nested Feed 1',
      url: '#',
      items: [
        { title: 'Sub-feed A', url: '#' },
        { title: 'Sub-feed B', url: '#' },
      ],
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Nested Feeds</SidebarGroupLabel>
      <SidebarMenu>
        {nestedFeeds.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={false}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  <Folder className="size-4" />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
