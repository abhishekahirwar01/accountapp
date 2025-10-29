import React, { createContext, useState, useContext } from 'react';

const SupportContext = createContext(undefined);

export function SupportProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSupport = () => setIsOpen(!isOpen);
  const openSupport = () => setIsOpen(true);
  const closeSupport = () => setIsOpen(false);

  const value = {
    isOpen,
    toggleSupport,
    openSupport,
    closeSupport,
  };

  return (
    <SupportContext.Provider value={value}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (context === undefined) {
    throw new Error("useSupport must be used within a SupportProvider");
  }
  return context;
}