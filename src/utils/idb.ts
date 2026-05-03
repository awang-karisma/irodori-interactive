import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface AssetDB extends DBSchema {
  assets: {
    key: string;
    value: Blob;
  };
}

let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<AssetDB>('irodori-assets', 1, {
      upgrade(db) {
        db.createObjectStore('assets');
      },
    });
  }
  return dbPromise;
};

export const storeAsset = async (key: string, blob: Blob): Promise<void> => {
  try {
    const db = await getDB();
    await db.put('assets', blob, key);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please free up space or clear cache.');
    }
    throw error;
  }
};

export const getAsset = async (key: string): Promise<Blob | undefined> => {
  const db = await getDB();
  return db.get('assets', key);
};

export const hasAsset = async (key: string): Promise<boolean> => {
  const db = await getDB();
  const result = await db.getKey('assets', key);
  return result !== undefined;
};

export const clearCache = async (): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('assets', 'readwrite');
  await tx.objectStore('assets').clear();
  await tx.done;
};

export const requestPersistentStorage = async (): Promise<boolean> => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const persisted = await navigator.storage.persisted();
    if (persisted) return true;

    const granted = await navigator.storage.persist();
    return granted;
  }
  return false;
};

export const getStorageEstimate = async (): Promise<{ quota?: number; usage?: number } | null> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return await navigator.storage.estimate();
  }
  return null;
};