/* ============ main.js · 婚礼邀请函 3D 世界 ============
   层级：背景（暗红穹顶 / 雾）→ 远景祥云 → 中景灯笼/囍匾/红绸/喜鹊
        → 内容层（窗棂相框 / 银幕）→ 前景花瓣 / 金屑粒子
   滚动驱动相机沿 Z 轴穿越各章节，天然多层视差
====================================================== */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  makeXiTexture, makeCloudTexture, makePetalTexture, makeFleckTexture,
  makeMagpieTexture, buildLantern, buildPhotoFrame, buildScreen,
  buildRibbon, buildScroll, updateScroll,
  makeScrollTexture, makePlaceholderTexture, makeScreenTexture,
} from "./factory.js";

const App = window.App;

/* ---------- 零依赖补间（替代 GSAP 时间线，避免 CDN 故障点） ---------- */
function easeInOut(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}
function animTo(delay, dur, items, onComplete) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    items.forEach((it) => it.set(it.to));
    if (onComplete) onComplete();
  };
  setTimeout(() => {
    const starts = items.map((it) => it.get());
    const t0 = performance.now();
    const step = () => {
      if (done) return;
      const p = Math.min(1, (performance.now() - t0) / (dur * 1000));
      const e = easeInOut(p);
      items.forEach((it, i) => it.set(starts[i] + (it.to - starts[i]) * e));
      if (p < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
  }, delay * 1000);
  /* 保底：后台标签页 rAF 被冻结时，计时器仍能让动画落终态 */
  setTimeout(finish, (delay + dur + 0.2) * 1000);
}

/* ================= 配置 ================= */
const STATIONS = 8;          // 章节数（0 封面 ~ 7 致谢）
const SPACING = 16;          // 章节 Z 间距
const stationZ = (i) => -i * SPACING;
const CAM_START = 11;        // 封面相机 Z
const PETAL_COUNT = App.isMobile ? 70 : 150;

const scroll = { target: 0, cur: 0 };
let opened = false;
let opening = false;

/* ================= 渲染器 / 场景 ================= */
const canvas = document.getElementById("world-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, App.isMobile ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a060a, 0.015);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
camera.position.set(0, -0.1, CAM_START);
camera.lookAt(0, 0, 0);

/* ---------- 暗红穹顶（背景层） ---------- */
const skyGeo = new THREE.SphereGeometry(280, 32, 20);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new THREE.Color(0x1c0408) },
    mid: { value: new THREE.Color(0x5a1018) },
    bot: { value: new THREE.Color(0x120306) },
  },
  vertexShader: `
    varying vec3 vPos;
    void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vPos;
    void main(){
      float h = normalize(vPos).y;
      vec3 c = h >= 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.8));
      gl_FragColor = vec4(c, 1.0);
    }`,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

/* ---------- 灯光 ---------- */
scene.add(new THREE.AmbientLight(0xffe6c8, 0.55));

const dirLight = new THREE.DirectionalLight(0xffe2b0, 1.15);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);

/* 随相机移动的暖金点光，照亮沿途相框与灯笼 */
const camLight = new THREE.PointLight(0xffca8a, 26, 34, 2);
camLight.position.set(0, 2.2, 6);
scene.add(camLight);
const redLight = new THREE.PointLight(0xff5a48, 14, 30, 2);
redLight.position.set(0, -1.5, 4);
scene.add(redLight);

/* ---------- 后处理（Bloom 辉光） ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  App.isMobile ? 0.4 : 0.55, 0.35, 0.75
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ================= 场景物件 ================= */
const tickers = [];                 // 每帧动画回调
const clickable = [];              // 射线检测对象
const fontTexturedMats = [];       // 字体加载后需重绘的材质
const rnd = App.hashRandom("wedding-invite");

/* ---------- 卷轴（封面唯一主角：解绳 → 摊开 → 入场） ---------- */
const scrollGroup = buildScroll();
scrollGroup.position.set(0, App.isMobile ? 1.05 : 1.25, 0.6);
scrollGroup.scale.setScalar(App.isMobile ? 0.82 : 1.0);
scene.add(scrollGroup);
scrollGroup.traverse((o) => { if (o.isMesh) { o.userData.kind = "scroll"; clickable.push(o); } });
fontTexturedMats.push(scrollGroup.userData.paperMat, scrollGroup.userData.charmMat);
const scrollBaseY = scrollGroup.position.y;
tickers.push((t) => {
  if (!opened) {
    scrollGroup.position.y = scrollBaseY + Math.sin(t * 0.8) * 0.09;
    scrollGroup.rotation.y = pointer.x * 0.1 + Math.sin(t * 0.4) * 0.03;
  }
});

/* ---------- 祥云（远景装饰层） ---------- */
const cloudTex = makeCloudTexture(512);
const clouds = [];
for (let i = 0; i < STATIONS; i++) {
  const n = i === 0 ? 3 : 2;
  for (let k = 0; k < n; k++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex, transparent: true,
      opacity: 0.14 + rnd() * 0.08,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    const side = k % 2 === 0 ? -1 : 1;
    const xRange = App.isMobile ? 3.4 : 7.5;
    sp.position.set(
      side * (xRange * (0.55 + rnd() * 0.5)),
      1.8 + rnd() * 3.4,
      stationZ(i) - 1.5 - rnd() * 5
    );
    const s = (App.isMobile ? 4.5 : 7) * (0.8 + rnd() * 0.6);
    sp.scale.set(s, s, 1);
    sp.userData = { baseX: sp.position.x, phase: rnd() * Math.PI * 2, speed: 0.1 + rnd() * 0.12 };
    scene.add(sp);
    clouds.push(sp);
  }
}
tickers.push((t) => {
  clouds.forEach((c) => {
    c.position.x = c.userData.baseX + Math.sin(t * c.userData.speed + c.userData.phase) * 0.9;
  });
});

/* ---------- 灯笼（章节成对悬挂） ---------- */
const lanterns = [];
for (let i = 1; i < STATIONS; i++) {
  const pair = i % 2 === 1 ? [-1, 1] : [1, -1];
  pair.forEach((side) => {
    const l = buildLantern(App.isMobile ? 0.72 : 0.95);
    l.position.set(
      side * (App.isMobile ? 1.9 : 3.7) + (rnd() - 0.5) * 0.5,
      4.1 + rnd() * 0.5,
      stationZ(i) + 2.5 + (rnd() - 0.5) * 2
    );
    scene.add(l);
    lanterns.push(l);
  });
}
tickers.push((t) => {
  lanterns.forEach((l) => {
    const p = l.userData.swayPhase;
    l.rotation.z = Math.sin(t * 0.8 + p) * 0.07;
    l.rotation.x = Math.cos(t * 0.6 + p) * 0.03;
  });
});

/* ---------- 红绸（头顶飘带） ---------- */
const ribbonPts1 = [
  new THREE.Vector3(6.5, 6.2, -8), new THREE.Vector3(-4, 5.6, -24),
  new THREE.Vector3(5, 6.4, -55), new THREE.Vector3(-5.5, 5.8, -90),
  new THREE.Vector3(4, 6.2, -125),
];
const ribbonPts2 = [
  new THREE.Vector3(-6.5, 6.6, -10), new THREE.Vector3(4.5, 5.9, -28),
  new THREE.Vector3(-5, 6.5, -60), new THREE.Vector3(5.5, 5.7, -95),
  new THREE.Vector3(-4, 6.3, -128),
];
scene.add(buildRibbon(ribbonPts1, 0.09));
scene.add(buildRibbon(ribbonPts2, 0.07));

/* ---------- 窗棂相框（内容层 · 婚纱照 ×3） ---------- */
const FRAME_W = 3.0, FRAME_H = 3.8;
const frames = [];
const frameSlots = [
  { station: 2, side: -1 },
  { station: 3, side: 1 },
  { station: 5, side: -1 },
];
frameSlots.forEach((cfg, idx) => {
  const slot = idx + 1;
  const f = buildPhotoFrame(FRAME_W, FRAME_H);
  if (App.isMobile) {
    f.position.set(0, 1.7, stationZ(cfg.station));
    f.scale.setScalar(0.72);
  } else {
    f.position.set(cfg.side * 2.9, 0.35, stationZ(cfg.station));
  }
  f.userData.kind = "frame";
  f.userData.slot = slot;
  f.traverse((o) => { if (o.isMesh) { o.userData.kind = "frame"; o.userData.slot = slot; clickable.push(o); } });
  scene.add(f);
  frames.push({ group: f, slot, filled: false });
  fontTexturedMats.push(f.userData.photoMat);
});
/* 相框轻微悬浮与摇摆（基准位 + 偏移，避免累积） */
frames.forEach((f, i) => {
  const baseY = f.group.position.y;
  tickers.push((t) => {
    f.group.position.y = baseY + Math.sin(t * 0.8 + i * 2.1) * 0.08;
    f.group.rotation.z = Math.sin(t * 0.7 + i * 1.7) * 0.012;
  });
});

/* ---------- 视频银幕（内容层 · 恋爱影片） ---------- */
const screenGroup = buildScreen(5.2, 2.93);
if (App.isMobile) {
  screenGroup.position.set(0, 1.9, stationZ(4));
  screenGroup.scale.setScalar(0.66);
} else {
  screenGroup.position.set(0, 1.15, stationZ(4));
}
screenGroup.userData.kind = "video";
screenGroup.traverse((o) => { if (o.isMesh) { o.userData.kind = "video"; clickable.push(o); } });
scene.add(screenGroup);
fontTexturedMats.push(screenGroup.userData.screenMat);
const screenBaseY = screenGroup.position.y;
tickers.push((t) => {
  screenGroup.position.y = screenBaseY + Math.sin(t * 0.7) * 0.08;
});
let screenPlaceholderTex = screenGroup.userData.screenMat.map;

/* ---------- 喜鹊精灵（点缀） ---------- */
{
  const magpieTex = makeMagpieTexture();
  [2, 5].forEach((st, i) => {
    const mat = new THREE.SpriteMaterial({
      map: magpieTex, transparent: true, opacity: 0.92, depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    const side = st === 2 ? 1 : -1;
    sp.position.set(side * (App.isMobile ? 1.6 : 3.4), 2.9 + i * 0.3, stationZ(st) - 0.5);
    sp.scale.set(1.5, 0.95, 1);
    sp.userData = { baseY: sp.position.y, phase: i * 2.4 };
    scene.add(sp);
    tickers.push((t) => {
      sp.position.y = sp.userData.baseY + Math.sin(t * 1.1 + sp.userData.phase) * 0.12;
      sp.material.rotation = Math.sin(t * 0.9 + sp.userData.phase) * 0.08;
    });
  });
}

/* ---------- 前景层：玫瑰花瓣 + 金屑 ---------- */
const petalGeo = new THREE.PlaneGeometry(0.34, 0.34);
const petalMat = new THREE.MeshBasicMaterial({
  map: makePetalTexture(), transparent: true, side: THREE.DoubleSide,
  depthWrite: false, opacity: 0.95,
});
const petals = new THREE.InstancedMesh(petalGeo, petalMat, PETAL_COUNT);
petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
petals.frustumCulled = false;   // 实例遍布整条 Z 轴，关闭视锥剔除
scene.add(petals);

const petalData = [];
const xRange = App.isMobile ? 3.2 : 7.5;
for (let i = 0; i < PETAL_COUNT; i++) {
  petalData.push({
    x: (rnd() * 2 - 1) * xRange,
    y: -2 + rnd() * 11,
    z: 14 - rnd() * 140,
    speed: 0.45 + rnd() * 0.6,
    sway: 0.4 + rnd() * 0.8,
    phase: rnd() * Math.PI * 2,
    rot: rnd() * Math.PI * 2,
    rotSpeed: (rnd() - 0.5) * 1.6,
    scale: 0.7 + rnd() * 0.8,
  });
}
const dummy = new THREE.Object3D();

/* 金屑碎星 */
const FLECK_COUNT = App.isMobile ? 24 : 46;
const fleckMat = new THREE.PointsMaterial({
  map: makeFleckTexture(), transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false,
  size: 0.22, sizeAttenuation: true, color: 0xf0d68a, opacity: 0.8,
});
const fleckGeo = new THREE.BufferGeometry();
const fleckPos = new Float32Array(FLECK_COUNT * 3);
const fleckData = [];
for (let i = 0; i < FLECK_COUNT; i++) {
  const d = { x: (rnd() * 2 - 1) * xRange, y: -2 + rnd() * 11, z: -6 - rnd() * 120, speed: 0.3 + rnd() * 0.4, phase: rnd() * 6.28 };
  fleckData.push(d);
  fleckPos[i * 3] = d.x; fleckPos[i * 3 + 1] = d.y; fleckPos[i * 3 + 2] = d.z;
}
fleckGeo.setAttribute("position", new THREE.BufferAttribute(fleckPos, 3));
const flecks = new THREE.Points(fleckGeo, fleckMat);
scene.add(flecks);

function resetParticle(p, camZ, ahead) {
  p.z = camZ - (ahead ? 30 + rnd() * 60 : rnd() * 10);
  p.y = 7 + rnd() * 4;
  p.x = (rnd() * 2 - 1) * xRange;
}
tickers.push((t, dt) => {
  const camZ = camera.position.z;
  for (let i = 0; i < PETAL_COUNT; i++) {
    const p = petalData[i];
    p.y -= p.speed * dt;
    p.z += dt * 0.55;                 // 相对镜头缓缓后掠
    p.rot += p.rotSpeed * dt;
    if (p.y < -3 || p.z > camZ + 6) resetParticle(p, camZ, true);
    const x = p.x + Math.sin(t * p.sway + p.phase) * 0.7;
    dummy.position.set(x, p.y, p.z);
    dummy.rotation.set(p.rot * 0.6, p.rot, Math.sin(t + p.phase) * 0.8);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    petals.setMatrixAt(i, dummy.matrix);
  }
  petals.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < FLECK_COUNT; i++) {
    const p = fleckData[i];
    p.y -= p.speed * dt;
    p.z += dt * 0.5;
    if (p.y < -3 || p.z > camZ + 6) resetParticle(p, camZ, true);
    fleckPos[i * 3] = p.x + Math.sin(t * 0.7 + p.phase) * 0.5;
    fleckPos[i * 3 + 1] = p.y;
    fleckPos[i * 3 + 2] = p.z;
  }
  fleckGeo.attributes.position.needsUpdate = true;
});

/* ================= 指针视差 / 射线 ================= */
const pointer = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
raycaster.far = 24;   // 只响应镜头前 ~24 单位内的物件，避免误点远处章节
const ndc = new THREE.Vector2();
let downPos = null;

window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
});
window.addEventListener("pointerdown", (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});
window.addEventListener("pointerup", (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
  downPos = null;
  if (dx * dx + dy * dy > 100) return;          // 拖动而非点击
  if (App.isOverlayOpen()) return;
  if (e.target && e.target.closest && e.target.closest("button, a, input, textarea, .hud, #nav-dots, .modal, .lightbox")) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (!hits.length) return;
  const { kind, slot } = hits[0].object.userData;
  if (kind === "scroll") openScroll();
  else if (kind === "frame") onFrameClick(slot);
  else if (kind === "video") toggleVideo();
});

/* ================= 卷轴开场：解绳 → 摊开 → 穿入 ================= */
function openScroll() {
  if (opening || opened) return;
  opening = true;
  App.$("#open-hint").style.opacity = "0";
  try { App.music.play(); } catch (e) {}   // 在用户手势内启动音频（iOS 兼容）

  const ud = scrollGroup.userData;
  const { ropeGroup, band, fadeMats } = ud;
  const ropeMat = band.material;
  const charmMat = ud.charmMat;
  ropeMat.transparent = true;
  charmMat.transparent = true;

  /* ① 红绳松脱：绳圈先胀开，随后整段绳与囍坠坠落淡出 */
  animTo(0, 0.35, [
    { get: () => band.scale.x, set: (v) => band.scale.setScalar(v), to: 1.4 },
  ]);
  animTo(0.3, 1.05, [
    { get: () => ropeGroup.position.y, set: (v) => { ropeGroup.position.y = v; }, to: -2.4 },
    { get: () => ropeGroup.rotation.z, set: (v) => { ropeGroup.rotation.z = v; }, to: 0.45 },
    { get: () => ropeMat.opacity, set: (v) => { ropeMat.opacity = v; }, to: 0 },
    { get: () => charmMat.opacity, set: (v) => { charmMat.opacity = v; }, to: 0 },
  ], () => { ropeGroup.visible = false; });

  /* ② 卷轴缓缓摊开（2.6s） */
  const sp = { p: 0 };
  animTo(0.75, 2.6, [
    { get: () => sp.p, set: (v) => { sp.p = v; updateScroll(scrollGroup, v); }, to: 1 },
  ]);

  /* ③ 相机穿入第一章，卷轴整体淡出 */
  fadeMats.forEach((m) => { m.transparent = true; });
  animTo(3.7, 1.4, [
    { get: () => camera.position.z, set: (v) => { camera.position.z = v; }, to: CAM_START - SPACING },
  ]);
  animTo(4.1, 0.9, fadeMats.map((m) => ({
    get: () => m.opacity, set: (v) => { m.opacity = v; }, to: 0,
  })), () => {
    opened = true;
    opening = false;
    scrollGroup.visible = false;
    document.body.classList.add("opened");
    App.$("#scroll-hint").hidden = false;
    scroll.target = scroll.cur = 1;        // 落位「请柬」章
  });
}

/* ================= 滚动 / 章节驱动 ================= */
const sections = App.$$(".invite-section");
const dots = App.$$("#nav-dots .dot");
let activeStation = 0;
const shownStations = new Set();

function goTo(i) {
  if (!opened) return;
  scroll.target = App.clamp(i, 0, STATIONS - 1);
}

window.addEventListener("wheel", (e) => {
  if (!opened || App.isOverlayOpen()) return;
  e.preventDefault();
  scroll.target = App.clamp(scroll.target + e.deltaY * 0.0016, 0, STATIONS - 1);
}, { passive: false });

let touchY = null;
window.addEventListener("touchstart", (e) => {
  if (App.isOverlayOpen()) return;
  touchY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (!opened || touchY === null || App.isOverlayOpen()) return;
  const y = e.touches[0].clientY;
  scroll.target = App.clamp(scroll.target + (touchY - y) * 0.0042, 0, STATIONS - 1);
  touchY = y;
}, { passive: true });
window.addEventListener("touchend", () => { touchY = null; }, { passive: true });

window.addEventListener("keydown", (e) => {
  if (App.isOverlayOpen()) return;
  if (["ArrowDown", "PageDown", " "].includes(e.key)) goTo(Math.round(scroll.target) + 1);
  if (["ArrowUp", "PageUp"].includes(e.key)) goTo(Math.round(scroll.target) - 1);
});

dots.forEach((d) => d.addEventListener("click", () => goTo(+d.dataset.go)));

function activateStation(i) {
  if (activeStation === i) {
    if (!shownStations.has(i)) { /* 首次 */ }
    else return;
  }
  activeStation = i;
  sections.forEach((s, idx) => s.classList.toggle("active", idx === i));
  dots.forEach((d, idx) => d.classList.toggle("active", idx === i));

  if (!shownStations.has(i)) {
    shownStations.add(i);
    const sec = sections[i];
    sec.classList.add("in");
    /* 正文墨迹书写 */
    App.$$("[data-ink]", sec).forEach(splitInk);
    /* 毛笔大字（姓名顺序书写） */
    const brushes = App.$$("[data-brush]", sec);
    let delay = 300;
    brushes.forEach((el) => {
      const dur = buildBrush(el, delay);
      delay += dur;
    });
  }
  /* 影片章：自动尝试静音播放；离开暂停 */
  if (i === 4 && videoState.ready) tryPlayVideo();
  if (i !== 4 && videoState.ready) videoEl.pause();
}

/* ================= 毛笔书写 / 墨迹动画 ================= */
function buildBrush(el, startDelay = 200) {
  if (el.querySelector("svg")) return 0;   // 已构建过（如编辑信息后）
  const text = (el.textContent || "").trim();
  if (!text) return 0;
  const speed = el.dataset.speed || "normal";
  const perChar = speed === "slow" ? 1.05 : speed === "normal" ? 0.7 : 0.45;
  const stagger = speed === "slow" ? 0.62 : 0.34;
  const fs = 100;
  const n = [...text].length;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${n * 110 + 10} 130`);
  svg.setAttribute("height", "1em");
  [...text].forEach((ch, i) => {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", i * 110 + 60);
    t.setAttribute("y", "102");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", fs);
    t.setAttribute("font-family", '"Ma Shan Zheng","KaiTi","STKaiti","楷体",serif');
    t.classList.add("brush-char");
    t.textContent = ch;
    t.style.animation = `brush-draw ${perChar}s ease ${startDelay + i * stagger * 1000}ms forwards`;
    svg.appendChild(t);
  });
  el.textContent = "";
  el.appendChild(svg);

  const total = (startDelay + n * stagger * 1000 + perChar * 1000) / 1000;
  setTimeout(() => el.classList.add("lit"), total * 1000);
  return total * 1000;
}

function splitInk(el) {
  if (el.dataset.done) return;
  const text = el.textContent;
  let i = 0;
  const html = [...text].map((c) =>
    c === "\n" ? "<br>" : `<span class="ink-char" style="--i:${++i}">${c}</span>`
  ).join("");
  el.innerHTML = html;
  el.dataset.done = "1";
}

/* ================= 婚礼信息渲染 / 编辑 ================= */
let info = App.store.get("info", App.defaults.info);

function renderInfo() {
  App.$$('[data-name="groom"]').forEach((el) => { el.textContent = info.groom; });
  App.$$('[data-name="bride"]').forEach((el) => { el.textContent = info.bride; });
  const map = { date: info.date, lunar: info.lunar, time: info.time, venue: info.venue };
  Object.entries(map).forEach(([k, v]) => {
    App.$$(`[data-info="${k}"]`).forEach((el) => { el.textContent = v; el.dataset.done = ""; });
  });
  App.$$('[data-info="groom-sign"]').forEach((el) => { el.textContent = info.groom; });
  App.$$('[data-info="bride-sign"]').forEach((el) => { el.textContent = info.bride; });
}

App.$("#edit-info-btn").addEventListener("click", () => {
  App.$("#in-groom").value = info.groom;
  App.$("#in-bride").value = info.bride;
  App.$("#in-date").value = info.date;
  App.$("#in-lunar").value = info.lunar;
  App.$("#in-time").value = info.time;
  App.$("#in-venue").value = info.venue;
  App.openModal("info-modal");
});
App.$("#info-save").addEventListener("click", () => {
  info = {
    groom: App.$("#in-groom").value.trim() || App.defaults.info.groom,
    bride: App.$("#in-bride").value.trim() || App.defaults.info.bride,
    date: App.$("#in-date").value.trim() || App.defaults.info.date,
    lunar: App.$("#in-lunar").value.trim() || App.defaults.info.lunar,
    time: App.$("#in-time").value.trim() || App.defaults.info.time,
    venue: App.$("#in-venue").value.trim() || App.defaults.info.venue,
  };
  App.store.set("info", info);
  renderInfo();
  /* 重建姓名毛笔书写 */
  App.$$(".names .brush").forEach((el) => { el.classList.remove("lit"); buildBrush(el, 0); });
  /* 婚典信息行：若当前章节已展示，立即重新书写 */
  App.$$('[data-ink][data-info]').forEach((el) => {
    if (el.closest(".in")) { el.dataset.done = ""; splitInk(el); }
  });
  App.closeModal("info-modal");
  App.toast("婚礼信息已更新");
});

/* ================= 婚纱照：上传 / 灯箱 ================= */
const photoInput = App.$("#input-photos");
let pendingSlot = 1;
const slotUrls = {};

function setPhoto(slot, blob) {
  const rec = frames.find((f) => f.slot === slot);
  if (!rec) return;
  if (slotUrls[slot]) URL.revokeObjectURL(slotUrls[slot]);
  const url = URL.createObjectURL(blob);
  slotUrls[slot] = url;
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const old = rec.group.userData.photoMat.map;
    rec.group.userData.photoMat.map = tex;
    rec.group.userData.photoMat.needsUpdate = true;
    if (old && old !== null) old.dispose();
  });
  rec.filled = true;
}

function onFrameClick(slot) {
  const rec = frames.find((f) => f.slot === slot);
  if (rec && rec.filled) openLightbox(slot);
  else {
    pendingSlot = slot;
    photoInput.click();
  }
}

photoInput.addEventListener("change", async () => {
  const files = Array.from(photoInput.files || []);
  photoInput.value = "";
  if (!files.length) return;
  let slot = pendingSlot;
  for (const file of files) {
    while (slot <= 3 && frames.find((f) => f.slot === slot).filled) slot++;
    if (slot > 3) break;
    const blob = await App.fitImage(file, 1600);
    try {
      await App.db.putFile(`photo-${slot}`, blob);
      setPhoto(slot, blob);
      App.toast(`第 ${slot} 幅婚纱照已上传`);
    } catch (e) {
      App.toast("上传失败，请换一张试试");
    }
    slot++;
  }
});

/* ---------- 灯箱 ---------- */
const lightbox = App.$("#lightbox");
const lbImg = App.$("#lb-img");
const lbCounter = App.$("#lb-counter");
let lbList = [];
let lbIdx = 0;

function openLightbox(slot) {
  lbList = frames.filter((f) => f.filled).map((f) => f.slot);
  lbIdx = lbList.indexOf(slot);
  renderLb();
  lightbox.classList.add("open");
}
function renderLb() {
  const slot = lbList[lbIdx];
  lbImg.src = slotUrls[slot];
  lbCounter.textContent = `${lbIdx + 1} / ${lbList.length}`;
}
App.$("#lb-prev").addEventListener("click", () => {
  lbIdx = (lbIdx - 1 + lbList.length) % lbList.length;
  renderLb();
});
App.$("#lb-next").addEventListener("click", () => {
  lbIdx = (lbIdx + 1) % lbList.length;
  renderLb();
});
App.$("#lb-close").addEventListener("click", () => lightbox.classList.remove("open"));
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.classList.remove("open");
});

/* ================= 恋爱影片 ================= */
const videoEl = App.$("#video-el");
const videoInput = App.$("#input-video");
const videoState = { ready: false, texture: null };

function setupVideo(blob) {
  const url = URL.createObjectURL(blob);
  videoEl.src = url;
  videoEl.muted = true;
  videoState.texture = new THREE.VideoTexture(videoEl);
  videoState.texture.colorSpace = THREE.SRGBColorSpace;
  screenGroup.userData.screenMat.map = videoState.texture;
  screenGroup.userData.screenMat.needsUpdate = true;
  videoState.ready = true;
  App.$("#upload-video-btn").textContent = "更换影片";
  App.$("#play-video-btn").hidden = false;
  App.$("#remove-video-btn").hidden = false;
}
function tryPlayVideo() {
  videoEl.play().catch(() => {});
}
function toggleVideo() {
  if (!videoState.ready) { videoInput.click(); return; }
  if (videoEl.paused) tryPlayVideo();
  else videoEl.pause();
}
App.$("#upload-video-btn").addEventListener("click", () => videoInput.click());
App.$("#play-video-btn").addEventListener("click", toggleVideo);
App.$("#remove-video-btn").addEventListener("click", async () => {
  videoEl.pause();
  videoEl.removeAttribute("src");
  videoEl.load();
  if (videoState.texture) videoState.texture.dispose();
  videoState.ready = false;
  screenGroup.userData.screenMat.map = screenPlaceholderTex;
  screenGroup.userData.screenMat.needsUpdate = true;
  App.$("#play-video-btn").hidden = true;
  App.$("#remove-video-btn").hidden = true;
  App.$("#upload-video-btn").textContent = "上传恋爱影片";
  try { await App.db.deleteFile("video"); } catch (e) {}
  App.toast("影片已删除");
});
videoInput.addEventListener("change", async () => {
  const file = videoInput.files && videoInput.files[0];
  videoInput.value = "";
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    App.toast("影片请控制在 50MB 以内");
    return;
  }
  try {
    await App.db.putFile("video", file);
    setupVideo(file);
    App.toast("影片已上传");
    tryPlayVideo();
  } catch (e) {
    App.toast("影片上传失败，请重试");
  }
});

/* ================= 背景音乐 UI ================= */
const musicBtn = App.$("#music-btn");
function syncMusicIcon(s) {
  App.$("#icon-play").hidden = s.playing;
  App.$("#icon-pause").hidden = !s.playing;
  musicBtn.classList.toggle("paused", !s.playing);
}
App.music.onChange(syncMusicIcon);
musicBtn.addEventListener("click", () => App.music.toggle());
App.$("#music-upload-btn").addEventListener("click", () => App.$("#input-music").click());
App.$("#input-music").addEventListener("change", async () => {
  const file = App.$("#input-music").files && App.$("#input-music").files[0];
  App.$("#input-music").value = "";
  if (!file) return;
  try {
    await App.db.putFile("music", file);
    await App.music.setFile(file, opened);
    App.toast("背景音乐已更换");
  } catch (e) {
    App.toast("音乐上传失败");
  }
});

/* ================= 重温请柬 ================= */
App.$("#replay-btn").addEventListener("click", () => goTo(0));

/* ================= 持久素材恢复 ================= */
(async function restore() {
  for (let slot = 1; slot <= 3; slot++) {
    try {
      const blob = await App.db.getFile(`photo-${slot}`);
      if (blob) setPhoto(slot, blob);
    } catch (e) {}
  }
  try {
    const vblob = await App.db.getFile("video");
    if (vblob) setupVideo(vblob);
  } catch (e) {}
  try {
    const mblob = await App.db.getFile("music");
    if (mblob) App.music.setFile(mblob, false);
  } catch (e) {}
})();

/* ================= 字体就绪后重绘含字纹理 ================= */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
   try {
    fontTexturedMats.forEach((mat) => {
      if (mat && mat.map) { mat.map.needsUpdate = true; }
    });
    /* 含汉字的程序化纹理需要重画（Ma Shan Zheng 到达后） */
    scrollGroup.userData.paperMat.map = makeScrollTexture(512, 704);
    scrollGroup.userData.paperMat.needsUpdate = true;
    scrollGroup.userData.charmMat.map = makeXiTexture(256, { ring: false });
    scrollGroup.userData.charmMat.needsUpdate = true;
    frames.forEach((f) => {
      if (!f.filled) {
        f.group.userData.photoMat.map = makePlaceholderTexture(512, 649);
        f.group.userData.photoMat.needsUpdate = true;
      }
    });
    if (!videoState.ready) {
      screenPlaceholderTex = makeScreenTexture(960, 540);
      screenGroup.userData.screenMat.map = screenPlaceholderTex;
      screenGroup.userData.screenMat.needsUpdate = true;
    }
   } catch (e) { /* 字体重绘失败不影响主流程 */ }
  });
}

/* ================= 尺寸 / 性能 ================= */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener("resize", App.debounce(resize, 150));
resize();

let fpsFrames = 0, fpsTime = performance.now(), degraded = 0;
function autoDegrade(now) {
  fpsFrames++;
  if (now - fpsTime > 3000) {
    const fps = (fpsFrames * 1000) / (now - fpsTime);
    fpsFrames = 0; fpsTime = now;
    if (fps < 28 && degraded === 0) {
      renderer.setPixelRatio(1);
      bloom.strength = 0.32;
      degraded = 1;
    } else if (fps < 24 && degraded === 1) {
      petals.count = Math.floor(PETAL_COUNT / 2);
      bloom.strength = 0.22;
      degraded = 2;
    }
  }
}

/* ================= 主循环 ================= */
let lastFrame = performance.now();
let elapsed = 0;
let lastStation = -1;
let lastTickRun = 0;

function tick() {
  /* 双通道调度：rAF 为主；标签页被节流/后台冻结时由 setTimeout 兜底 */
  const now0 = performance.now();
  if (now0 - lastTickRun < 8) return;
  lastTickRun = now0;
  requestAnimationFrame(tick);
  setTimeout(() => { if (performance.now() - lastTickRun > 140) tick(); }, 150);

  const now = now0;
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  elapsed += dt;
  const t = elapsed;

  /* 滚动平滑 */
  scroll.cur += (scroll.target - scroll.cur) * 0.075;
  if (opened) {
    camera.position.z = CAM_START - scroll.cur * SPACING;
  } else if (!opening) {
    camera.position.z = CAM_START;   // 待机封面
  }
  /* opening 期间相机 Z 由开场补间 animTo 接管 */
  camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04;
  camera.position.y += ((-0.1 + pointer.y * 0.15) - camera.position.y) * 0.04;
  const lookZ = camera.position.z - 9;
  camera.lookAt(pointer.x * 0.5, 0.3, lookZ);

  /* 随灯 */
  camLight.position.set(0, 2.4, camera.position.z + 4);
  redLight.position.set(0, -1.6, camera.position.z + 2.5);

  /* 章节 */
  const si = App.clamp(Math.round(scroll.cur), 0, STATIONS - 1);
  if (si !== lastStation) {
    lastStation = si;
    if (opened) activateStation(si);
  }

  tickers.forEach((fn) => fn(t, dt));
  autoDegrade(performance.now());
  composer.render();
}

renderInfo();
activateStation(0);
tick();
window.__cardBootOK = true;

/* 调试接口（自动化验证用） */
window.__invite = {
  open: openScroll,
  go: goTo,
  get opened() { return opened; },
  get station() { return activeStation; },
};
