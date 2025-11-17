'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateFeed() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const router = useRouter();

  const functions = getFunctions();
  const createFeedFlow = httpsCallable(functions, 'createFeedFlow');

  const handleCreateFeed = async () => {
    try {
      const result = await createFeedFlow({ name, description, visibility });
      const { feedId } = result.data;
      router.push(`/feeds/${feedId}`);
    } catch (error) {
      console.error('Error creating feed', error);
      alert('Error creating feed.');
    }
  };

  return (
    <div>
      <h1>Create Feed</h1>
      <div>
        <label htmlFor="feed-name">Name:</label>
        <input id="feed-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="feed-description">Description:</label>
        <textarea
          id="feed-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="feed-visibility">Visibility:</label>
        <select
          id="feed-visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>
      <button type="button" onClick={handleCreateFeed}>
        Create Feed
      </button>
    </div>
  );
}
