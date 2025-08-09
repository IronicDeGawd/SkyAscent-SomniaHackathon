// Leaderboard cache utility with TTL support

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class LeaderboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private static instance: LeaderboardCache;
  
  private constructor() {}
  
  static getInstance(): LeaderboardCache {
    if (!LeaderboardCache.instance) {
      LeaderboardCache.instance = new LeaderboardCache();
    }
    return LeaderboardCache.instance;
  }
  
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000; // Convert minutes to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    console.log(`📦 Cache SET: ${key} with ${ttlMinutes}min TTL`);
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`📦 Cache MISS: ${key}`);
      return null;
    }
    
    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      console.log(`📦 Cache EXPIRED: ${key}`);
      return null;
    }
    
    const remainingTTL = Math.ceil((entry.ttl - (now - entry.timestamp)) / 1000 / 60);
    console.log(`📦 Cache HIT: ${key} (${remainingTTL}min remaining)`);
    return entry.data;
  }
  
  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`📦 Cache INVALIDATED: ${key}`);
    }
  }
  
  invalidateAll(): void {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();
    console.log(`📦 Cache CLEARED: ${keys.length} entries`);
  }
  
  // Get cache stats for debugging
  getStats(): { totalEntries: number; keys: string[] } {
    return {
      totalEntries: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const leaderboardCache = LeaderboardCache.getInstance();