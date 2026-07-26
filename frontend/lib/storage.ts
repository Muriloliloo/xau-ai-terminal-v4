interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readStoredJson<T>(
  storage: StorageLike,
  key: string,
  fallback: T,
  normalize: (value: unknown) => T,
): T {
  try {
    const stored = storage.getItem(key);
    return stored ? normalize(JSON.parse(stored) as unknown) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(
  storage: StorageLike,
  key: string,
  value: unknown,
): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // The caller keeps the state in memory when storage is unavailable.
  }
}
