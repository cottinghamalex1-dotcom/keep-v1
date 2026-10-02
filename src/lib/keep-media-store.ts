// IndexedDB blob storage for the current Keep project (recordings, photos, videos).
// Large media never goes into localStorage. Every call fails soft (returns null/false)
// so the app keeps working session-only when IndexedDB is unavailable (e.g. some private modes).
const DB_NAME = "keep-mvp";
const STORE = "blobs";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(req ? (req.result as T) : (true as T));
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function putBlob(id: string, blob: Blob): Promise<boolean> {
  const r = await run("readwrite", (s) => s.put(blob, id));
  return r !== null;
}

export async function getBlob(id: string): Promise<Blob | null> {
  const r = await run<Blob | undefined>("readonly", (s) => s.get(id));
  return r instanceof Blob ? r : null;
}

export async function deleteBlobs(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await run("readwrite", (s) => { ids.forEach((id) => s.delete(id)); });
}

export async function clearBlobs(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}
