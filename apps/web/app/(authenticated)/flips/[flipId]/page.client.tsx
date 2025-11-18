'use client';

import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { AuthLayout } from '@/components/auth-layout';
import type { AuthUser } from '@/lib/auth-server';
import type { Flip } from '@/lib/flips';

interface FlipPageProps {
  initialUser: AuthUser;
  params: {
    flipId: string;
  };
}

export function FlipPageClient({ params }: FlipPageProps) {
  const { flipId } = params;
  const db = getFirestore();
  const [flip, setFlip] = useState<Flip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const flipRef = doc(db, 'flips', flipId);

    const unsubscribe = onSnapshot(
      flipRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setFlip({ id: snapshot.id, ...snapshot.data() } as Flip);
          setError(null);
        } else {
          setFlip(null);
          setError('Flip not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching flip:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [flipId, db]);

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-8">
          <p>Loading flip...</p>
        </div>
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-8">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Flip Details</h1>
        <div className="rounded-lg border p-4">
          <pre className="whitespace-pre-wrap">{JSON.stringify(flip, null, 2)}</pre>
        </div>
      </div>
    </AuthLayout>
  );
}
