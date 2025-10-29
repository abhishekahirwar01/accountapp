import React, { createContext, useState, useContext } from 'react';

const CompanyContext = createContext(undefined);

export function CompanyProvider({ children }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const value = { selectedCompanyId, setSelectedCompanyId };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}