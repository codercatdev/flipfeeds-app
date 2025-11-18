import { requireAuth } from '@/lib/auth-server';
import { FlipPageClient } from './page.client';

export interface FlipPageProps {
  params: {
    flipId: string;
  };
}

export default async function FlipPage({ params }: FlipPageProps) {
  const { flipId } = await params;
  // Server-side auth check and user data fetch
  const user = await requireAuth();

  // Pass server data to client component for hydration
  return <FlipPageClient initialUser={user} params={{ flipId }} />;
}
