/* ============ storage.js · IndexedDB + localStorage 持久化 ============
   库名 westernInviteDB（独立于中式版，避免数据冲突）
====================================================== */
(function () {
  const App = window.App;

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("westernInviteDB", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function run(storeName, mode, fn) {
    return open().then((db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => resolve(result && "__value" in result ? result.__value : result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
    );
  }

  function wrap(store, req) {
    const holder = { __value: undefined };
    req.onsuccess = () => { holder.__value = req.result; };
    return holder;
  }

  App.db = {
    putFile(key, blob) { return run("files", "readwrite", (s) => s.put(blob, key)); },
    getFile(key) { return run("files", "readonly", (s) => wrap(s, s.get(key))).then((v) => v || null); },
    deleteFile(key) { return run("files", "readwrite", (s) => s.delete(key)); },
  };

  /* ---------- localStorage 偏好 / 文案 ---------- */
  const PREFIX = "westernInvite.";
  App.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {}
    },
  };

  /* 默认婚礼信息：从 App.config 派生，保证占位符统一 */
  const cfg = App.config;
  App.defaults = {
    info: {
      groom: cfg.groom,
      bride: cfg.bride,
      date: cfg.dateDisplay,
      time: cfg.time,
      venue: cfg.venue,
      address: cfg.address,
    },
  };
})();
