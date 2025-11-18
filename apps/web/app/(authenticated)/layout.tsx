import { redirect } from 'next/navigation';
import { AuthProvider } from '@/hooks/use-auth';
import { getServerAuth } from '@/lib/auth-server';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth check (works in both emulator and production)
  const user = await getServerAuth();

  // Redirect to signin if not authenticated
  if (!user) {
    redirect('/signin');
  }

  // Render with auth provider for client-side hydration
  return <AuthProvider>{children}</AuthProvider>;
}
