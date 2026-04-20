// hooks/useAllTransactions.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

const CACHE_TTL_MS = 30_000;
const allTransactionsCache = new Map();

const parseTimestamp = value => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const parsedTime = new Date(raw).getTime();
  return Number.isFinite(parsedTime) ? parsedTime : 0;
};

const parseObjectIdTimestamp = value => {
  const raw = String(value ?? '').trim();
  if (!/^[0-9a-fA-F]{24}$/.test(raw)) return 0;
  return parseInt(raw.slice(0, 8), 16) * 1000;
};

const getRecencyTimestamp = transaction =>
  parseTimestamp(transaction?.createdAt) ||
  parseTimestamp(transaction?.updatedAt) ||
  parseTimestamp(transaction?.date) ||
  parseObjectIdTimestamp(transaction?._id);

const sortTransactionsByRecency = items =>
  [...items].sort((a, b) => {
    const recencyDiff = getRecencyTimestamp(b) - getRecencyTimestamp(a);
    if (recencyDiff !== 0) return recencyDiff;
    return parseTimestamp(b?.date) - parseTimestamp(a?.date);
  });

const makeCacheKey = (companyId, dateRange) =>
  JSON.stringify({
    companyId: companyId || 'all',
    startDate: dateRange?.startDate || '',
    endDate: dateRange?.endDate || '',
  });

const clearCache = (companyId, dateRange) => {
  const targetKey = makeCacheKey(companyId, dateRange);
  allTransactionsCache.delete(targetKey);
};

export function useAllTransactions(companyId, dateRange, enabled = true) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const cancelledRef = useRef(false);

  const cacheKey = useMemo(
    () => makeCacheKey(companyId, dateRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, dateRange?.startDate, dateRange?.endDate],
  );

  const fetchData = useCallback(
    async (ignoreCache = false) => {
      cancelledRef.current = false;

      if (!enabled) {
        setIsLoading(false);
        setError(null);
        return;
      }

      const cached = allTransactionsCache.get(cacheKey);
      const hasFreshCache =
        !ignoreCache && !!cached && cached.expiresAt > Date.now();

      if (hasFreshCache) {
        setData(cached.data);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const token = await AsyncStorage.getItem('token');

        if (!token || !BASE_URL) {
          setData([]);
          setIsLoading(false);
          setError('Authentication or API base URL is missing.');
          return;
        }

        const queryParts = ['sortBy=date', 'sortOrder=desc', 'limit=1000'];
        if (companyId && companyId !== 'all') {
          queryParts.push(`companyId=${encodeURIComponent(companyId)}`);
        }
        if (dateRange?.startDate) {
          queryParts.push(
            `startDate=${encodeURIComponent(dateRange.startDate)}`,
          );
        }
        if (dateRange?.endDate) {
          queryParts.push(`endDate=${encodeURIComponent(dateRange.endDate)}`);
        }
        if (ignoreCache) {
          queryParts.push(`_ts=${Date.now()}`);
        }

        const url = `${BASE_URL}/api/transactions/all?${queryParts.join('&')}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (cancelledRef.current) return;

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const result = await response.json();

        if (cancelledRef.current) return;

        if (!result?.success) {
          throw new Error(result?.message || 'Failed to load transactions.');
        }

        const nextDataRaw = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.transactions)
          ? result.transactions
          : Array.isArray(result.entries)
          ? result.entries
          : [];

        const nextData = sortTransactionsByRecency(nextDataRaw);

        setData(nextData);
        setError(null);
        setIsLoading(false);

        allTransactionsCache.set(cacheKey, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: nextData,
        });
      } catch (err) {
        if (cancelledRef.current) return;
        const nextError =
          err instanceof Error ? err.message : 'Unknown error occurred.';
        setError(nextError);
        setIsLoading(false);
        if (!allTransactionsCache.has(cacheKey)) {
          setData([]);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, companyId, dateRange?.startDate, dateRange?.endDate, enabled],
  );

  useEffect(() => {
    void fetchData();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    clearCache(companyId, dateRange);
    void fetchData(true);
  }, [companyId, dateRange, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
