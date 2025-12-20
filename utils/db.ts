import { AppData } from '../types';

const DB_NAME = 'ChristmasGiftDB';
const DB_VERSION = 1;
const STORE_NAME = 'gameData';
const DATA_KEY = 'year_2024';
const LOCAL_STORAGE_KEY = 'christmas_fallback_data';

// Check if IndexedDB is available and working
const isIndexedDBAvailable = async (): Promise<boolean> => {
  if (!('indexedDB' in window)) return false;
  try {
    return new Promise((resolve) => {
      const req = indexedDB.open('test_check', 1);
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase('test_check');
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
};

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveToDB = async (data: AppData): Promise<void> => {
  try {
    // 1. Try IndexedDB first
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
       const tx = db.transaction([STORE_NAME], 'readwrite');
       const store = tx.objectStore(STORE_NAME);
       const req = store.put(data, DATA_KEY);
       req.onsuccess = () => resolve();
       req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // 2. Fallback to LocalStorage if IndexedDB fails (e.g. file:// protocol)
    console.warn("IndexedDB failed, falling back to LocalStorage:", e);
    try {
       localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (lsError) {
       console.error("LocalStorage also failed (Quota Exceeded?):", lsError);
       throw new Error("Storage Full. Please reduce image sizes in Admin.");
    }
  }
};

export const loadFromDB = async (): Promise<AppData | null> => {
  try {
    // 1. Try IndexedDB
    const db = await getDB();
    const result = await new Promise<AppData | undefined>((resolve, reject) => {
       const tx = db.transaction([STORE_NAME], 'readonly');
       const store = tx.objectStore(STORE_NAME);
       const req = store.get(DATA_KEY);
       req.onsuccess = () => resolve(req.result);
       req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch (e) {
    console.warn("IndexedDB load failed, checking LocalStorage...");
  }

  // 2. Check LocalStorage fallback
  try {
     const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
     if (saved) return JSON.parse(saved);
  } catch (e) {
     console.error("LocalStorage load failed", e);
  }

  return null;
};
