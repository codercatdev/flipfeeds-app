'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { AgentChat } from '@/components/agent-chat';
import { AuthLayout } from '@/components/auth-layout';
import { FeedIconBar } from '@/components/feed-icon-bar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { MobileDrawerContent } from '@/components/mobile-drawer-content';
import { SecondarySidebar } from '@/components/secondary-sidebar';
import { SwipeableFeed } from '@/components/swipeable-feed';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { SelectedFeedProvider, useSelectedFeed } from '@/hooks/use-selected-feed';
import type { AuthUser } from '@/lib/auth-server';

interface FeedsPageClientProps {
  initialUser: AuthUser;
}

function FeedsContent() {
  const { selectedFeedId, selectedNestedFeedId } = useSelectedFeed();
  const { user } = useAuth();
  const displayFeedId = selectedNestedFeedId || selectedFeedId;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(false);

  return (
    <SidebarInset className="h-[100dvh] overflow-hidden bg-black p-0 m-0 flex flex-col">
      {/* Desktop Header */}
      <header className="hidden md:flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background text-foreground z-10">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>My Feeds</BreadcrumbPage>
            </BreadcrumbItem>
            {selectedFeedId && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedNestedFeedId ? 'Nested Feed' : 'Feed'}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content Area */}
      <div className="relative flex-1 w-full bg-black overflow-hidden">
        {/* Mobile Hamburger (Floating) */}
        <div className="absolute top-4 left-4 z-50 md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm"
              >
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-80 text-foreground z-[100] border-r-0 bg-transparent shadow-none"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Select a feed or nested feed</SheetDescription>
              </SheetHeader>
              <div className="h-full w-full bg-background rounded-r-2xl overflow-hidden border-r border-border">
                <MobileDrawerContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Feed Container */}
        {/* Desktop: Centered, limited width. Mobile: Full width/height. */}
        <div className="h-full w-full md:mx-auto md:w-[450px] md:border-x md:border-zinc-800 bg-black relative">
          <SwipeableFeed feedId={displayFeedId || undefined} className="h-full w-full" />
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {user && <MobileBottomNav userId={user.uid} onAgentClick={() => setAgentChatOpen(true)} />}

      {/* Agent Chat Dialog */}
      <AgentChat open={agentChatOpen} onOpenChange={setAgentChatOpen} />
    </SidebarInset>
  );
}

export function FeedsPageClient({ initialUser }: FeedsPageClientProps) {
  const { user } = useAuth();

  // Use client-side user if available (for real-time updates), fallback to SSR user
  const currentUser = user || {
    uid: initialUser.uid,
    email: initialUser.email,
    displayName: initialUser.displayName,
    photoURL: initialUser.photoURL,
  };

  return (
    <AuthLayout>
      <SelectedFeedProvider>
        <div className="flex h-screen w-full bg-background text-foreground">
          {/* Left icon bar - Desktop only */}
          <div className="hidden md:block bg-sidebar border-r shrink-0 w-[60px]">
            <FeedIconBar userId={currentUser.uid} />
          </div>

          {/* Secondary sidebar and main content */}
          <SidebarProvider>
            <SecondarySidebar />
            <FeedsContent />
          </SidebarProvider>
        </div>
      </SelectedFeedProvider>
    </AuthLayout>
  );
}
