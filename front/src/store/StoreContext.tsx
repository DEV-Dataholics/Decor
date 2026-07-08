import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import type { DecorStore } from '../store/useStore';

const StoreContext = createContext<DecorStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    store.checkAuth().finally(() => setIsInitializing(false));
  }, [store.checkAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a2818]"></div>
      </div>
    );
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useDecor(): DecorStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useDecor must be used within StoreProvider');
  return ctx;
}
