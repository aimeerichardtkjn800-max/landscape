/* ============ storage.js · IndexedDB + localStorage 持久化 ============ */
(function () {
  const App = window.App;

  /* ---------- IndexedDB ----------
     stores:
       photos: { id, blob, order }  keyPath=id
       files : key-value（video / music / avatar-1 / avatar-2 的 Blob）
  */
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("loveCardDB", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("photos")) {
          const store = db.createObjectStore("photos", { keyPath: "id" });
          store.createIndex("order", "order");
        }
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function run(storeName, mode, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          const result = fn(store);
          tx.oncomplete = () =>
            resolve(result && "__value" in result ? result.__value : result);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        })
    );
  }

  /* 包装 request，让 oncomplete 时取回结果 */
  function wrap(store, req) {
    const holder = { __value: undefined };
    req.onsuccess = () => {
      holder.__value = req.result;
    };
    return holder;
  }

  App.db = {
    /* 照片 */
    getAllPhotos() {
      return run("photos", "readonly", (s) => wrap(s, s.getAll())).then((list) =>
        (list || []).sort((a, b) => (a.order || 0) - (b.order || 0))
      );
    },
    putPhoto(rec) {
      return run("photos", "readwrite", (s) => s.put(rec));
    },
    deletePhoto(id) {
      return run("photos", "readwrite", (s) => s.delete(id));
    },
    clearPhotos() {
      return run("photos", "readwrite", (s) => s.clear());
    },

    /* 通用文件（Blob） */
    putFile(key, blob) {
      return run("files", "readwrite", (s) => s.put(blob, key));
    },
    getFile(key) {
      return run("files", "readonly", (s) => wrap(s, s.get(key))).then((v) => v || null);
    },
    deleteFile(key) {
      return run("files", "readwrite", (s) => s.delete(key));
    },
  };

  /* ---------- localStorage 偏好 ---------- */
  const PREFIX = "loveCard.";
  App.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {
        /* 存储满时静默忽略 */
      }
    },
  };

  /* 默认文案 */
  App.defaults = {
    love:
      "亲爱的：\n从遇见你的那一天起，我的世界就多了一种颜色。\n春日的樱花、夏夜的风、秋天的落叶、冬夜的暖灯，\n都不及你回眸时嘴角的弧度。\n谢谢你，把平凡的日子过成了诗。\n接下来的每一页，我都想和你一起写。",
    blessing:
      "愿我们的故事，比电影更长，比星光更亮。\n往后余生，风雪是你，平淡是你，\n心底温柔是你，目光所至，也是你。",
    ending: "永远在一起",
  };
})();
