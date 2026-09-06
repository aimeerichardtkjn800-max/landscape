/* ============ utils.js · 通用工具 ============ */
window.App = {};

(function () {
  const App = window.App;

  App.isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  App.isMobile = App.isTouch || Math.min(window.innerWidth, window.innerHeight) < 640;

  App.$ = (sel, el = document) => el.querySelector(sel);
  App.$$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  App.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  App.lerp = (a, b, t) => a + (b - a) * t;

  App.uid = () =>
    "w-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  App.debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /* ---------- 提示气泡 ---------- */
  let toastWrap = null;
  App.toast = (msg, duration = 2400) => {
    if (!toastWrap) toastWrap = document.getElementById("toast-wrap");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toastWrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 450);
    }, duration);
  };

  /* ---------- 涟漪反馈 ---------- */
  document.addEventListener("pointerdown", (e) => {
    const host = e.target.closest("[data-ripple]");
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = e.clientX - rect.left - size / 2 + "px";
    ripple.style.top = e.clientY - rect.top - size / 2 + "px";
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }
    host.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });

  /* ---------- 弹窗开关 ---------- */
  App.openModal = (id) => document.getElementById(id).classList.add("open");
  App.closeModal = (id) => document.getElementById(id).classList.remove("open");
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-modal]")) {
      const modal = e.target.closest(".modal");
      if (modal) modal.classList.remove("open");
    }
  });
  App.isOverlayOpen = () => !!document.querySelector(".modal.open, .lightbox.open");

  /* ---------- 图片压缩（保持比例，最长边 max 像素） ---------- */
  App.fitImage = async (file, max = 1600) => {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (scale >= 1) {
        if (bmp.close) bmp.close();
        return file;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
      if (bmp.close) bmp.close();
      const blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.88)
      );
      return blob || file;
    } catch (err) {
      return file;
    }
  };

  /* ---------- 伪随机序列（同一 id 稳定复现装饰布局） ---------- */
  App.hashRandom = (seedStr) => {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 10000) / 10000;
    };
  };
})();
