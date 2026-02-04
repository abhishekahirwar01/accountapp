import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * smartFetch(endpoint, { cacheKey, forceRefresh = false, ttl = DEFAULT_TTL })
 * - Uses axios `api` instance to fetch data
 * - Caches successful responses to AsyncStorage under `cacheKey`
 * - Returns { data, fromCache, isStale }
 */
export default async function smartFetch(endpoint, options = {}) {
  const { cacheKey, forceRefresh = false, ttl = DEFAULT_TTL } = options;
  if (!cacheKey) throw new Error('smartFetch requires a cacheKey');

  let cached = null;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) cached = JSON.parse(raw);
  } catch (err) {
    // Ignore cache read errors
    console.warn('smartFetch: failed to read cache', cacheKey, err.message);
  }

  const now = Date.now();
  if (
    cached &&
    !forceRefresh &&
    typeof cached._ts === 'number' &&
    now - cached._ts < ttl
  ) {
    return { data: cached.data, fromCache: true, isStale: false };
  }

  // Try network
  try {
    const res = await api.get(endpoint);
    const data = res.data;
    try {
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ _ts: Date.now(), data }),
      );
    } catch (err) {
      console.warn('smartFetch: failed to write cache', cacheKey, err.message);
    }

    return { data, fromCache: false, isStale: false };
  } catch (err) {
    if (cached) {
      return { data: cached.data, fromCache: true, isStale: true, error: err };
    }
    // rethrow so callers can show an error
    throw err;
  }
}
