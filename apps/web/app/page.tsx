'use client';

import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }
  return <div>Hello, {user ? user.displayName : 'world'}!</div>;
}
