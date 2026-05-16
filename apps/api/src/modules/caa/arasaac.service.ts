import type { ArasaacPictogram } from '@evolua/contracts';

const ARASAAC_BASE = 'https://api.arasaac.org/api';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const CACHE_MAX_ENTRIES = 200;
const FETCH_TIMEOUT_MS = 6_000;

interface CacheEntry {
  value: ArasaacPictogram[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): ArasaacPictogram[] | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    cache.delete(key);
    return null;
  }
  // LRU-ish: re-insert para mover ao final
  cache.delete(key);
  cache.set(key, e);
  return e.value;
}

function cacheSet(key: string, value: ArasaacPictogram[]): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export class ArasaacService {
  async search(query: string, lang: string): Promise<ArasaacPictogram[]> {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];
    const key = `${lang}:${trimmed}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    const url = `${ARASAAC_BASE}/pictograms/${encodeURIComponent(lang)}/search/${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      // 404 = nenhum resultado (não erro), retorna lista vazia
      if (res.status === 404) {
        cacheSet(key, []);
        return [];
      }
      const err = new Error(`ARASAAC ${res.status}`) as Error & { statusCode: number };
      err.statusCode = 502;
      throw err;
    }

    const data = (await res.json()) as ArasaacPictogram[];
    const result = Array.isArray(data) ? data.slice(0, 100) : [];
    cacheSet(key, result);
    return result;
  }
}

export const arasaacService = new ArasaacService();
