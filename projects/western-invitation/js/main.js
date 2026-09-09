/* ============ main.js · 西式婚礼邀请函 3D 世界 ============
   层级：背景（暖白穹顶 / 雾）→ 殿堂/拱门/立柱/吊灯
        → 内容层（照片墙 / 时间线 / 信息卡 / RSVP）→ 前景花瓣 / 金屑粒子
   滚动驱动相机沿 Z 轴穿越 8 个章节
====================================================== */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import {
  buildEnvelope, buildHall, buildPhotoWall,
  buildInfoCard, buildRsvpCard, buildEndingScene,
  buildGrandFloor,
  makePetalTexture, makeFleckTexture, makeGlowTexture, makePlaceholderTexture,
  makeGoldFrameTexture, makeBeamTexture, makeDustTexture, makeBokehTexture,
} from "./factory.js";
import { initDanmaku } from "./danmaku.js";

const App = window.App;
const cfg = App.config;
const T = cfg.theme;

/* ---------- 补间 ---------- */
function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
function animTo(delay, dur, items, onComplete) {
  let done = false;
  const finish = () => { if (done) return; done = true; items.forEach((it) => it.set(it.to)); if (onComplete) onComplete(); };
  setTimeout(() => {
    const starts = items.map((it) => it.get());
    const t0 = performance.now();
    const step = () => {
      if (done) return;
      const p = Math.min(1, (performance.now() - t0) / (dur * 1000));
      const e = easeInOut(p);
      items.forEach((it, i) => it.set(starts[i] + (it.to - starts[i]) * e));
      if (p < 1) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
  }, delay * 1000);
  setTimeout(finish, (delay + dur + 0.2) * 1000);
}

/* ================= 配置 ================= */
const STATIONS = App.$$(".invite-section").length;  /* 章节数随 DOM 自动同步（story 章节已移除） */
const SPACING = 16;
/* 画廊(站3)→详情(站4)额外间距：相机必须先越过相框圆环（R≈7.6，远边 z≈-55.6），
   详情卡才在环后出现；站 4/5/6 的相机与物体统一后移 GALLERY_GAP */
const GALLERY_GAP = 10;
const stationZ = (i) => (i <= 3 ? -i * SPACING : -3 * SPACING - (i - 3) * (SPACING + GALLERY_GAP));
const CAM_START = 11;
const camZFor = (s) => (s <= 3 ? CAM_START - s * SPACING : CAM_START - 3 * SPACING - (s - 3) * (SPACING + GALLERY_GAP));
const PETAL_COUNT = App.isMobile ? cfg.petals.mobile : cfg.petals.desktop;
const FLECK_COUNT = App.isMobile ? cfg.flecks.mobile : cfg.flecks.desktop;

const scroll = { target: 0, cur: 0 };
let opened = false, opening = false;

/* ================= 渲染器 ================= */
const QUALITY = [
  { prCap: 2, samples: 4, bloomScale: 0.45, bloom: 0.5, dust: 1.0, beam: 1.0 },
  { prCap: 1.5, samples: 2, bloomScale: 0.4, bloom: 0.42, dust: 0.6, beam: 0.8 },
  { prCap: 1.25, samples: 0, bloomScale: 0.35, bloom: 0.32, dust: 0.4, beam: 0.65 },
];
let qualityLevel = 0;
/* 运行时可调特效对象（体积光束/光尘在场景物件段创建后挂入，供质量分级降级） */
const fxTune = { dustMat: null, beam: [] };

const canvas = document.getElementById("world-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: "high-performance", stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[0].prCap));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
function enrichTexture(tex) {
  if (!tex) return tex;
  tex.anisotropy = MAX_ANISO;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  if (tex.colorSpace === THREE.NoColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(new THREE.Color(T.fog).getHex(), 0.004);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
camera.position.set(0, 0, CAM_START);
camera.lookAt(0, 0, 0);

/* ---------- 暖香槟穹顶（程序化渐变迷雾 + 远景建筑轮廓剪影） ---------- */
const skyGeo = new THREE.SphereGeometry(280, 48, 28);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  transparent: true,  /* 开场黑场阶段穹顶淡入（fade uniform） */
  uniforms: {
    top: { value: new THREE.Color(T.skyTop) },
    mid: { value: new THREE.Color(T.skyBot) },
    bot: { value: new THREE.Color(T.ground) },
    horizon: { value: new THREE.Color(T.roseGold) },
    sil: { value: new THREE.Color(0xb39e7e) },   /* 剪影暖灰褐色 */
    gold: { value: new THREE.Color(T.goldLight) },
    fade: { value: 1.0 },                        /* 开场时间轴驱动：0=黑场 1=完整穹顶 */
  },
  vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 top, mid, bot, horizon, sil, gold; uniform float fade; varying vec3 vPos;
    #define PI 3.14159265
    /* 单座远景建筑：双柱 + 横梁 + 半圆拱顶，返回剪影遮罩 */
    float building(float az, float el, float center, float pitch, float hh) {
      float u = mod(az - center + PI, 2.0*PI) - PI;
      /* 两根立柱 */
      float lp = 1.0 - smoothstep(0.010, 0.020, abs(abs(u) - pitch));
      float col = lp * step(0.0, el) * step(el, hh);
      /* 横梁（檐部） */
      float beam = (1.0 - smoothstep(0.0, 0.028, abs(el - hh))) * step(abs(u), pitch + 0.03);
      /* 半圆拱顶 */
      float ru = u / pitch, re = (el - hh) / (pitch * 0.95);
      float rc = ru*ru + re*re;
      float dome = (re > 0.0 && rc < 1.0) ? (1.0 - smoothstep(0.82, 1.0, rc)) : 0.0;
      return max(max(col, beam), dome);
    }
    void main(){
      vec3 d = normalize(vPos); float h = d.y;
      vec3 c = h >= 0.0 ? mix(mid, top, pow(clamp(h,0.0,1.0), 0.55))
                       : mix(mid, bot, pow(clamp(-h,0.0,1.0), 0.85));
      /* 地平线玫瑰金光晕 */
      float ho = pow(max(0.0, 1.0 - abs(h)), 3.0);
      c += horizon * 0.22 * ho;
      c += gold * 0.10 * pow(max(0.0, 1.0 - abs(h)), 6.0);

      /* 远景建筑轮廓（水平方位角 + 仰角，越接近地平线越清晰） */
      float az = atan(d.x, -d.z);
      float el = h;
      float horizonFade = exp(-pow(max(el, 0.0) * 5.0, 2.0)) * smoothstep(-0.06, 0.02, el);
      float b = 0.0;
      b = max(b, building(az, el, -0.62, 0.10, 0.16));
      b = max(b, building(az, el,  0.05, 0.13, 0.22));
      b = max(b, building(az, el,  0.70, 0.09, 0.14));
      b = max(b, building(az, el, -1.35, 0.11, 0.18));
      b = max(b, building(az, el,  1.40, 0.10, 0.15));
      float silA = clamp(b, 0.0, 1.0) * horizonFade * 0.16;
      c = mix(c, mix(sil, bot, 0.35), silA);

      gl_FragColor = vec4(c, fade);
    }`,
});
const skyMesh = new THREE.Mesh(skyGeo, skyMat);
skyMesh.frustumCulled = false;
scene.add(skyMesh);

/* ---------- 灯光：环境柔光 + 左上方45°暖白主光（4500K #FFF4E0） ---------- */
const ambientLight = new THREE.AmbientLight(0xfff7ec, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xfff4e0, 0.95);  /* ≈环境光1.5倍 */
dirLight.position.set(-11, 13, stationZ(2) + 8);               /* 场景左上方 */
dirLight.target.position.set(0, 1.5, stationZ(2) - 3);        /* 斜射向中央T台花门 */
scene.add(dirLight);
scene.add(dirLight.target);
const camLight = new THREE.PointLight(new THREE.Color(T.warm).getHex(), 18, 34, 2);
camLight.position.set(0, 2.2, 6);
scene.add(camLight);
const warmLight = new THREE.PointLight(new THREE.Color(T.roseGold).getHex(), 10, 26, 2);
warmLight.position.set(0, -1.5, 4);
scene.add(warmLight);

/* 左右聚光灯：打亮两侧相框/立柱，形成明暗对比与立体感（随相机移动，始终照亮当前章节） */
const spotLights = [];
for (const side of [-1, 1]) {
  const sp = new THREE.SpotLight(0xfff2dd, 60, 60, 0.5, 0.55, 1.6);
  sp.position.set(side * 9, 7.5, 4);
  const tgt = new THREE.Object3D();
  tgt.position.set(side * 2.6, -1.2, -10);
  scene.add(tgt);
  sp.target = tgt;
  scene.add(sp);
  spotLights.push({ sp, tgt, side });
}

/* ---------- 后处理（电影级管线：Bloom → Output → 调色/暗角 → Sharpen → FXAA）
   注：SSAO/SAO 已移除——实测其 Normal G-Buffer 在本管线（far=600 大场景深度 +
   薄卡/纱幔/光束等透明体）下整缓冲失效，遮蔽图在轮廓外饱和，产生白斑+黑色
   锯齿边；调参无法稳定消除。接触感由材质高光/暗角/地面反射承担。 ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

/* 泛光：只包裹发光体（线性 HDR 阈值 1.05：白墙/纸张不泛光），强度 0.38，永不关闭 */
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.45, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* 色彩分级 + 暗角：暖调白平衡 / 暗部蓝紫(#1A1A2E 0.1) / 高光暖金 / 暗角 强度0.2 半径0.8 */
const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      /* 暗部蓝紫色调（不死黑，强度 0.1） */
      float sh = smoothstep(0.6, 0.05, l);
      col *= mix(vec3(1.0), vec3(0.92,0.94,1.12), sh * 0.35);
      /* 高光保持暖金 */
      float hi = smoothstep(0.7, 1.0, l);
      col = mix(col, col * vec3(1.07,1.02,0.90) + vec3(0.015,0.008,0.0), hi * 0.3);
      /* 暖白平衡（色温+5）+ 微品红 tint（+2） */
      col += vec3(0.012, 0.002, 0.004);
      /* 微提对比与饱和 */
      col = (col - 0.5) * 1.05 + 0.5;
      float l2 = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l2), col, 1.06);
      /* 暗角：强度 0.2 / 半径 0.8（边缘压暗） */
      float d = length(vUv - 0.5) * 1.35;
      float vig = smoothstep(0.35, 0.8, d);
      col *= 1.0 - vig * 0.2;
      gl_FragColor = vec4(col, c.a);
    }`,
};
const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);

const fxaaPass = new ShaderPass(FXAAShader);
composer.addPass(fxaaPass);
const SharpenShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) }, strength: { value: 0.08 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float strength; varying vec2 vUv;
    void main(){ vec2 t=1.0/resolution; vec4 c=texture2D(tDiffuse,vUv); vec4 s=texture2D(tDiffuse,vUv)*4.0;
    s-=texture2D(tDiffuse,vUv+vec2(t.x,0.0)); s-=texture2D(tDiffuse,vUv-vec2(t.x,0.0));
    s-=texture2D(tDiffuse,vUv+vec2(0.0,t.y)); s-=texture2D(tDiffuse,vUv-vec2(0.0,t.y));
    gl_FragColor=c+s*strength; }`,
};
const sharpenPass = new ShaderPass(SharpenShader);
composer.addPass(sharpenPass);

function applyQuality(lv) {
  qualityLevel = lv;
  const q = QUALITY[lv];
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, q.prCap);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  composer.renderTarget1.samples = q.samples;
  composer.renderTarget2.samples = q.samples;
  composer.renderTarget1.dispose();
  composer.renderTarget2.dispose();
  bloom.setSize(Math.max(2, Math.floor(w * pr * q.bloomScale)), Math.max(2, Math.floor(h * pr * q.bloomScale)));
  bloom.strength = q.bloom;
  fxaaPass.material.uniforms["resolution"].value.set(1 / (w * pr), 1 / (h * pr));
  sharpenPass.material.uniforms["resolution"].value.set(w * pr, h * pr);
  /* 体积光永不关闭：低档仅降亮度；光尘按档降可见度 */
  fxTune.beam.forEach((b) => { b.factor = q.beam; });
  if (fxTune.dustMat) fxTune.dustMat.opacity = 0.42 * q.dust;
  if (lv >= 2) { petals.count = Math.floor(PETAL_COUNT / 2); flecks.visible = false; }
}
applyQuality(0);

/* ================= 场景物件 ================= */
const tickers = [];
const clickable = [];
const fontTexturedMats = [];
const rnd = App.hashRandom("western-invite");

/* ---------- 信封（场景0 主角） ---------- */
const envelope = buildEnvelope();
envelope.position.set(0, App.isMobile ? 0.8 : 1.0, 0.6);
envelope.scale.setScalar(App.isMobile ? 0.78 : 0.95);
scene.add(envelope);
envelope.traverse((o) => { if (o.isMesh) { o.userData.kind = "envelope"; clickable.push(o); } });
const envBaseY = envelope.position.y;
const envBaseScale = envelope.scale.x;
tickers.push((t) => {
  if (!opened) {
    envelope.position.y = envBaseY + Math.sin(t * 0.8) * 0.06;
    envelope.rotation.y = pointer.x * 0.08 + Math.sin(t * 0.4) * 0.02;
  }
});

/* ================= 开场微电影（loading → 黑场顶光 → 信封浮现 → 定格暖光） =================
   时间轴（ct 秒，全部 ease-in-out）：
   A 0.0–1.5s  黑场中顶光缓缓亮起，光束与金色尘埃浮现；
   B 1.5–3.1s  信封在光中由虚到实淡入，镜头缓推（DoF 用光晕+尺度 settle 模拟）；
   C 3.1–4.4s  顶光交棒给室内暖光，黑场遮罩褪尽，CLIK TO OPEN 浮现。
   跳过（加载>5s 点击）直接进入定格待命态。 -------------------------------------- */
const introState = { phase: "loading", t0: 0, shown: false };
const veilEl = document.getElementById("cinema-veil");
const loaderEl = document.getElementById("intro-loader");
let introLight = 1;   /* 常规灯光系数：cinema 期间被压暗，定格时回 1 */

/* 黑场顶光：聚光灯（唯一主光源） */
const introSpot = new THREE.SpotLight(0xffe6bf, 0, 34, 0.52, 0.82, 1.3);
introSpot.position.set(0, 8.6, 2.6);
const introSpotTgt = new THREE.Object3D();
introSpotTgt.position.set(0, 1.0, 0.6);
scene.add(introSpotTgt);
introSpot.target = introSpotTgt;
scene.add(introSpot);

/* 顶光锥形光束（加色混合，黑场中可见丁达尔光柱） */
const introBeamMat = new THREE.MeshBasicMaterial({
  map: makeBeamTexture(128, 512), transparent: true, opacity: 0,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  fog: false, color: 0xffe9c6,
});
const introBeam = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 9.6), introBeamMat);
{
  const from = new THREE.Vector3(0, 8.4, 2.4), to = new THREE.Vector3(0, 0.5, 0.6);
  introBeam.position.copy(from).add(to).multiplyScalar(0.5);
  introBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
}
introBeam.visible = false;
scene.add(introBeam);

/* 光束中缓慢上浮的金色微尘 */
const INTRO_DUST = 130;
const introDustGeo = new THREE.BufferGeometry();
const introDustPos = new Float32Array(INTRO_DUST * 3);
const introDustData = [];
for (let i = 0; i < INTRO_DUST; i++) {
  const d = {
    x: (rnd() * 2 - 1) * 2.0, y: 0.4 + rnd() * 7.8, z: 0.6 + (rnd() * 2 - 1) * 1.7,
    ph: rnd() * 6.28, sp: 0.05 + rnd() * 0.09, ax: 0.12 + rnd() * 0.3,
  };
  introDustData.push(d);
  introDustPos[i * 3] = d.x; introDustPos[i * 3 + 1] = d.y; introDustPos[i * 3 + 2] = d.z;
}
introDustGeo.setAttribute("position", new THREE.BufferAttribute(introDustPos, 3));
const introDustMat = new THREE.PointsMaterial({
  map: makeDustTexture(64), color: 0xffe0a4, size: 0.13, sizeAttenuation: true,
  transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
});
const introDust = new THREE.Points(introDustGeo, introDustMat);
introDust.frustumCulled = false;
introDust.visible = false;
scene.add(introDust);

function introSeg(ct, t0, t1) { return ct <= t0 ? 0 : ct >= t1 ? 1 : easeInOut((ct - t0) / (t1 - t0)); }

/* 极轻风铃（浏览器自动播放策略下，无用户手势时 AudioContext 挂起 → 静默跳过） */
function introChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state !== "running") { ctx.close().catch(() => {}); return; }
    const master = ctx.createGain();
    master.gain.value = 0.05;
    master.connect(ctx.destination);
    [880, 1318.5].forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.22;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.8, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 2.6);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 3400);
  } catch (e) {}
}

/* 黑场期间藏起花瓣/散景等氛围粒子，定格阶段随暖光回归 */
function setAmbientParticles(v) {
  [petals, flecks, fgBokeh].forEach((o) => { o.visible = v; });
  bokehList.forEach(({ sp }) => { sp.visible = v; });
  farHazeList.forEach(({ sp }) => { sp.visible = v; });
}

function beginCinema() {
  if (introState.phase !== "loading") return;
  introState.phase = "cinema";
  introState.t0 = elapsed;
  introState.shown = false;
  document.body.classList.add("cinema-ing");
  loaderEl.classList.add("hide");
  setTimeout(() => { if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl); }, 1200);
  veilEl.classList.remove("off");
  veilEl.style.opacity = "1";
  introBeam.visible = true;
  introDust.visible = true;
  setAmbientParticles(false);
  envelope.userData.fadeMats.forEach((m) => { m.transparent = true; m.opacity = 0; });
  introLight = 0.03;
  ambientLight.intensity = 0.6 * introLight;
  dirLight.intensity = 0.95 * introLight;
  spotLights.forEach(({ sp }) => { sp.intensity = 60 * introLight; });
  skyMat.uniforms.fade.value = 0.02;
  introChime();
}

function finishCinema() {
  if (introState.phase === "ready") return;
  introState.phase = "ready";
  document.body.classList.remove("cinema-ing");
  veilEl.classList.add("off");
  introBeam.visible = false;
  introDust.visible = false;
  introSpot.intensity = 0;
  introBeamMat.opacity = 0;
  introDustMat.opacity = 0;
  introLight = 1;
  ambientLight.intensity = 0.6;
  dirLight.intensity = 0.95;
  spotLights.forEach(({ sp }) => { sp.intensity = 60; });
  skyMat.uniforms.fade.value = 1;
  const glowMat = envelope.userData.glow.material;
  envelope.userData.fadeMats.forEach((m) => {
    if (m === glowMat) return;
    m.opacity = 1; m.transparent = false;
  });
  glowMat.opacity = 0.25;
  envelope.scale.setScalar(envBaseScale);
  setAmbientParticles(true);
  camera.position.z = CAM_START;
}

/* 跳过加载：直接进入待命定格态 */
function skipIntro() {
  if (introState.phase !== "loading") return;
  loaderEl.classList.add("hide");
  setTimeout(() => { if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl); }, 900);
  finishCinema();
}
let skipArmed = false;
setTimeout(() => { skipArmed = true; if (loaderEl) loaderEl.classList.add("can-skip"); }, 5000);
loaderEl.addEventListener("click", () => { if (skipArmed) skipIntro(); });

tickers.push((t) => {
  /* 微尘在光束中极慢上浮（开场期间） */
  if (introDust.visible) {
    const arr = introDustGeo.attributes.position.array;
    for (let i = 0; i < introDustData.length; i++) {
      const d = introDustData[i];
      let y = d.y + ((t * d.sp) % 7.8);
      if (y > 8.2) y -= 7.8;
      arr[i * 3] = d.x + Math.sin(t * d.sp + d.ph) * d.ax;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = d.z + Math.cos(t * d.sp * 0.8 + d.ph) * d.ax;
    }
    introDustGeo.attributes.position.needsUpdate = true;
  }
  if (introState.phase !== "cinema") return;
  const ct = t - introState.t0;
  const a = introSeg(ct, 0, 1.5);    /* 顶光亮起 */
  const b = introSeg(ct, 1.5, 3.1);  /* 信封浮现 + 镜头缓推 */
  const c = introSeg(ct, 3.1, 4.4);  /* 交棒室内暖光 */

  veilEl.style.opacity = String(1 - (0.22 * a + 0.60 * b + 0.18 * c));
  introLight = 0.03 + 0.22 * b + 0.75 * c;
  ambientLight.intensity = 0.6 * introLight;
  dirLight.intensity = 0.95 * introLight;
  spotLights.forEach(({ sp }) => { sp.intensity = 60 * introLight; });

  const spotK = a * (1 - c);
  introSpot.intensity = 170 * spotK;
  introBeamMat.opacity = 0.5 * spotK;
  introDustMat.opacity = 0.95 * spotK;
  skyMat.uniforms.fade.value = 0.02 + 0.98 * c;

  envelope.userData.fadeMats.forEach((m) => { if (m !== envelope.userData.glow.material) m.opacity = b; });
  envelope.scale.setScalar(envBaseScale * (1.12 - 0.12 * b));
  envelope.userData.glow.material.opacity = 0.25 + 1.05 * a * (1 - 0.5 * b) * (1 - c);

  if (ct >= 3.1 && !introState.shown) { introState.shown = true; setAmbientParticles(true); }
  if (ct >= 4.4) finishCinema();
});

/* ---------- 殿堂（场景2） ---------- */
const useReflector = !App.isMobile && qualityLevel === 0;
const hall = buildHall(useReflector);
hall.position.set(0, 0, stationZ(2));
scene.add(hall);
hall.userData.chandelier && tickers.push((t) => {
  hall.userData.chandelier.userData.glowMat.opacity = 0.45 + Math.sin(t * 1.2) * 0.08;
  (hall.userData.miniLights || []).forEach((m, i) => {
    m.userData.glowMat.opacity = 0.4 + Math.sin(t * 1.3 + i * 2) * 0.08;
  });
  /* 烛火摇曳 + 灯串呼吸 */
  if (hall.userData.flameMat) {
    hall.userData.flameMat.opacity = 0.78 + Math.sin(t * 9.0) * 0.12 + Math.sin(t * 23.0) * 0.06;
    hall.userData.flameMat.size = 0.52 + Math.sin(t * 11.0) * 0.05;
  }
  if (hall.userData.stringMat) hall.userData.stringMat.opacity = 0.72 + Math.sin(t * 2.2) * 0.16;
  /* 纱幔微风摆动（顶部固定、底部自由） */
  (hall.userData.drapes || []).forEach((d) => {
    const attr = d.mesh.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < arr.length; i += 3) {
      const bx = d.base[i], by = d.base[i + 1], bz = d.base[i + 2];
      const free = THREE.MathUtils.clamp((d.h / 2 - by) / d.h, 0, 1);
      arr[i + 2] = bz + (Math.sin(bx * 2.4 + t * 0.9 + d.ph) * 0.14
                        + Math.sin(by * 1.7 + t * 0.6 + d.ph) * 0.05) * free;
    }
    attr.needsUpdate = true;
  });
});

/* ---------- 全局贯通式镜面大理石地面（横跨所有章节，倒映照片墙/立柱/灯光） ---------- */
const grandFloor = buildGrandFloor(useReflector);
scene.add(grandFloor);

/* ---------- 体积光：丁达尔光束（左上斜射花门）+ 金色光尘 ---------- */
const beamTex = makeBeamTexture(128, 512);
const beamGroup = new THREE.Group();
const beamMats = [];
/* 光源端（左上高处）→ 地面端（T台花门），每条 beam：from/to/宽/亮度 */
const beamDefs = [
  { from: new THREE.Vector3(-5.2, 8.8, 3.5), to: new THREE.Vector3(-1.2, -2.8, -7.5), w: 3.4, o: 0.17 },
  { from: new THREE.Vector3(-3.6, 9.0, 1.5), to: new THREE.Vector3(0.6, -2.8, -5.0), w: 2.5, o: 0.13 },
  { from: new THREE.Vector3(-6.2, 8.2, 5.0), to: new THREE.Vector3(-2.4, -2.8, -2.8), w: 2.0, o: 0.10 },
];
const _upV = new THREE.Vector3(0, 1, 0);
beamDefs.forEach((b, i) => {
  const len = b.from.distanceTo(b.to);
  const mat = new THREE.MeshBasicMaterial({
    map: beamTex, transparent: true, opacity: b.o,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    fog: false, color: 0xfff0d0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(b.w, len), mat);
  mesh.position.copy(b.from).add(b.to).multiplyScalar(0.5);
  const dir = b.to.clone().sub(b.from).normalize();
  mesh.quaternion.setFromUnitVectors(_upV, dir);
  mesh.rotateY((i - 1) * 0.55);  /* 扇形展开，避免重合 */
  beamGroup.add(mesh);
  beamMats.push({ mat, base: b.o, ph: i * 2.1 });
});
hall.add(beamGroup);
tickers.push((t) => {
  /* 极轻微呼吸闪烁（保持光柱稳定，不喧宾夺主） */
  beamMats.forEach((b) => { b.mat.opacity = b.base * (0.92 + 0.08 * Math.sin(t * 0.7 + b.ph)); });
});

/* 金色光尘：光束路径内缓慢漂浮的自发光微粒（数量随质量分级降级） */
const DUST_COUNT = App.isMobile ? 160 : 280;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST_COUNT * 3);
const dustData = [];
for (let i = 0; i < DUST_COUNT; i++) {
  const d = {
    x: -6 + rnd() * 7, y: -2.5 + rnd() * 10.5, z: -9 + rnd() * 15,
    ph: rnd() * 6.28, sp: 0.02 + rnd() * 0.04,  /* 漂浮速度 ≤0.06单位/秒（远小于0.01/帧上限量级） */
    ax: 0.2 + rnd() * 0.35, ay: 0.15 + rnd() * 0.3,
  };
  dustData.push(d);
  dustPos[i * 3] = d.x; dustPos[i * 3 + 1] = d.y; dustPos[i * 3 + 2] = d.z;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({
  map: makeDustTexture(64), color: 0xffd700, size: 0.16, sizeAttenuation: true,
  transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
});
const dust = new THREE.Points(dustGeo, dustMat);
dust.frustumCulled = false;
hall.add(dust);
fxTune.dustMat = dustMat;
tickers.push((t) => {
  const arr = dustGeo.attributes.position.array;
  for (let i = 0; i < dustData.length; i++) {
    const d = dustData[i];
    arr[i * 3] = d.x + Math.sin(t * d.sp + d.ph) * d.ax;
    /* 极慢循环下落（10.5 范围缠绕，不跳变）+ 上下漂浮 */
    let fy = d.y - t * d.sp * 0.25;
    fy = (((fy + 2.5) % 10.5) + 10.5) % 10.5 - 2.5;
    arr[i * 3 + 1] = fy + Math.sin(t * d.sp * 0.7 + d.ph * 2) * d.ay;
    arr[i * 3 + 2] = d.z + Math.cos(t * d.sp * 0.8 + d.ph) * d.ax;
  }
  dustGeo.attributes.position.needsUpdate = true;
});

/* ---------- 照片墙（场景3） ---------- */
const photoWall = buildPhotoWall(cfg.photoWallCols, cfg.photoWallRows);
photoWall.position.set(0, 0, stationZ(3));
scene.add(photoWall);
photoWall.userData.frames.forEach((f) => {
  f.traverse((o) => { if (o.isMesh) { o.userData.kind = "frame"; o.userData.slot = f.userData.slot; clickable.push(o); } });
  fontTexturedMats.push(f.userData.photoMat);
});
const wallFrames = photoWall.userData.frames;
const wallStep = photoWall.userData.step;   /* 每张相框角距 (2π/15) */
/* 照片材质不透明：杜绝重影与半透明透色 */
wallFrames.forEach((f) => { f.userData.photoMat.transparent = false; f.userData.photoMat.opacity = 1; });

/* 角度归一化到 [-π, π] */
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* ===== 画廊圆环轮播：自动流转永不中断（触碰/滑动不打断，始终跟随节奏轮流展示） =====
   hold : C 位驻足 RING_HOLD 秒
   move : ease-in-out cubic 缓动流转到下一相框（RING_MOVE 秒，起转/停转自然加减速） */
const RING_HOLD = 2.0;
const RING_MOVE = 1.8;
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

const ringControllers = [];
function createRing(station, group, frames, step) {
  frames.forEach((f) => { f.userData.photoMat.transparent = false; f.userData.photoMat.opacity = 1; });
  const ring = { station, group, frames, step, st: {
    cur: 0, mode: "hold", holdUntil: 0, moveFrom: 0, moveTo: 0, moveStart: 0,
  } };
  ringControllers.push(ring);
  return ring;
}
function ringReset(ring) {
  Object.assign(ring.st, {
    cur: 0, mode: "hold", holdUntil: 0, moveFrom: 0, moveTo: 0, moveStart: 0,
  });
  ring.group.rotation.y = 0;
}
function ringUpdate(ring, t) {
  const cs = ring.st;
  if (activeStation === ring.station) {
    if (cs.mode === "hold") {
      if (cs.holdUntil === 0) cs.holdUntil = t + RING_HOLD;  /* 首次进入：先驻足 2 秒 */
      if (t >= cs.holdUntil) {                              /* 驻足结束 → 顺时针缓动流转 */
        cs.mode = "move"; cs.moveFrom = cs.cur;
        cs.moveTo = cs.cur - ring.step; cs.moveStart = t;
      }
    } else {
      const p = App.clamp((t - cs.moveStart) / RING_MOVE, 0, 1);
      cs.cur = cs.moveFrom + (cs.moveTo - cs.moveFrom) * easeInOutCubic(p);
      if (p >= 1) { cs.cur = cs.moveTo; cs.mode = "hold"; cs.holdUntil = t + RING_HOLD; }
    }
  }
  ring.group.rotation.y = cs.cur;

  /* 逐相框：正前放大提亮（焦点），两侧/背后渐隐（景深） */
  for (const f of ring.frames) {
    const u = f.userData;
    const d = Math.abs(wrapPi(u.angle + cs.cur));
    const focus = THREE.MathUtils.clamp(1 - d / 0.55, 0, 1);
    const focusE = focus * focus * (3 - 2 * focus);
    const vis = THREE.MathUtils.clamp(1 - (d - 1.05) / 1.1, 0, 1);

    f.position.y = u.baseY + Math.sin(t * u.speed + u.phase) * 0.08;
    f.scale.setScalar(0.92 + 0.18 * focusE);
    /* 照片长宽比适配：画框整体缩放以匹配照片比例（contain，无黑边） */
    const as = u.aspectScale || { x: 1, y: 1 };
    f.scale.x *= as.x;
    f.scale.y *= as.y;
    /* 强制不透明：正面照片 100% 实心，背面/侧面照片直接隐藏（无重影/无半透明） */
    u.photoMat.opacity = 1;
    f.visible = vis > 0.01;
  }
}
tickers.push((t) => { ringControllers.forEach((r) => ringUpdate(r, t)); });

/* ---------- 画廊环（场景3）：自动流转，永不中断 ---------- */
const galleryRing = createRing(3, photoWall, wallFrames, wallStep);
App.rings = { gallery: galleryRing };  /* 调试接口 */

/* ---------- 信息卡（场景4） ---------- */
const infoCard = buildInfoCard();
infoCard.position.set(0, 0.5, stationZ(4));
scene.add(infoCard);

/* ---------- RSVP卡（场景5） ---------- */
const rsvpCard = buildRsvpCard();
rsvpCard.position.set(0, 0.5, stationZ(5));
scene.add(rsvpCard);

/* ---------- 结尾场景（场景6） ---------- */
const ending = buildEndingScene();
ending.position.set(0, 0, stationZ(6));
scene.add(ending);

/* ---------- 前景：花瓣 + 金屑 ---------- */
const petalGeo = new THREE.PlaneGeometry(0.3, 0.3);
const petalMat = new THREE.MeshBasicMaterial({
  map: makePetalTexture(), transparent: true, side: THREE.DoubleSide,
  depthWrite: false, opacity: 0.9,
});
const petals = new THREE.InstancedMesh(petalGeo, petalMat, PETAL_COUNT);
petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
petals.frustumCulled = false;
scene.add(petals);

const petalData = [];
const xRange = App.isMobile ? 3.2 : 7.5;
for (let i = 0; i < PETAL_COUNT; i++) {
  petalData.push({
    x: (rnd() * 2 - 1) * xRange, y: -2 + rnd() * 11, z: 14 - rnd() * 130,
    speed: 0.4 + rnd() * 0.5, sway: 0.4 + rnd() * 0.7, phase: rnd() * 6.28,
    rot: rnd() * 6.28, rotSpeed: (rnd() - 0.5) * 1.4, scale: 0.6 + rnd() * 0.7,
  });
}
const dummy = new THREE.Object3D();

const fleckMat = new THREE.PointsMaterial({
  map: makeFleckTexture(), transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false,
  size: 0.2, sizeAttenuation: true, color: 0xf0d68a, opacity: 0.75,
});
const fleckGeo = new THREE.BufferGeometry();
const fleckPos = new Float32Array(FLECK_COUNT * 3);
const fleckData = [];
for (let i = 0; i < FLECK_COUNT; i++) {
  const d = { x: (rnd() * 2 - 1) * xRange, y: -2 + rnd() * 11, z: -6 - rnd() * 110, speed: 0.25 + rnd() * 0.35, phase: rnd() * 6.28 };
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
    p.z += dt * 0.5;
    p.rot += p.rotSpeed * dt;
    if (p.y < -3 || p.z > camZ + 6) resetParticle(p, camZ, true);
    const x = p.x + Math.sin(t * p.sway + p.phase) * 0.6;
    /* 景深：近景花瓣大而清晰，远景花瓣小而淡 */
    const depth = Math.max(0, camZ - p.z);
    const df = THREE.MathUtils.clamp(1.55 - depth * 0.013, 0.4, 1.5);
    dummy.position.set(x, p.y, p.z);
    dummy.rotation.set(p.rot * 0.6, p.rot, Math.sin(t + p.phase) * 0.7);
    dummy.scale.setScalar(p.scale * df);
    dummy.updateMatrix();
    petals.setMatrixAt(i, dummy.matrix);
  }
  petals.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < FLECK_COUNT; i++) {
    const p = fleckData[i];
    p.y -= p.speed * dt;
    p.z += dt * 0.45;
    if (p.y < -3 || p.z > camZ + 6) resetParticle(p, camZ, true);
    fleckPos[i * 3] = p.x + Math.sin(t * 0.7 + p.phase) * 0.4;
    fleckPos[i * 3 + 1] = p.y;
    fleckPos[i * 3 + 2] = p.z;
  }
  fleckGeo.attributes.position.needsUpdate = true;
});

/* ---------- 暖光光斑（近景视差） ---------- */
const bokehList = [];
const bokehTex = makeGlowTexture(128, [255, 220, 160]);
const BOKEH_COUNT = App.isMobile ? 6 : 10;
for (let i = 0; i < BOKEH_COUNT; i++) {
  const mat = new THREE.SpriteMaterial({
    map: bokehTex, transparent: true, opacity: 0.04 + rnd() * 0.05,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const sp = new THREE.Sprite(mat);
  const d = { ox: (rnd() * 2 - 1) * (App.isMobile ? 2.4 : 4.4), oy: -1 + rnd() * 4.4, oz: 4 + rnd() * 9, phase: rnd() * 6.28, baseOp: mat.opacity, drift: 0.2 + rnd() * 0.3 };
  sp.scale.set(1.1 + rnd() * 2.2, 1.1 + rnd() * 2.2, 1);
  scene.add(sp);
  bokehList.push({ sp, d });
}
tickers.push((t) => {
  const cz = camera.position.z;
  bokehList.forEach(({ sp, d }) => {
    sp.position.set(camera.position.x * 0.7 + d.ox + Math.sin(t * d.drift + d.phase) * 0.5, d.oy + Math.sin(t * d.drift * 0.8 + d.phase) * 0.4, cz - d.oz);
    sp.material.opacity = d.baseOp * (0.75 + 0.25 * Math.sin(t * 0.6 + d.phase));
  });
});

/* ---------- 前景失焦玫瑰花瓣（Bokeh 色块，相机跟随左右下角，极慢飘落） ---------- */
const fgBokeh = new THREE.Group();
const bokehPetalTex = makeBokehTexture(256);
const FG_PETALS = [];
const fgConf = [
  { x: -1.35, y: -1.55, z: -3.4, s: 1.6, pink: true },
  { x: -2.15, y: -1.2, z: -4.2, s: 2.15, pink: false },
  { x: -1.0, y: -1.85, z: -2.8, s: 1.3, pink: false },
  { x: -2.6, y: -0.7, z: -5.0, s: 1.85, pink: true },
  { x: 1.35, y: -1.6, z: -3.4, s: 1.6, pink: false },
  { x: 2.15, y: -1.15, z: -4.2, s: 2.25, pink: true },
  { x: 1.0, y: -1.85, z: -2.8, s: 1.25, pink: true },
  { x: 2.65, y: -0.65, z: -5.0, s: 1.9, pink: false },
];
fgConf.forEach((c, i) => {
  const mat = new THREE.SpriteMaterial({
    map: bokehPetalTex, color: c.pink ? 0xffdfe6 : 0xffffff,
    transparent: true, opacity: 0.72, depthTest: false, depthWrite: false, fog: false,
  });
  mat.rotation = (i % 2 ? 1 : -1) * 0.6;
  const sp = new THREE.Sprite(mat);
  sp.scale.set(c.s, c.s * 1.08, 1);
  sp.position.set(c.x, c.y, c.z);
  sp.renderOrder = 998;
  fgBokeh.add(sp);
  FG_PETALS.push({
    sp, mat, bx: c.x, by: c.y, ph: i * 1.3,
    rot: (i % 2 ? 1 : -1) * (0.12 + rnd() * 0.08),   /* 0.1~0.2°/帧 的缓转（rad/秒） */
  });
});
camera.add(fgBokeh);
scene.add(camera);
tickers.push((t, dt) => {
  FG_PETALS.forEach((p) => {
    p.mat.rotation += p.rot * dt;   /* 极慢旋转（约0.15°/帧） */
    p.sp.position.y = p.by + Math.sin(t * 0.25 + p.ph) * 0.08;  /* 轻微飘落摆动 */
    p.sp.position.x = p.bx + Math.sin(t * 0.18 + p.ph * 1.7) * 0.05;
  });
});

/* ---------- 远景景深虚化光斑（固定在世界深处，大面积低透明度，填充空白营造空气感） ---------- */
const farHazeList = [];
const hazeTexGold = makeGlowTexture(128, [255, 226, 165]);
const hazeTexPink = makeGlowTexture(128, [240, 196, 176]);
const HAZE_COUNT = App.isMobile ? 10 : 16;
for (let i = 0; i < HAZE_COUNT; i++) {
  const isPink = rnd() > 0.6;
  const mat = new THREE.SpriteMaterial({
    map: isPink ? hazeTexPink : hazeTexGold, transparent: true,
    opacity: 0.05 + rnd() * 0.07,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  });
  const sp = new THREE.Sprite(mat);
  const sc = 4 + rnd() * 7; /* 远景大而虚 */
  sp.scale.set(sc, sc, 1);
  const d = {
    x: (rnd() * 2 - 1) * (App.isMobile ? 4 : 8),
    y: -2 + rnd() * 9,
    z: 6 - rnd() * 120,
    phase: rnd() * 6.28, baseOp: mat.opacity, drift: 0.12 + rnd() * 0.18,
  };
  sp.position.set(d.x, d.y, d.z);
  scene.add(sp);
  farHazeList.push({ sp, d });
}
tickers.push((t) => {
  farHazeList.forEach(({ sp, d }) => {
    sp.position.x = d.x + Math.sin(t * d.drift + d.phase) * 1.2;
    sp.position.y = d.y + Math.cos(t * d.drift * 0.7 + d.phase) * 0.8;
    sp.material.opacity = d.baseOp * (0.7 + 0.3 * Math.sin(t * 0.4 + d.phase));
  });
});

tickers.push((t) => {
  camLight.intensity = (18 + Math.sin(t * 1.3) * 1.5) * introLight;
  warmLight.intensity = (10 + Math.cos(t * 1.1) * 1.2) * introLight;
});

/* ================= 指针视差 / 射线 ================= */
const pointer = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
raycaster.far = 24;
const ndc = new THREE.Vector2();
let downPos = null;

window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
});
window.addEventListener("pointerdown", (e) => { downPos = { x: e.clientX, y: e.clientY }; });
window.addEventListener("pointerup", (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
  downPos = null;
  if (dx * dx + dy * dy > 100) return;
  if (App.isOverlayOpen() || introState.phase !== "ready") return;
  if (e.target && e.target.closest && e.target.closest("button, a, input, textarea, select, .hud, #nav-dots, .modal, .lightbox, .map-overlay")) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (!hits.length) return;
  const { kind, slot } = hits[0].object.userData;
  if (kind === "envelope") openEnvelope();
  else if (kind === "frame" && slot) onFrameClick(slot);
});

/* ================= 信封开场 ================= */
function openEnvelope() {
  if (opening || opened || introState.phase !== "ready") return;
  opening = true;
  App.$("#open-hint").style.opacity = "0";
  try { App.music.play(); } catch (e) {}

  const ud = envelope.userData;
  const { flap, seal, fadeMats } = ud;

  /* ① 火漆印章碎裂消散（缩放+淡出） */
  seal.material.transparent = true;
  animTo(0, 0.5, [
    { get: () => seal.scale.x, set: (v) => seal.scale.setScalar(v), to: 1.6 },
    { get: () => seal.material.opacity, set: (v) => { seal.material.opacity = v; }, to: 0 },
  ], () => { seal.visible = false; });

  /* ② 封盖翻开 */
  animTo(0.35, 0.7, [
    { get: () => flap.rotation.x, set: (v) => { flap.rotation.x = v; }, to: -2.2 },
  ]);

  /* ③ 相机推进 + 信封淡出 */
  fadeMats.forEach((m) => { m.transparent = true; });
  animTo(1.2, 1.3, [
    { get: () => camera.position.z, set: (v) => { camera.position.z = v; }, to: CAM_START - SPACING },
  ]);
  animTo(1.8, 0.9, fadeMats.map((m) => ({
    get: () => m.opacity, set: (v) => { m.opacity = v; }, to: 0,
  })), () => {
    opened = true; opening = false;
    envelope.visible = false;
    document.body.classList.add("opened");
    App.$("#scroll-hint").hidden = false;
    scroll.target = scroll.cur = 1;
    if (danmaku) danmaku.start();
  });
}

/* ================= 滚动 / 章节驱动 ================= */
const sections = App.$$(".invite-section");
const dots = App.$$("#nav-dots .dot");
let activeStation = 0;
const shownStations = new Set();

function goTo(i) { if (!opened) return; scroll.target = App.clamp(i, 0, STATIONS - 1); }

/* 画廊（章节 3）相框群自动流转、永不中断；横滑/触摸均不影响，只有纵向滑动切换章节 */

window.addEventListener("wheel", (e) => {
  if (!opened || App.isOverlayOpen()) return;
  e.preventDefault();
  scroll.target = App.clamp(scroll.target + e.deltaY * 0.0016, 0, STATIONS - 1);
}, { passive: false });

let touchStart = null;
window.addEventListener("touchstart", (e) => {
  if (App.isOverlayOpen()) return;
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, s0: scroll.target };
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!opened || !touchStart || App.isOverlayOpen()) return;
  const dy = e.touches[0].clientY - touchStart.y;
  if (Math.abs(dy) > 6) {
    /* 纵向：锚点固定，总位移 1:1 映射（禁止逐事件累加，防止轻滑飞多页）；
       画廊旋转不受任何触摸影响 */
    e.preventDefault();
    scroll.target = App.clamp(touchStart.s0 + (-dy) * 0.0042, 0, STATIONS - 1);
  }
}, { passive: false });

window.addEventListener("touchend", () => { touchStart = null; }, { passive: true });

window.addEventListener("keydown", (e) => {
  if (App.isOverlayOpen()) return;
  if (["ArrowDown", "PageDown", " "].includes(e.key)) goTo(Math.round(scroll.target) + 1);
  if (["ArrowUp", "PageUp"].includes(e.key)) goTo(Math.round(scroll.target) - 1);
});

dots.forEach((d) => d.addEventListener("click", () => { goTo(+d.dataset.go); }));

function activateStation(i) {
  if (activeStation === i && shownStations.has(i)) return;
  activeStation = i;
  sections.forEach((s, idx) => s.classList.toggle("active", idx === i));
  dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
  if (i === 3) { ringReset(galleryRing); loadWallPhotos(); }
  document.body.classList.toggle("on-ring", activeStation === 3);

  if (!shownStations.has(i)) {
    shownStations.add(i);
    sections[i].classList.add("in");
    App.$$("[data-split]", sections[i]).forEach(splitChars);
  }
  /* 陀螺仪请求（详情页首次进入） */
  if (i === 4 && !gyroReady && typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
    /* 需用户手势，延迟到下次交互 */
  }
}

/* ================= 逐字淡入 ================= */
function splitChars(el) {
  if (el.dataset.done) return;
  const text = el.textContent;
  let i = 0;
  el.innerHTML = [...text].map((c) =>
    c === "\n" ? "<br>" : `<span class="fade-char" style="--i:${++i}">${c}</span>`
  ).join("");
  el.dataset.done = "1";
}

/* ================= 婚礼信息渲染 ================= */
let info = App.store.get("info", App.defaults.info);
function renderInfo() {
  App.$$('[data-name="groom"]').forEach((el) => { el.textContent = info.groom; });
  App.$$('[data-name="bride"]').forEach((el) => { el.textContent = info.bride; });
  const map = { date: info.date, time: info.time, venue: info.venue, address: info.address };
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
  App.$("#in-time").value = info.time;
  App.$("#in-venue").value = info.venue;
  App.$("#in-address").value = info.address;
  App.openModal("info-modal");
});
App.$("#info-save").addEventListener("click", () => {
  info = {
    groom: App.$("#in-groom").value.trim() || App.defaults.info.groom,
    bride: App.$("#in-bride").value.trim() || App.defaults.info.bride,
    date: App.$("#in-date").value.trim() || App.defaults.info.date,
    time: App.$("#in-time").value.trim() || App.defaults.info.time,
    venue: App.$("#in-venue").value.trim() || App.defaults.info.venue,
    address: App.$("#in-address").value.trim() || App.defaults.info.address,
  };
  App.store.set("info", info);
  renderInfo();
  App.$$("[data-split]").forEach((el) => { el.dataset.done = ""; splitChars(el); });
  App.closeModal("info-modal");
  App.toast("婚礼信息已更新");
});

/* ================= 照片：上传 / 灯箱 ================= */
const photoInput = App.$("#input-photos");
let pendingSlot = 1;
const slotUrls = {};
const allFrames = [...wallFrames];
const slotToFrame = {};
allFrames.forEach((f) => { slotToFrame[f.userData.slot] = f; });

function setPhoto(slot, blob) {
  const frame = slotToFrame[slot];
  if (!frame) return;
  if (slotUrls[slot]) URL.revokeObjectURL(slotUrls[slot]);
  const url = URL.createObjectURL(blob);
  slotUrls[slot] = url;
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    enrichTexture(tex);
    /* object-fit: contain —— 缩放整个画框以匹配照片长宽比，
       照片完整无裁切、无拉伸、无黑边。画框与照片共同缩放，
       杜绝深色背板外露造成的"黑边/黑条"。 */
    const photo = frame.userData.photo;
    photo.scale.set(1, 1, 1);
    const fw = photo.geometry.parameters.width;
    const fh = photo.geometry.parameters.height;
    const frameA = fw / fh;
    const img = tex.image;
    tex.repeat.set(1, 1);
    tex.center.set(0.5, 0.5);
    if (img && img.width && img.height) {
      const imgA = img.width / img.height;
      if (imgA > frameA) {
        frame.userData.aspectScale = { x: 1, y: frameA / imgA };
      } else {
        frame.userData.aspectScale = { x: imgA / frameA, y: 1 };
      }
    } else {
      frame.userData.aspectScale = { x: 1, y: 1 };
    }
    const old = frame.userData.photoMat.map;
    frame.userData.photoMat.map = tex;
    frame.userData.photoMat.needsUpdate = true;
    if (old) old.dispose();
  });
  frame.userData.filled = true;
}

function onFrameClick(slot) {
  const frame = slotToFrame[slot];
  if (frame && frame.userData.filled) openLightbox(slot);
  else { pendingSlot = slot; photoInput.click(); }
}

let wallLoaded = false;
async function loadWallPhotos() {
  if (wallLoaded) return;
  wallLoaded = true;
  for (let slot = 1; slot <= cfg.photoSlots; slot++) {
    try {
      if (slotToFrame[slot] && slotToFrame[slot].userData.filled) continue;
      const blob = await getPhotoBlob(slot);
      if (blob) setPhoto(slot, blob);
    } catch (e) {}
  }
}

photoInput.addEventListener("change", async () => {
  const files = Array.from(photoInput.files || []);
  photoInput.value = "";
  if (!files.length) return;
  let slot = pendingSlot;
  for (const file of files) {
    while (slot <= cfg.photoSlots && slotToFrame[slot] && slotToFrame[slot].userData.filled) slot++;
    if (slot > cfg.photoSlots) break;
    try {
      const { blob } = await App.loadImageRaw(file);
      await App.db.putFile(cfg.photoKey(slot), blob);
      setPhoto(slot, blob);
      App.toast(`第 ${slot} 张照片已上传`);
    } catch (e) { App.toast("上传失败，请换一张试试"); }
    slot++;
  }
});

/* 灯箱 */
const lightbox = App.$("#lightbox");
const lbImg = App.$("#lb-img");
const lbCounter = App.$("#lb-counter");
let lbList = [], lbIdx = 0;
function openLightbox(slot) {
  lbList = allFrames.filter((f) => f.userData.filled).map((f) => f.userData.slot);
  lbIdx = lbList.indexOf(slot);
  if (lbIdx < 0) lbIdx = 0;
  renderLb();
  lightbox.classList.add("open");
}
function renderLb() {
  const slot = lbList[lbIdx];
  lbImg.src = slotUrls[slot] || "";
  lbCounter.textContent = lbList.length ? `${lbIdx + 1} / ${lbList.length}` : "";
}
App.$("#lb-prev").addEventListener("click", () => { if (lbList.length) { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; renderLb(); } });
App.$("#lb-next").addEventListener("click", () => { if (lbList.length) { lbIdx = (lbIdx + 1) % lbList.length; renderLb(); } });
App.$("#lb-close").addEventListener("click", () => lightbox.classList.remove("open"));
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.classList.remove("open"); });

/* ================= 地图浮层 ================= */
const mapOverlay = App.$("#map-overlay");
App.$("#map-btn").addEventListener("click", () => mapOverlay.classList.add("open"));
mapOverlay.addEventListener("click", (e) => { if (e.target === mapOverlay) mapOverlay.classList.remove("open"); });
App.$("#map-close").addEventListener("click", () => mapOverlay.classList.remove("open"));

/* ================= 陀螺仪（信息卡倾斜） ================= */
let gyroReady = false;
let gyroBeta = 0, gyroGamma = 0;
function onGyro(e) {
  if (e.beta != null) gyroBeta = (e.beta / 180) * Math.PI;
  if (e.gamma != null) gyroGamma = (e.gamma / 90) * Math.PI;
}
App.$("#info-card-tap").addEventListener("click", async () => {
  if (gyroReady) return;
  if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
    try {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r === "granted") { gyroReady = true; window.addEventListener("deviceorientation", onGyro); App.toast("陀螺仪已启用"); }
    } catch (e) {}
  } else {
    gyroReady = true; window.addEventListener("deviceorientation", onGyro);
  }
});
tickers.push(() => {
  const targetX = gyroReady ? App.clamp(gyroBeta * 0.3, -0.09, 0.09) : pointer.y * 0.05;
  const targetY = gyroReady ? App.clamp(gyroGamma * 0.3, -0.09, 0.09) : -pointer.x * 0.05;
  infoCard.rotation.x += (targetX - infoCard.rotation.x) * 0.05;
  infoCard.rotation.y += (targetY - infoCard.rotation.y) * 0.05;
  rsvpCard.rotation.x += (targetX * 0.5 - rsvpCard.rotation.x) * 0.05;
  rsvpCard.rotation.y += (targetY * 0.5 - rsvpCard.rotation.y) * 0.05;
});

/* ================= RSVP 提交 ================= */
App.$("#rsvp-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = App.$("#rsvp-name").value.trim();
  const count = App.$("#rsvp-count").value;
  const msg = App.$("#rsvp-message").value.trim();
  /* 对勾动画 */
  const btn = App.$("#rsvp-submit");
  btn.classList.add("submitted");
  App.toast(cfg.text.rsvpThanks);
  /* 金色粒子绽放 */
  burstGoldParticles();
  /* 嘉宾祝福实时飘屏 */
  if (danmaku) {
    const blessing = (name ? name + "：" : "") + (msg || "祝新婚快乐，百年好合！");
    danmaku.push(blessing);
  }
  setTimeout(() => goTo(6), 1500);
});

/* 金色粒子绽放（临时 InstancedMesh） */
let burstMesh = null, burstData = [], burstT = 0;
function burstGoldParticles() {
  if (burstMesh) { scene.remove(burstMesh); burstMesh.geometry.dispose(); }
  const geo = new THREE.PlaneGeometry(0.18, 0.18);
  const mat = new THREE.MeshBasicMaterial({
    map: makeFleckTexture(), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
  });
  burstMesh = new THREE.InstancedMesh(geo, mat, 50);
  burstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(burstMesh);
  burstData = [];
  const pos = new THREE.Vector3(0, 0.5, stationZ(5));
  for (let i = 0; i < 50; i++) {
    const theta = rnd() * Math.PI * 2, phi = rnd() * Math.PI;
    const sp = 3 + rnd() * 4;
    burstData.push({
      x: pos.x, y: pos.y, z: pos.z,
      vx: Math.sin(phi) * Math.cos(theta) * sp,
      vy: Math.cos(phi) * sp + 2,
      vz: Math.sin(phi) * Math.sin(theta) * sp,
      life: 0, scale: 0.5 + rnd() * 0.8,
    });
  }
  burstT = 0;
}
tickers.push((_, dt) => {
  if (!burstMesh) return;
  burstT += dt;
  const d = new THREE.Object3D();
  let alive = false;
  for (let i = 0; i < 50; i++) {
    const p = burstData[i]; if (!p) continue;
    p.life += dt;
    if (p.life > 2) { d.scale.setScalar(0); d.updateMatrix(); burstMesh.setMatrixAt(i, d.matrix); continue; }
    alive = true;
    p.vy -= 4 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.scale * Math.max(0, 1 - p.life / 2);
    d.position.set(p.x, p.y, p.z);
    d.rotation.z = p.life * 3;
    d.scale.setScalar(s);
    d.updateMatrix();
    burstMesh.setMatrixAt(i, d.matrix);
  }
  burstMesh.instanceMatrix.needsUpdate = true;
  burstMesh.material.opacity = Math.max(0, 1 - burstT / 2);
  if (!alive) { scene.remove(burstMesh); burstMesh.geometry.dispose(); burstMesh = null; }
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
  } catch (e) { App.toast("音乐上传失败"); }
});

/* 返回首页 */
App.$("#home-btn").addEventListener("click", () => {
  ringControllers.forEach(ringReset);
  envelope.visible = true;
  envelope.userData.fadeMats.forEach((m) => { m.opacity = 1; m.transparent = false; });
  goTo(0);
  setTimeout(() => { opened = false; envelope.visible = true; }, 2000);
});

/* 取某槽位照片：优先用户上传（IndexedDB），无则回退内置默认婚纱照 */
async function getPhotoBlob(slot) {
  try {
    const blob = await App.db.getFile(cfg.photoKey(slot));
    if (blob) return blob;
  } catch (e) {}
  const def = cfg.defaultPhotos && cfg.defaultPhotos[slot - 1];
  if (def) {
    try { return await (await fetch(def)).blob(); } catch (e) {}
  }
  return null;
}

/* ================= 持久素材预加载（开场前全部缓存，避免进入后马赛克） ================= */
const photosReady = (async function restore() {
  for (let slot = 1; slot <= cfg.photoSlots; slot++) {
    try { const blob = await getPhotoBlob(slot); if (blob) setPhoto(slot, blob); } catch (e) {}
  }
})();

/* ================= 加载闸门：字体 + 照片缓存 + 最短展示（Logo 呼吸一轮）后开场 ================= */
const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
const minLogoTime = new Promise((r) => setTimeout(r, 2800));
Promise.race([
  Promise.all([fontsReady, photosReady, minLogoTime]),
  new Promise((r) => setTimeout(r, 9000)),   /* 硬上限：任何环节卡住也不困在加载页 */
]).then(() => { if (introState.phase === "loading") beginCinema(); });

/* ================= 字体就绪重绘 ================= */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    fontTexturedMats.forEach((mat) => { if (mat && mat.map) mat.map.needsUpdate = true; });
  });
}

/* ================= 尺寸 / 性能 ================= */
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applyQuality(qualityLevel);
}
window.addEventListener("resize", App.debounce(resize, 150));
resize();

let fpsFrames = 0, fpsTime = performance.now(), degradeGrace = 2, lastFps = 0;
function autoDegrade(now) {
  if (document.hidden) { fpsFrames = 0; fpsTime = now; return; }  /* 标签隐藏/后台 rAF 暂停，不计 FPS，避免误降级 */
  fpsFrames++;
  if (now - fpsTime > 3000) {
    const fps = (fpsFrames * 1000) / (now - fpsTime);
    lastFps = fps;
    fpsFrames = 0; fpsTime = now;
    if (degradeGrace > 0) { degradeGrace--; return; }
    if (qualityLevel === 0 && fps < 50) applyQuality(1);
    else if (qualityLevel === 1 && fps < 40) applyQuality(2);
  }
}

/* ================= 主循环 ================= */
let lastFrame = performance.now(), elapsed = 0, lastStation = -1, lastTickRun = 0;

function tick() {
  requestAnimationFrame(tick);
  const now0 = performance.now();
  if (now0 - lastTickRun < 16) return;
  lastTickRun = now0;
  setTimeout(() => { if (performance.now() - lastTickRun > 140) tick(); }, 150);

  const now = now0;
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  elapsed += dt;
  const t = elapsed;

  scroll.cur += (scroll.target - scroll.cur) * 0.075;
  if (opened) camera.position.z = camZFor(scroll.cur);
  else if (introState.phase === "cinema") {
    /* 开场 B 阶段：镜头由远缓推至信封（ease-in-out，物理惯性） */
    const b = introSeg(elapsed - introState.t0, 1.5, 3.1);
    camera.position.z = CAM_START + 5 * (1 - b);
  }
  else if (!opening) camera.position.z = CAM_START;

  /* 圆环轮播（画廊/爱情故事）由 ringControllers 状态机驱动（ease-in-out 自动流转） */

  /* 殿堂场景左右视角 */
  if (activeStation === 2) {
    hall.rotation.y = App.clamp(pointer.x * 0.26, -0.26, 0.26);
  }

  camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04;
  camera.position.y += ((pointer.y * 0.15) - camera.position.y) * 0.04;
  camera.lookAt(pointer.x * 0.5, 0.3, camera.position.z - 9);

  camLight.position.set(0, 2.4, camera.position.z + 4);
  warmLight.position.set(0, -1.6, camera.position.z + 2.5);

  /* 左右聚光灯随相机推进，始终照亮当前章节两侧的相框/立柱 */
  for (const { sp, tgt, side } of spotLights) {
    sp.position.set(side * 9, 7.5, camera.position.z + 5);
    tgt.position.set(side * 2.6, -1.2, camera.position.z - 9);
    tgt.updateMatrixWorld();
  }

  /* 画廊(3)→详情(4)：相机越过相框圆环远边（scroll≈3.72）后再激活详情页，
     保证"穿过画框群"之后详情卡才出现（反向返回同理） */
  let si = Math.round(scroll.cur);
  if (scroll.cur > 3 && scroll.cur < 4) si = scroll.cur >= 3.75 ? 4 : 3;
  si = App.clamp(si, 0, STATIONS - 1);
  if (si !== lastStation) { lastStation = si; if (opened) activateStation(si); }

  tickers.forEach((fn) => fn(t, dt));
  autoDegrade(performance.now());
  composer.render();
}

/* 启动前纹理高清增强 */
scene.traverse((o) => {
  const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
  if (mats) mats.forEach((m) => { ["map", "emissiveMap"].forEach((k) => { if (m && m[k] && m[k].isTexture) enrichTexture(m[k]); }); });
});

/* ================= 顶部祝福弹幕 ================= */
const danmaku = initDanmaku(cfg);
App.danmaku = danmaku; /* 对外数据接口：App.danmaku.push("祝福") */

renderInfo();
activateStation(0);
tick();
window.__cardBootOK = true;
canvas.dataset.engine = "three";
const fallbackEl = document.getElementById("load-fallback");
if (fallbackEl) { fallbackEl.hidden = true; fallbackEl.style.display = ""; }

window.__invite = {
  open: openEnvelope, go: goTo,
  playIntro: beginCinema, skipIntro,
  get phase() { return introState.phase; },
  get opened() { return opened; },
  get station() { return activeStation; },
  get dpr() { return renderer.getPixelRatio(); },
  get quality() { return qualityLevel; },
  setQuality: applyQuality,
  get fps() { return Math.round(lastFps); },
  /* 调试抓图：强制渲染一帧 → 480x270 缩略 jpeg dataURL（供本地落盘人工/自动核验） */
  grabThumb() {
    composer.render();
    const s = document.createElement("canvas"); s.width = 480; s.height = 270;
    const x = s.getContext("2d");
    x.drawImage(canvas, 0, 0, s.width, s.height);
    return s.toDataURL("image/jpeg", 0.7);
  },
  get ringMode() { return activeStation === 3; },
};
