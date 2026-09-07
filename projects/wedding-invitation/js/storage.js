/* ============ storage.js · IndexedDB + localStorage 持久化 ============ */
(function () {
  const App = window.App;

  /* ---------- IndexedDB ----------
     files store（key-value）：
       photo-1 ~ photo-5              婚纱照 Blob（5 个相框章节）
       music                          背景音乐 Blob
  */
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("weddingInviteDB", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
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

  function wrap(store, req) {
    const holder = { __value: undefined };
    req.onsuccess = () => {
      holder.__value = req.result;
    };
    return holder;
  }

  App.db = {
    putFile(key, blob) {
      return run("files", "readwrite", (s) => s.put(blob, key));
    },
    getFile(key) {
      return run("files", "readonly", (s) => wrap(s, s.get(key))).then(
        (v) => v || null
      );
    },
    deleteFile(key) {
      return run("files", "readwrite", (s) => s.delete(key));
    },
  };

  /* ---------- localStorage 偏好 / 文案 ---------- */
  const PREFIX = "weddingInvite.";
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

  /* 默认婚礼信息（示例文字，可在页面内编辑替换）；future* 为「未来」照片章节文案 */
  App.defaults = {
    info: {
      groom: "沈知砚",
      bride: "顾清棠",
      date: "二〇二六年十月十日 · 星期六",
      lunar: "丙午年 九月初十",
      time: "午时 12:00 恭候入席",
      venue: "云禧宴会中心 · 三楼禧满堂",
      futureTitle: "未来",
      futureSub: "FUTURE",
      futureBody: "愿以岁月为证，\n以白头为期，\n往后余生，\n皆是你。",
    },
  };
})();
