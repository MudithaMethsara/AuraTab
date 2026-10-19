/**
 * Storage abstraction layer
 * Wraps chrome.storage.sync, chrome.storage.local, and IndexedDB
 * with graceful fallbacks to localStorage.
 */
'use strict';

const Storage = (() => {
  const DB_NAME = 'hometab_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'blobs';

  // Detect if chrome.storage is available
  const hasChromeStorage = typeof chrome !== 'undefined' && Boolean(chrome.storage);

  // In-memory cache to resolve storage reads in 0ms without IPC round-trips
  let _syncCache = null;
  let _localCache = null;
  let _preloadPromise = null;

  // Listen for storage changes across tabs or browser sync to keep memory cache coherent
  if (hasChromeStorage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && _syncCache) {
        Object.keys(changes).forEach(k => {
          if (changes[k].newValue === undefined) {
            delete _syncCache[k];
          } else {
            _syncCache[k] = changes[k].newValue;
          }
        });
      } else if (area === 'local' && _localCache) {
        Object.keys(changes).forEach(k => {
          if (changes[k].newValue === undefined) {
            delete _localCache[k];
          } else {
            _localCache[k] = changes[k].newValue;
          }
        });
      }
    });
  }

  /**
   * Preload all sync and local storage in a single parallel batch operation.
   * Collapses 15-20 separate IPC round-trips into 1 on tab startup.
   */
  function preloadAll() {
    if (_preloadPromise) return _preloadPromise;

    if (!hasChromeStorage) {
      _syncCache = _localGetAll();
      _localCache = { ..._syncCache };
      _preloadPromise = Promise.resolve({ sync: _syncCache, local: _localCache });
      return _preloadPromise;
    }

    const syncP = new Promise((resolve) => {
      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('storage.sync.get(null) error:', chrome.runtime.lastError);
          resolve(_localGetAll());
        } else {
          resolve(result || {});
        }
      });
    });

    const localP = new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('storage.local.get(null) error:', chrome.runtime.lastError);
          resolve(_localGetAll());
        } else {
          resolve(result || {});
        }
      });
    });

    _preloadPromise = Promise.all([syncP, localP]).then(([syncData, localData]) => {
      _syncCache = syncData || {};
      _localCache = localData || {};
      return { sync: _syncCache, local: _localCache };
    });

    return _preloadPromise;
  }

  function _extractKeys(source, keys) {
    if (!source) return {};
    if (keys === null || keys === undefined) return { ...source };
    const result = {};
    const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys));
    keyList.forEach(k => {
      if (source[k] !== undefined) {
        result[k] = source[k];
      } else if (typeof keys === 'object' && !Array.isArray(keys) && keys[k] !== undefined) {
        result[k] = keys[k];
      }
    });
    return result;
  }

  /** chrome.storage.sync wrapper (small settings) */
  async function getSync(keys) {
    if (_syncCache) {
      return _extractKeys(_syncCache, keys);
    }
    if (_preloadPromise) {
      await _preloadPromise;
      return _extractKeys(_syncCache, keys);
    }
    if (!hasChromeStorage) {
      return _localGet(keys);
    }
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('storage.sync.get error:', chrome.runtime.lastError);
          resolve(_localGet(keys));
          return;
        }
        resolve(result || {});
      });
    });
  }

  /** Synchronous instant read from sync memory cache */
  function getSyncCached(key, fallback = undefined) {
    if (_syncCache && _syncCache[key] !== undefined) {
      return _syncCache[key];
    }
    const localFallback = localStorage.getItem('hometab_' + key);
    if (localFallback !== null) {
      try { return JSON.parse(localFallback); } catch (_) { return localFallback; }
    }
    return fallback;
  }

  async function setSync(data) {
    if (!data || typeof data !== 'object') return;
    if (_syncCache) {
      Object.assign(_syncCache, data);
    }
    _localSet(data);

    if (!hasChromeStorage) return;

    return new Promise((resolve) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime?.lastError) {
          console.warn('storage.sync.set error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /** chrome.storage.local wrapper (larger data like todos, weather cache) */
  async function getLocal(keys) {
    if (_localCache) {
      return _extractKeys(_localCache, keys);
    }
    if (_preloadPromise) {
      await _preloadPromise;
      return _extractKeys(_localCache, keys);
    }
    if (!hasChromeStorage) {
      return _localGet(keys);
    }
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('storage.local.get error:', chrome.runtime.lastError);
          resolve(_localGet(keys));
          return;
        }
        resolve(result || {});
      });
    });
  }

  /** Synchronous instant read from local memory cache */
  function getLocalCached(key, fallback = undefined) {
    if (_localCache && _localCache[key] !== undefined) {
      return _localCache[key];
    }
    const localFallback = localStorage.getItem('hometab_' + key);
    if (localFallback !== null) {
      try { return JSON.parse(localFallback); } catch (_) { return localFallback; }
    }
    return fallback;
  }

  async function setLocal(data) {
    if (!data || typeof data !== 'object') return;
    if (_localCache) {
      Object.assign(_localCache, data);
    }
    _localSet(data);

    if (!hasChromeStorage) return;

    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime?.lastError) {
          console.warn('storage.local.set error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  async function removeLocal(keys) {
    const arr = Array.isArray(keys) ? keys : [keys];
    if (_localCache) {
      arr.forEach(k => delete _localCache[k]);
    }
    arr.forEach(k => localStorage.removeItem('hometab_' + k));

    if (!hasChromeStorage) return;

    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => resolve());
    });
  }

  /** IndexedDB wrapper for wallpaper blobs */
  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function putBlob(key, blob) {
    try {
      const db = await _openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('IndexedDB putBlob error:', e);
    }
  }

  async function getBlob(key) {
    try {
      const db = await _openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB getBlob error:', e);
      return null;
    }
  }

  async function deleteBlob(key) {
    try {
      const db = await _openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('IndexedDB deleteBlob error:', e);
    }
  }

  async function clearAllBlobs() {
    try {
      const db = await _openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('IndexedDB clear error:', e);
    }
  }

  /** localStorage fallback helpers */
  function _localGetAll() {
    const result = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hometab_')) {
          const stripped = key.slice(8);
          const val = localStorage.getItem(key);
          try { result[stripped] = JSON.parse(val); } catch (_) { result[stripped] = val; }
        }
      }
    } catch (_) {}
    return result;
  }

  function _localGet(keys) {
    const result = {};
    const arr = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys));
    arr.forEach(k => {
      const val = localStorage.getItem('hometab_' + k);
      if (val !== null) {
        try { result[k] = JSON.parse(val); } catch { result[k] = val; }
      }
    });
    return result;
  }

  function _localSet(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(k => {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      try {
        localStorage.setItem('hometab_' + k, JSON.stringify(data[k]));
      } catch (e) {
        console.warn('localStorage quota or write error:', e);
      }
    });
  }

  /** Export all settings as JSON */
  async function exportAll() {
    const sync = await getSync([
      'theme', 'preset', 'accentColor', 'clockMode', 'clock24h', 'showSeconds', 'clockFont', 'clockSize',
      'searchEngine', 'customSearchUrl', 'userName', 'customGreeting',
      'weatherUnit', 'weatherLocation', 'language', 'wallpaperSource',
      'wallpaperUrl', 'wallpaperBlur', 'wallpaperDim', 'wallpaperBrightness',
      'shortcuts', 'aiTools', 'widgetVisibility', 'materialYou'
    ]);
    const local = await getLocal(['todos', 'weatherCache']);
    return { ...sync, ...local, _exportDate: new Date().toISOString() };
  }

  /** Import settings from JSON */
  async function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid data');
    const safeData = {};
    const DANGEROUS = ['__proto__', 'constructor', 'prototype', '_exportDate'];
    Object.keys(data).forEach(key => {
      if (!DANGEROUS.includes(key)) {
        safeData[key] = data[key];
      }
    });

    const { todos, weatherCache, ...syncData } = safeData;
    if (Object.keys(syncData).length > 0) {
      await setSync(syncData);
    }
    if (todos && Array.isArray(todos)) await setLocal({ todos });
    if (weatherCache && typeof weatherCache === 'object') await setLocal({ weatherCache });
  }

  /** Reset everything */
  async function resetAll() {
    if (hasChromeStorage) {
      await new Promise(r => chrome.storage.sync.clear(r));
      await new Promise(r => chrome.storage.local.clear(r));
    }
    _syncCache = {};
    _localCache = {};
    // Clear localStorage hometab keys
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('hometab_')) localStorage.removeItem(k);
    });
    await clearAllBlobs();
  }

  return {
    preloadAll,
    getSync, getSyncCached, setSync,
    getLocal, getLocalCached, setLocal, removeLocal,
    putBlob, getBlob, deleteBlob, clearAllBlobs,
    exportAll, importAll, resetAll
  };
})();
