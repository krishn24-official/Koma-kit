/**
 * Tiny IndexedDB wrapper. Stores:
 *  - `templates`: My templates (keyed by `id`)
 *  - `kv`: single values, e.g. the card sheet (out-of-line keys)
 */
const DB_NAME = 'koma-kit';
const VERSION = 2;
export type StoreName = 'templates' | 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Could not open storage'));
    };
  });
  return dbPromise;
}

export async function runDb<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const request = action(tx.objectStore(name));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? request.error ?? new Error('Storage error'));
    tx.onabort = () => reject(tx.error ?? new Error('Storage error'));
  });
}

/** Asks the browser not to clear saved work when the device runs low on space. */
export const requestPersistence = (): void => {
  void navigator.storage?.persist?.().catch(() => undefined);
};

export const isQuotaError = (e: unknown): boolean =>
  e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
