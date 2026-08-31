/**
 * In-memory KV mock for Worker quota tests.
 */
export function createMemoryKv() {
  /** @type {Map<string, { value: string, expiresAt?: number }>} */
  const store = new Map();

  function alive(entry) {
    if (!entry) return false;
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      return false;
    }
    return true;
  }

  return {
    async get(key) {
      const entry = store.get(key);
      if (!alive(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key, value, options = {}) {
      const expiresAt =
        typeof options.expirationTtl === "number"
          ? Date.now() + options.expirationTtl * 1000
          : undefined;
      store.set(key, { value: String(value), expiresAt });
    },
    dump() {
      return Object.fromEntries(
        [...store.entries()]
          .filter(([, entry]) => alive(entry))
          .map(([k, entry]) => [k, entry.value]),
      );
    },
  };
}
