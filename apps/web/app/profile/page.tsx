'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function Profile() {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [bio, setBio] = useState('');

    const functions = getFunctions();
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    const handleUpdateProfile = async () => {
        try {
            await updateUserProfile({ displayName, bio });
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile', error);
            alert('Error updating profile.');
        }
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Profile</h1>
            <p>Email: {user.email}</p>
            <div>
                <label>Display Name:</label>
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            </div>
            <div>
                <label>Bio:</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <button onClick={handleUpdateProfile}>Update Profile</button>
        </div>
    );
}
