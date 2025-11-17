'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';

interface FeedContextType {
  selectedFeedId: string | null;
  setSelectedFeedId: (feedId: string | null) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  return (
    <FeedContext.Provider value={{ selectedFeedId, setSelectedFeedId }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within FeedProvider');
  }
  return context;
}
