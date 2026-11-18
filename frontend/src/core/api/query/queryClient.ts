class QueryCacheRegistry {
  private cache = new Map<string, { data: unknown; updatedAt: number }>();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : undefined;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, updatedAt: Date.now() });
  }

  invalidateTenant(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(tenantId)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCacheRegistry();
