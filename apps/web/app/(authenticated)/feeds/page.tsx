import { requireAuth } from '@/lib/auth-server';
import { FeedsPageClient } from './page.client';

export const dynamic = 'force-dynamic';

export default async function FeedsPage() {
  // Server-side auth check and user data fetch
  const user = await requireAuth();

  // Pass server data to client component for hydration
  return <FeedsPageClient initialUser={user} />;
}
