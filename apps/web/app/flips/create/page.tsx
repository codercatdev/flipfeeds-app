'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function CreateFlip() {
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const functions = getFunctions();
  const createFlipFlow = httpsCallable(functions, 'createFlipFlow');
  const storage = getStorage();

  const handleCreateFlip = async () => {
    if (!videoFile || !user) {
      return;
    }

    try {
      const storageRef = ref(storage, `videos/${user.uid}/${videoFile.name}`);
      await uploadBytes(storageRef, videoFile);
      const videoStoragePath = storageRef.fullPath;

      const result = await createFlipFlow({
        feedId: 'your-feed-id', // TODO: Get the feed ID from the URL
        videoStoragePath,
        title,
      });
      const { flipId } = result.data;
      router.push(`/flips/${flipId}`);
    } catch (error) {
      console.error('Error creating flip', error);
      alert('Error creating flip.');
    }
  };

  return (
    <div>
      <h1>Create Flip</h1>
      <div>
        <label htmlFor="flip-title">Title:</label>
        <input
          id="flip-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="flip-video">Video:</label>
        <input
          id="flip-video"
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
        />
      </div>
      <button type="button" onClick={handleCreateFlip}>
        Create Flip
      </button>
    </div>
  );
}
