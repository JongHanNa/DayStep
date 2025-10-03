"use client";

// Cache 인터페이스
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Memory Cache 클래스
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 5분마다 만료된 아이템 정리
    if (typeof window !== "undefined") {
      this.cleanupInterval = setInterval(
        () => {
          this.cleanup();
        },
        5 * 60 * 1000
      );
    }
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// LocalStorage Cache 클래스
class LocalStorageCache {
  private prefix: string;

  constructor(prefix: string = "daystep_cache_") {
    this.prefix = prefix;
  }

  set<T>(key: string, data: T, ttl: number = 30 * 60 * 1000): void {
    if (typeof window === "undefined") return;

    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn("Failed to set localStorage cache:", error);
    }
  }

  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      const now = Date.now();

      if (now - item.timestamp > item.ttl) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn("Failed to get localStorage cache:", error);
      return null;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    if (typeof window === "undefined") return false;

    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.warn("Failed to delete localStorage cache:", error);
      return false;
    }
  }

  clear(): void {
    if (typeof window === "undefined") return;

    try {
      const keys = Object.keys(localStorage);
      keys
        .filter((key) => key.startsWith(this.prefix))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear localStorage cache:", error);
    }
  }

  size(): number {
    if (typeof window === "undefined") return 0;

    try {
      return Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      ).length;
    } catch (error) {
      console.warn("Failed to get localStorage cache size:", error);
      return 0;
    }
  }
}

// 캐시 전략 enum
export enum CacheStrategy {
  MEMORY_ONLY = "memory_only",
  LOCALSTORAGE_ONLY = "localstorage_only",
  HYBRID = "hybrid", // 메모리 우선, localStorage 백업
}

// 통합 캐시 매니저
class CacheManager {
  private memoryCache: MemoryCache;
  private localStorageCache: LocalStorageCache;
  private strategy: CacheStrategy;

  constructor(strategy: CacheStrategy = CacheStrategy.HYBRID) {
    this.memoryCache = new MemoryCache();
    this.localStorageCache = new LocalStorageCache();
    this.strategy = strategy;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        this.memoryCache.set(key, data, ttl);
        break;
      case CacheStrategy.LOCALSTORAGE_ONLY:
        this.localStorageCache.set(key, data, ttl);
        break;
      case CacheStrategy.HYBRID:
        this.memoryCache.set(key, data, ttl);
        // 중요한 데이터는 localStorage에도 백업 (더 긴 TTL)
        this.localStorageCache.set(key, data, Math.max(ttl, 30 * 60 * 1000));
        break;
    }
  }

  get<T>(key: string): T | null {
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return this.memoryCache.get<T>(key);
      case CacheStrategy.LOCALSTORAGE_ONLY:
        return this.localStorageCache.get<T>(key);
      case CacheStrategy.HYBRID:
        // 메모리에서 먼저 시도
        let data = this.memoryCache.get<T>(key);
        if (data !== null) return data;

        // 메모리에 없으면 localStorage에서 가져와서 메모리에 복원
        data = this.localStorageCache.get<T>(key);
        if (data !== null) {
          this.memoryCache.set(key, data, 5 * 60 * 1000); // 5분 TTL로 메모리에 복원
        }
        return data;
      default:
        return null;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    let result = true;
    if (this.strategy !== CacheStrategy.LOCALSTORAGE_ONLY) {
      result = this.memoryCache.delete(key) && result;
    }
    if (this.strategy !== CacheStrategy.MEMORY_ONLY) {
      result = this.localStorageCache.delete(key) && result;
    }
    return result;
  }

  clear(): void {
    if (this.strategy !== CacheStrategy.LOCALSTORAGE_ONLY) {
      this.memoryCache.clear();
    }
    if (this.strategy !== CacheStrategy.MEMORY_ONLY) {
      this.localStorageCache.clear();
    }
  }

  getStats() {
    return {
      strategy: this.strategy,
      memorySize: this.memoryCache.size(),
      localStorageSize: this.localStorageCache.size(),
    };
  }

  destroy(): void {
    this.memoryCache.destroy();
  }
}

// 전역 캐시 인스턴스들
export const apiCache = new CacheManager(CacheStrategy.HYBRID);
export const uiCache = new CacheManager(CacheStrategy.MEMORY_ONLY);
export const userDataCache = new CacheManager(CacheStrategy.LOCALSTORAGE_ONLY);

// 캐시 키 생성 유틸리티
export function createCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return [prefix, ...parts].join(":");
}

// API 응답 캐싱 래퍼
export async function cachedApiCall<T>(
  key: string,
  apiCall: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // 캐시에서 먼저 확인
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // API 호출 후 캐시에 저장
  try {
    const data = await apiCall();
    apiCache.set(key, data, ttl);
    return data;
  } catch (error) {
    // 에러 발생시 오래된 캐시라도 반환 시도
    const staleData = apiCache.get<T>(key + "_stale");
    if (staleData !== null) {
      console.warn("Using stale cache due to API error:", error);
      return staleData;
    }
    throw error;
  }
}

// 디바운스된 캐시 업데이트
const debouncedUpdates = new Map<string, NodeJS.Timeout>();

export function debouncedCacheUpdate<T>(
  key: string,
  data: T,
  delay: number = 1000,
  ttl?: number
): void {
  // 기존 타이머 제거
  if (debouncedUpdates.has(key)) {
    clearTimeout(debouncedUpdates.get(key)!);
  }

  // 새 타이머 설정
  const timer = setTimeout(() => {
    apiCache.set(key, data, ttl);
    debouncedUpdates.delete(key);
  }, delay);

  debouncedUpdates.set(key, timer);
}

// 캐시 워밍업 (중요한 데이터 미리 로드)
export async function warmupCache(
  warmupTasks: Array<() => Promise<void>>
): Promise<void> {
  try {
    await Promise.allSettled(warmupTasks);
  } catch (error) {
    console.warn("Cache warmup failed:", error);
  }
}

// 캐시 상태 모니터링
export function getCacheStats() {
  return {
    api: apiCache.getStats(),
    ui: uiCache.getStats(),
    userData: userDataCache.getStats(),
  };
}
