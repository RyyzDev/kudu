interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
export const DEFAULT_ACADEMIC_TTL = 5 * 60 * 1000; // 5 menit (300.000 ms)

export function getAcademicCache<T>(key: string, ttl: number = DEFAULT_ACADEMIC_TTL): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    return null;
  }
  return entry.data as T;
}

export function getStaleAcademicCache<T>(key: string): T | null {
  const entry = cache.get(key);
  return entry ? (entry.data as T) : null;
}

export function setAcademicCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function removeAcademicCache(key: string): void {
  cache.delete(key);
}

export function clearAcademicCache(): void {
  cache.clear();
}

export async function fetchWithAcademicCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { forceRefresh?: boolean; ttl?: number }
): Promise<T> {
  const { forceRefresh = false, ttl = DEFAULT_ACADEMIC_TTL } = options || {};

  if (!forceRefresh) {
    const cached = getAcademicCache<T>(key, ttl);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    const freshData = await fetcher();
    if (forceRefresh) {
      clearAcademicCache();
    }
    setAcademicCache(key, freshData);
    return freshData;
  } catch (err) {
    if (!forceRefresh) {
      const stale = getStaleAcademicCache<T>(key);
      if (stale !== null) {
        console.warn(`[CACHE] Fetch gagal untuk ${key}, menggunakan cache yang ada.`, err);
        return stale;
      }
    }
    throw err;
  }
}
