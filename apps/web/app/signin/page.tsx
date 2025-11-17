'use client';

import { GoogleSignInButton, SignInAuthScreen } from '@firebase-ui/react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase';

export default function SignIn() {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push('/');
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <div className="p-6 mt-8 text-left border w-96 rounded-xl">
                <SignInAuthScreen>
                    <GoogleSignInButton />
                </SignInAuthScreen>
            </div>
        </div>
    );
}
