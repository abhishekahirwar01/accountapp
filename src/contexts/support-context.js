// SupportContext.js
import React, { createContext, useContext, useState } from 'react';

const SupportContext = createContext(undefined);

export const SupportProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSupport = () => setIsOpen(prev => !prev);
  const openSupport = () => setIsOpen(true);
  const closeSupport = () => setIsOpen(false);

  return (
    <SupportContext.Provider
      value={{
        isOpen,
        toggleSupport,
        openSupport,
        closeSupport,
      }}
    >
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = () => {
  const context = useContext(SupportContext);

  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }

  return context;
};
