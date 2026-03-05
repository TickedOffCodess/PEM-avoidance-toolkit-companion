const DB_NAME = 'pem_toolkit_db';
const DB_VERSION = 1;
const STORE = 'data';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e);
  });
}

export async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result !== undefined ? req.result : null); };
    req.onerror = () => { db.close(); resolve(null); };
  });
}

export async function dbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = (e) => { db.close(); reject(e.target.error); };
  });
}

export async function dbExportAll() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    const reqKeys = store.getAllKeys();
    const result = {};
    req.onsuccess = () => {
      reqKeys.onsuccess = () => {
        const keys = reqKeys.result;
        const vals = req.result;
        keys.forEach((k, i) => { result[k] = vals[i]; });
        db.close();
        resolve(result);
      };
      reqKeys.onerror = () => { db.close(); resolve({}); };
    };
    req.onerror = () => { db.close(); resolve({}); };
  });
}

export async function dbImportAll(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    Object.entries(data).forEach(([key, val]) => {
      store.put(val, key);
    });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = (e) => { db.close(); reject(e.target.error); };
  });
}
