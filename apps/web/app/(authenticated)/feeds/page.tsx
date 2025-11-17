'use client';

import { Menu, Plus } from 'lucide-react';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth-layout';
import { FeedIconBar } from '@/components/feed-icon-bar';
import { FlipsList } from '@/components/flips-list';
import { MobileFeedSelector } from '@/components/mobile-feed-selector';
import { NestedFeedsNav } from '@/components/nested-feeds-nav';
import { SecondarySidebar } from '@/components/secondary-sidebar';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { SelectedFeedProvider, useSelectedFeed } from '@/hooks/use-selected-feed';

function FeedsContent() {
  const { selectedFeedId, selectedNestedFeedId } = useSelectedFeed();
  const { user } = useAuth();
  const displayFeedId = selectedNestedFeedId || selectedFeedId;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 hidden md:flex" />

          {/* Mobile menu for feed selection */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden -ml-1">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Select a feed or nested feed</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="feeds" className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="feeds">Feeds</TabsTrigger>
                    <TabsTrigger value="nested" disabled={!selectedFeedId}>
                      Nested
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="feeds" className="flex-1 overflow-auto mt-0">
                  {user && (
                    <MobileFeedSelector
                      userId={user.uid}
                      onSelect={() => setMobileMenuOpen(false)}
                    />
                  )}
                </TabsContent>
                <TabsContent value="nested" className="flex-1 overflow-auto mt-0 p-2">
                  <NestedFeedsNav />
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>

          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
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
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pb-20 md:pb-4">
        <FlipsList feedId={displayFeedId || undefined} />
      </div>

      {/* Mobile floating action button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button size="lg" className="rounded-full size-14 shadow-lg">
          <Plus className="size-6" />
        </Button>
      </div>
    </SidebarInset>
  );
}

export default function FeedsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <AuthLayout>
      <SelectedFeedProvider>
        <div className="flex h-screen w-full">
          {/* Left icon bar - Discord/Slack style - Hidden on mobile */}
          <div className="hidden md:block bg-sidebar border-r shrink-0">
            <FeedIconBar userId={user.uid} />
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
