import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const CompanyContext = createContext(undefined);

// Module-level preloaded companies to start fetch as early as possible
let preloadedCompanies = null;
(async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${BASE_URL}/api/companies/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    preloadedCompanies = Array.isArray(data) ? data : data?.data || [];
  } catch (err) {
    // Non-fatal; we'll still fetch on provider mount
    console.warn('Preload companies failed:', err);
  }
})();

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState(preloadedCompanies || []);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isReady, setIsReady] = useState(
    Boolean(preloadedCompanies && preloadedCompanies.length),
  );

  // Function to trigger refresh in CompanySwitcher
  const triggerCompaniesRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const fetchCompanies = useCallback(async (showLoading = false) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      setCompanies(list);
      preloadedCompanies = list; // update module cache

      // initialize selected company if not set
      const savedCompanyId = await AsyncStorage.getItem('selectedCompanyId');
      if (!savedCompanyId || savedCompanyId === 'all') {
        setSelectedCompanyId(null);
        await AsyncStorage.setItem('selectedCompanyId', 'all');
      } else {
        const exists = list.some(c => c._id === savedCompanyId);
        setSelectedCompanyId(exists ? savedCompanyId : null);
      }
    } catch (err) {
      console.error('CompanyProvider fetchCompanies error:', err);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // If module preload already provided companies, use them; otherwise fetch
    if (preloadedCompanies && preloadedCompanies.length > 0) {
      setCompanies(preloadedCompanies);
      (async () => {
        try {
          const savedCompanyId = await AsyncStorage.getItem(
            'selectedCompanyId',
          );
          if (!savedCompanyId || savedCompanyId === 'all') {
            setSelectedCompanyId(null);
            await AsyncStorage.setItem('selectedCompanyId', 'all');
          } else {
            const exists = preloadedCompanies.some(
              c => c._id === savedCompanyId,
            );
            setSelectedCompanyId(exists ? savedCompanyId : null);
          }
        } catch (err) {
          console.warn('CompanyProvider init from preload failed:', err);
        } finally {
          setIsReady(true);
        }
      })();
    } else {
      fetchCompanies(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCompanies]);

  const value = {
    companies,
    setCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    refreshTrigger,
    triggerCompaniesRefresh,
    fetchCompanies,
    isReady,
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
