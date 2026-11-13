'use client';

import React, { createContext, useContext, useState } from 'react';

interface SidebarContextValue {
  readonly isSidebarOpen: boolean;
  readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly toggleSidebar: () => void;
  readonly sidebarWidthPx: number;
  readonly setSidebarWidthPx: React.Dispatch<React.SetStateAction<number>>;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const SidebarProvider: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidthPx, setSidebarWidthPx] = useState(288);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
        sidebarWidthPx,
        setSidebarWidthPx,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
};
