/* ============ main.js · 场景管理与相机飞行导航（ES Module 入口） ============ */
import world from "./world.js";
import "./background.js";
import s1 from "./scene1.js";
import s2 from "./scene2.js";
import s3, { initScene3 } from "./scene3.js";
import s4 from "./scene4.js";

const App = window.App;
const gsap = window.gsap;

/* 各区域相机默认机位（沿 Z 轴走廊分布） */
function homeOf(i) {
  const z = world.zoneZ(i);
  switch (i) {
    case 0: return { pos: new world.THREE.Vector3(0, 0.6, z + 8.5), look: new world.THREE.Vector3(0, 0, z) };
    case 1: return { pos: new world.THREE.Vector3(0, 0.4, z + 7.6), look: new world.THREE.Vector3(0, 0.2, z) };
    case 2: return { pos: new world.THREE.Vector3(0, 0.6, z + 10.5), look: new world.THREE.Vector3(0, 0, z) };
    default: return { pos: new world.THREE.Vector3(0, 0.3, z + 9.8), look: new world.THREE.Vector3(0, -0.5, z) };
  }
}

const mods = [s1, s2, s3, s4];
const els = [];
const firstFlags = [true, true, true, true];
let current = 0;
let busy = false;
let dots = null, nextBtn = null;

function updateNav(i) {
  App.$$(".dot", dots).forEach((d, k) => d.classList.toggle("active", k === i));
  nextBtn.classList.toggle("hidden", i === mods.length - 1);
}

/* ---------- 场景切换：相机平滑飞行（位置 + 视线同步插值） ---------- */
function go(i) {
  if (busy || i === current || i < 0 || i >= mods.length) return;
  busy = true;
  const oldEl = els[current];
  const newEl = els[i];
  const oldMod = mods[current];
  const newMod = mods[i];
  const first = firstFlags[i];

  oldMod.leave();
  updateNav(i);

  /* HUD 淡出 / 淡入 */
  const tl = gsap.timeline();
  tl.to(oldEl, { autoAlpha: 0, y: -40, duration: 0.45, ease: "power2.in" })
    .add(() => {
      oldEl.classList.remove("active");
      newEl.classList.add("active");
      gsap.set(newEl, { autoAlpha: 0, y: 40 });
    })
    .to(newEl, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.inOut",
      onStart: () => {
        current = i;
        newMod.enter(first);
        firstFlags[i] = false;
        const items = newEl.querySelectorAll("[data-animate]");
        if (items.length) {
          gsap.fromTo(items,
            { y: 22, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power2.out", overwrite: "auto", delay: 0.3 });
        }
      },
    });

  /* 相机飞行 + 灯光跟随 */
  const h = homeOf(i);
  world.flyTo({ pos: h.pos, look: h.look, dur: 1.5, ease: "power2.inOut", onArrive: () => (busy = false) });
  world.focusLights(i, 1.5);
}

/* ---------- 滑动 / 滚轮 / 按键导航 ---------- */
function tryNav(delta) {
  if (busy || App.isOverlayOpen()) return;
  const target = current + (delta > 0 ? 1 : -1);
  if (target < 0 || target >= mods.length) return;
  go(target);
}

function bindNav() {
  dots = document.getElementById("nav-dots");
  nextBtn = document.getElementById("next-btn");

  dots.addEventListener("click", (e) => {
    const dot = e.target.closest(".dot");
    if (dot) go(+dot.dataset.go);
  });
  nextBtn.addEventListener("click", () => tryNav(1));

  let wheelAcc = 0;
  let wheelLock = false;
  let wheelTimer = null;
  window.addEventListener(
    "wheel",
    (e) => {
      if (App.isOverlayOpen()) return;
      if (e.target.closest && e.target.closest(".no-swipe")) return;
      if (wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 70) {
        tryNav(wheelAcc);
        wheelAcc = 0;
        wheelLock = true;
        setTimeout(() => (wheelLock = false), 1200);
      } else {
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => (wheelAcc = 0), 240);
      }
    },
    { passive: true }
  );

  let touchY = null, touchX = null;
  window.addEventListener(
    "touchstart",
    (e) => {
      touchY = e.touches[0].clientY;
      touchX = e.touches[0].clientX;
    },
    { passive: true }
  );
  window.addEventListener(
    "touchend",
    (e) => {
      if (touchY === null) return;
      const dy = e.changedTouches[0].clientY - touchY;
      const dx = e.changedTouches[0].clientX - touchX;
      touchY = touchX = null;
      if (Math.abs(dy) < 64 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
      if (App.isOverlayOpen()) return;
      if (e.target.closest && e.target.closest(".no-swipe")) return;
      tryNav(dy < 0 ? 1 : -1);
    },
    { passive: true }
  );

  document.addEventListener("keydown", (e) => {
    if (App.isOverlayOpen()) return;
    if (e.target.closest && e.target.closest("textarea, input")) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") tryNav(1);
    if (e.key === "ArrowUp" || e.key === "PageUp") tryNav(-1);
  });
}

function bindConfirm() {
  document.getElementById("confirm-ok").addEventListener("click", () => App.confirmSettle(true));
  document.getElementById("confirm-cancel").addEventListener("click", () => App.confirmSettle(false));
  document.getElementById("confirm-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) App.confirmSettle(false);
  });
}

/* ---------- 启动 ---------- */
function boot() {
  if (!window.gsap) {
    document.getElementById("load-fallback").hidden = false;
    return;
  }

  try {
    world.init();
  } catch (err) {
    document.getElementById("load-fallback").hidden = false;
    return;
  }
  window.__cardBootOK = true;

  els.push(
    document.getElementById("scene1"),
    document.getElementById("scene2"),
    document.getElementById("scene3"),
    document.getElementById("scene4")
  );

  App.bg.init();
  initScene3(); // 照片墙区域提前建好（数据异步加载）

  bindNav();
  bindConfirm();
  updateNav(0);
  world.snapTo(0);
  s1.enter(true);
}

App.main = { go, tryNav, get current() { return current; } };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
