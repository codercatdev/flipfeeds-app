'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

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
        <label htmlFor="profile-display-name">Display Name:</label>
        <input
          id="profile-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="profile-bio">Bio:</label>
        <textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <button type="button" onClick={handleUpdateProfile}>
        Update Profile
      </button>
    </div>
  );
}
