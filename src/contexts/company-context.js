import React, { createContext, useState, useContext, useCallback } from 'react';

const CompanyContext = createContext(undefined);

export function CompanyProvider({ children }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger refresh in CompanySwitcher
  const triggerCompaniesRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const value = {
    selectedCompanyId,
    setSelectedCompanyId,
    refreshTrigger,
    triggerCompaniesRefresh,
  };

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
