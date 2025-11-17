'use client';

import { AuthLayout } from '@/components/auth-layout';
import { FeedIconBar } from '@/components/feed-icon-bar';
import { FlipsList } from '@/components/flips-list';
import { SecondarySidebar } from '@/components/secondary-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { SelectedFeedProvider, useSelectedFeed } from '@/hooks/use-selected-feed';

function FeedsContent() {
  const { selectedFeedId, selectedNestedFeedId } = useSelectedFeed();
  const displayFeedId = selectedNestedFeedId || selectedFeedId;

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FlipsList feedId={displayFeedId || undefined} />
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
          {/* Left icon bar - Discord/Slack style */}
          <div className="bg-sidebar border-r shrink-0">
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
