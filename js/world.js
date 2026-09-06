/* ============ world.js · 全局 3D 世界引擎 ============
   渲染器 / 天空盒 / 雾 / 灯光阴影 / 后处理（Bloom + SSAO）
   相机飞行 / 视差 / OrbitControls / CSS3D / 质量分级
====================================================== */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

const App = window.App;
const gsap = window.gsap;

/* 区域间距：每个场景在 Z 轴上的间隔（相机沿 -Z 飞行） */
export const ZONE_GAP = 70;
export const zoneZ = (i) => -i * ZONE_GAP;

const world = {
  THREE,
  CSS3DObject,
  zoneZ,
  scene: null,
  camera: null,
  renderer: null,
  composer: null,
  bloom: null,
  ssao: null,
  css3d: null,
  orbit: null,

  /* 相机基准位（视差在此基础上微调） */
  camBase: new THREE.Vector3(0, 0.6, 9),
  lookBase: new THREE.Vector3(0, 0, 0),
  flying: false,

  zones: [],
  ticks: new Set(),
  pointer: new THREE.Vector2(0, 0), // NDC
  parallax: { tx: 0, ty: 0, x: 0, y: 0 },

  tier: "high", // high | touch | low
  degraded: 0,
};

/* ---------------- 初始化 ---------------- */
world.init = function () {
  const canvas = document.getElementById("world-canvas");
  App.isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  world.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  world.tier = App.isTouch ? "touch" : "high";
  world.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, world.tier === "touch" ? 1.6 : 2));
  world.renderer.outputColorSpace = THREE.SRGBColorSpace;
  world.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  world.renderer.toneMappingExposure = 1.06;
  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFShadowMap;

  world.scene = new THREE.Scene();
  world.scene.fog = new THREE.FogExp2(0xffe2d4, 0.028);

  world.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  world.camera.position.copy(world.camBase);
  world.camera.lookAt(world.lookBase);

  /* ---------- 天空盒：暖粉 → 香槟金渐变 ---------- */
  const skyGeo = new THREE.SphereGeometry(400, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0xfbc9d8) },
      mid: { value: new THREE.Color(0xffe4d8) },
      bot: { value: new THREE.Color(0xf7e0ba) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h >= 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(mid, bot, pow(-h, 0.7));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  world.scene.add(new THREE.Mesh(skyGeo, skyMat));

  /* ---------- 灯光 ---------- */
  world.ambient = new THREE.AmbientLight(0xfff1e6, 0.4);
  world.scene.add(world.ambient);

  world.dirLight = new THREE.DirectionalLight(0xfff4e8, 1.6);
  world.dirLight.position.set(5, 9, 7);
  world.dirLight.castShadow = true;
  const s = world.dirLight.shadow;
  s.mapSize.set(world.tier === "touch" ? 1024 : 2048, world.tier === "touch" ? 1024 : 2048);
  s.camera.near = 1;
  s.camera.far = 50;
  s.camera.left = -12; s.camera.right = 12;
  s.camera.top = 12; s.camera.bottom = -12;
  s.bias = -0.0004;
  s.normalBias = 0.02;
  world.scene.add(world.dirLight, world.dirLight.target);

  world.pointLight = new THREE.PointLight(0xffa8bd, 26, 40, 2); // 暖粉点光
  world.pointLight.position.set(-3, 2.5, 5);
  world.scene.add(world.pointLight);

  /* ---------- 后处理 ---------- */
  world.composer = new EffectComposer(world.renderer);
  world.composer.addPass(new RenderPass(world.scene, world.camera));
  if (world.tier === "high") {
    world.ssao = new SSAOPass(world.scene, world.camera, window.innerWidth, window.innerHeight);
    world.ssao.kernelRadius = 0.5;
    world.ssao.minDistance = 0.002;
    world.ssao.maxDistance = 0.12;
    world.composer.addPass(world.ssao);
  }
  world.bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.3, 0.8
  );
  world.composer.addPass(world.bloom);
  world.composer.addPass(new OutputPass());

  /* ---------- CSS3D 文字层 ---------- */
  world.css3d = new CSS3DRenderer();
  const cssLayer = document.getElementById("css3d-layer");
  world.css3d.domElement.style.position = "absolute";
  world.css3d.domElement.style.top = "0";
  world.css3d.domElement.style.left = "0";
  cssLayer.appendChild(world.css3d.domElement);

  /* ---------- OrbitControls（默认关闭，仅照片墙开启） ---------- */
  world.orbit = new OrbitControls(world.camera, world.renderer.domElement);
  world.orbit.enabled = false;
  world.orbit.enableZoom = false;
  world.orbit.enablePan = false;
  world.orbit.enableDamping = true;
  world.orbit.dampingFactor = 0.08;

  /* ---------- 指针 / 视差 ---------- */
  const onMove = (x, y) => {
    world.pointer.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    world.parallax.tx = world.pointer.x;
    world.parallax.ty = world.pointer.y;
  };
  window.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener("resize", () => world.resize());
  world.resize();
  world.loop();
};

/* ---------------- 尺寸 ---------------- */
world.resize = function () {
  const w = window.innerWidth, h = window.innerHeight;
  world.camera.aspect = w / h;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(w, h, false);
  world.composer.setSize(w, h);
  world.css3d.setSize(w, h);
  if (world.ssao && world.ssao.setSize) world.ssao.setSize(w, h);
};

/* ---------------- 区域管理 ---------------- */
/* 每个区域：独立的 Group + 地面阴影接收板 */
world.createZone = function (index, groundY = -3) {
  const group = new THREE.Group();
  group.position.set(0, 0, zoneZ(index));
  world.scene.add(group);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 48),
    new THREE.ShadowMaterial({ opacity: 0.14 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  group.add(ground);

  world.zones[index] = group;
  return group;
};

/* 光源跟随当前区域中心（飞行结束后调用） */
world.focusLights = function (zoneIndex, dur = 1.2) {
  const c = new THREE.Vector3(0, 0, zoneZ(zoneIndex));
  const t = { x: world.dirLight.position.x, y: world.dirLight.position.y, z: world.dirLight.position.z };
  gsap.to(t, {
    x: c.x + 5, y: c.y + 9, z: c.z + 7,
    duration: dur, ease: "power2.inOut",
    onUpdate: () => world.dirLight.position.set(t.x, t.y, t.z),
  });
  world.dirLight.target.position.copy(c);
  world.dirLight.target.updateMatrixWorld();

  const p = { x: world.pointLight.position.x, y: world.pointLight.position.y, z: world.pointLight.position.z };
  gsap.to(p, {
    x: c.x - 3, y: c.y + 2.5, z: c.z + 5,
    duration: dur, ease: "power2.inOut",
    onUpdate: () => world.pointLight.position.set(p.x, p.y, p.z),
  });
};

/* ---------------- 相机飞行 ---------------- */
world.flyTo = function ({ pos, look, dur = 1.4, ease = "power2.inOut", onArrive }) {
  gsap.killTweensOf(world.camBase);
  gsap.killTweensOf(world.lookBase);
  world.flying = true;
  const p = { x: world.camBase.x, y: world.camBase.y, z: world.camBase.z };
  const l = { x: world.lookBase.x, y: world.lookBase.y, z: world.lookBase.z };
  const target = typeof pos === "function" ? pos() : pos;
  const lookT = typeof look === "function" ? look() : look;

  gsap.to(p, {
    x: target.x, y: target.y, z: target.z,
    duration: dur, ease,
    onUpdate: () => world.camBase.set(p.x, p.y, p.z),
  });
  gsap.to(l, {
    x: lookT.x, y: lookT.y, z: lookT.z,
    duration: dur, ease,
    onUpdate: () => world.lookBase.set(l.x, l.y, l.z),
    onComplete: () => {
      world.flying = false;
      if (onArrive) onArrive();
    },
  });
};

/* 立即同步相机到某区域默认视角 */
world.snapTo = function (zoneIndex) {
  const z = zoneZ(zoneIndex);
  world.camBase.set(0, 0.6, z + 8.5);
  world.lookBase.set(0, 0, z);
  world.orbit.target.set(0, 0, z);
  world.focusLights(zoneIndex, 0);
};

/* ---------------- OrbitControls 封装 ---------------- */
world.enableOrbit = function (zoneIndex, { minAz = -Math.PI / 6, maxAz = Math.PI / 6 } = {}) {
  const z = zoneZ(zoneIndex);
  world.orbit.target.set(0, 0, z);
  world.orbit.minAzimuthAngle = minAz;
  world.orbit.maxAzimuthAngle = maxAz;
  /* 锁定当前俯仰角（禁止垂直旋转） */
  const sph = new THREE.Spherical().setFromVector3(
    new THREE.Vector3().subVectors(world.camera.position, world.orbit.target)
  );
  world.orbit.minPolarAngle = sph.phi;
  world.orbit.maxPolarAngle = sph.phi;
  world.orbit.update();
  world.orbit.enabled = true;
};
world.disableOrbit = function () {
  world.orbit.enabled = false;
  /* 把当前相机状态同步回基准位，避免跳变 */
  world.camBase.copy(world.camera.position);
  const dir = new THREE.Vector3().subVectors(world.orbit.target, world.camera.position).normalize();
  world.lookBase.copy(world.camera.position).addScaledVector(dir, 6);
};

/* ---------------- 帧循环 ---------------- */
world.addTick = (fn) => { world.ticks.add(fn); return () => world.ticks.delete(fn); };

world.loop = function () {
  let last = performance.now();
  let frames = 0, acc = 0;

  const tick = () => {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    for (const fn of world.ticks) fn(dt, t);

    /* 相机：Orbit 优先，否则基准位 + 视差偏移（≤0.2） */
    if (world.orbit.enabled) {
      world.orbit.update();
    } else {
      world.parallax.x += (world.parallax.tx - world.parallax.x) * 0.045;
      world.parallax.y += (world.parallax.ty - world.parallax.y) * 0.045;
      const px = world.parallax.x * 0.2;
      const py = world.parallax.y * 0.14;
      world.camera.position.set(
        world.camBase.x + px,
        world.camBase.y + py,
        world.camBase.z
      );
      world.camera.lookAt(world.lookBase.x + px * 0.5, world.lookBase.y + py * 0.5, world.lookBase.z);
    }

    world.composer.render();
    world.css3d.render(world.scene, world.camera);

    /* 帧率监测：低于 30fps 自动降质 */
    frames++; acc += dt;
    if (acc >= 1.2) {
      const fps = frames / acc;
      frames = 0; acc = 0;
      if (fps < 30) world.degrade();
    }
  };
  tick();
};

/* ---------------- 自动降质 ---------------- */
world.degrade = function () {
  if (world.degraded >= 2) return;
  world.degraded++;

  if (world.degraded === 1) {
    if (world.ssao) world.ssao.enabled = false;
    if (world.bloom) world.bloom.strength = 0.35;
    world.renderer.setPixelRatio(1);
  } else {
    /* 第二级：关闭阴影贴图重渲染 */
    world.dirLight.castShadow = false;
    world.renderer.shadowMap.enabled = false;
  }
};

/* ================= 资源生成辅助 ================= */

/* 柔光圆点贴图（光斑粒子 / 光晕） */
world.softCircleTexture = function (inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, "rgba(255,255,255,0.5)");
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/* 纸张法线贴图（程序化噪声凹凸） */
world.paperNormalMap = function () {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 0.6 + Math.random() * 1.8;
    const bright = Math.random() > 0.5;
    ctx.fillStyle = bright
      ? `rgba(${176 + (Math.random() * 40) | 0},${176 + (Math.random() * 40) | 0},255,0.5)`
      : `rgba(${100 + (Math.random() * 30) | 0},${100 + (Math.random() * 30) | 0},255,0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 1.6);
  return tex;
};

/* 经典心形 THREE.Shape（s 为缩放系数） */
world.heartShape = function (s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0.25 * s, 0.25 * s);
  sh.bezierCurveTo(0.25 * s, 0.25 * s, 0.2 * s, 0, 0, 0);
  sh.bezierCurveTo(-0.3 * s, 0, -0.3 * s, 0.35 * s, -0.3 * s, 0.35 * s);
  sh.bezierCurveTo(-0.3 * s, 0.55 * s, -0.1 * s, 0.77 * s, 0.25 * s, 0.95 * s);
  sh.bezierCurveTo(0.6 * s, 0.77 * s, 0.8 * s, 0.55 * s, 0.8 * s, 0.35 * s);
  sh.bezierCurveTo(0.8 * s, 0.35 * s, 0.8 * s, 0, 0.5 * s, 0);
  sh.bezierCurveTo(0.35 * s, 0, 0.25 * s, 0.25 * s, 0.25 * s, 0.25 * s);
  return sh;
};

/* 圆角矩形 Shape */
world.roundedRectShape = function (w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

/* ---------------- 3D 文字几何（Canvas 轮廓 → ExtrudeGeometry） ----------------
   支持任意中文字符：把文字绘制到 canvas，用 marching squares 提取轮廓，
   转成 THREE.Shape 后挤出成真正的立体文字。 */
world.makeTextGeometry = function (text, { fontPx = 110, size = 1.6, depth = 0.32 } = {}) {
  const pad = Math.ceil(fontPx * 0.3);
  const c = document.createElement("canvas");
  let ctx = c.getContext("2d");
  const font = `${fontPx}px "Ma Shan Zheng", KaiTi, STKaiti, "PingFang SC", sans-serif`;
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width);
  const W = Math.max(tw + pad * 2, 4), H = Math.ceil(fontPx * 1.7);
  c.width = W; c.height = H;
  ctx = c.getContext("2d");
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, W / 2, H / 2);

  const data = ctx.getImageData(0, 0, W, H).data;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3]);

  /* marching squares：收集线段 */
  const segs = [];
  const mid = (x1, y1, x2, y2) => [(x1 + x2) / 2, (y1 + y2) / 2];
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const tl = at(x, y) > 127 ? 1 : 0;
      const tr = at(x + 1, y) > 127 ? 1 : 0;
      const br = at(x + 1, y + 1) > 127 ? 1 : 0;
      const bl = at(x, y + 1) > 127 ? 1 : 0;
      const code = tl * 8 + tr * 4 + br * 2 + bl * 1;
      if (code === 0 || code === 15) continue;
      const top = mid(x, y, x + 1, y);
      const right = mid(x + 1, y, x + 1, y + 1);
      const bottom = mid(x, y + 1, x + 1, y + 1);
      const left = mid(x, y, x, y + 1);
      const table = {
        1: [left, bottom], 2: [bottom, right], 3: [left, right],
        4: [top, right], 5: [left, top], 6: [top, bottom],
        7: [left, top], 8: [top, left], 9: [top, bottom],
        10: [top, right], 11: [top, right], 12: [right, left],
        13: [bottom, right], 14: [left, bottom],
      };
      const pair = table[code];
      if (pair) segs.push([pair[0], pair[1]]);
    }
  }

  /* 链接线段成闭合轮廓 */
  const key = (p) => `${Math.round(p[0] * 2)}_${Math.round(p[1] * 2)}`;
  const map = new Map();
  segs.forEach((s) => {
    for (const p of s) {
      const k = key(p);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
  });
  const used = new Set();
  const contours = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    const chain = [segs[i][0], segs[i][1]];
    used.add(i);
    let guard = segs.length + 4;
    while (guard-- > 0) {
      const tail = chain[chain.length - 1];
      const kt = key(tail);
      const cands = (map.get(kt) || []).find((s) => !used.has(segs.indexOf(s)));
      if (!cands) break;
      used.add(segs.indexOf(cands));
      const next = key(cands[0]) === kt ? cands[1] : cands[0];
      if (key(next) === key(chain[0])) break;
      chain.push(next);
    }
    if (chain.length >= 8) contours.push(chain);
  }

  /* 像素轮廓 → Shape（含孔洞：按嵌套深度判断） */
  const scale = size / fontPx;
  const pt = (p) => new THREE.Vector2(
    (p[0] - W / 2) * scale,
    -(p[1] - H / 2) * scale
  );
  const polys = contours.map((c2) => {
    const pts = [];
    let last = null;
    for (const p of c2) {
      const v = pt(p);
      if (!last || v.distanceTo(last) > 0.008) { pts.push(v); last = v; }
    }
    return pts;
  }).filter((p) => p.length >= 4);

  const inside = (ptA, ring) => {
    let cn = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      if ((ring[i].y > ptA.y) !== (ring[j].y > ptA.y) &&
          ptA.x < ((ring[j].x - ring[i].x) * (ptA.y - ring[i].y)) / (ring[j].y - ring[i].y) + ring[i].x) cn++;
    }
    return cn % 2 === 1;
  };
  const depthOf = (poly) => polys.reduce((n, other) => (other !== poly && inside(poly[0], other) ? n + 1 : n), 0);

  const shapes = [];
  for (const poly of polys) {
    const d = depthOf(poly);
    if (d % 2 === 0) {
      const sh = new THREE.Shape(poly);
      sh.holes = polys.filter((o) => o !== poly && depthOf(o) === d + 1).map((o) => new THREE.Path(o));
      shapes.push(sh);
    }
  }
  if (!shapes.length) return null;

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1,
    curveSegments: 4,
  });
  geo.center();
  return geo;
};

App.world = world;
export default world;
