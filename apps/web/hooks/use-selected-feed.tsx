'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';

interface SelectedFeedContextType {
  selectedFeedId: string | null;
  setSelectedFeedId: (feedId: string | null) => void;
  selectedNestedFeedId: string | null;
  setSelectedNestedFeedId: (feedId: string | null) => void;
}

const SelectedFeedContext = createContext<SelectedFeedContextType | undefined>(undefined);

export function SelectedFeedProvider({ children }: { children: ReactNode }) {
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedNestedFeedId, setSelectedNestedFeedId] = useState<string | null>(null);

  return (
    <SelectedFeedContext.Provider
      value={{
        selectedFeedId,
        setSelectedFeedId,
        selectedNestedFeedId,
        setSelectedNestedFeedId,
      }}
    >
      {children}
    </SelectedFeedContext.Provider>
  );
}

export function useSelectedFeed() {
  const context = useContext(SelectedFeedContext);
  if (!context) {
    throw new Error('useSelectedFeed must be used within SelectedFeedProvider');
  }
  return context;
}
