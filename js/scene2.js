/* ============ scene2.js · 3D 情书页（厚信纸 + CSS3D 文字 + 3D 花瓣） ============ */
import world from "./world.js";

const App = window.App;
const THREE = world.THREE;
const gsap = window.gsap;

let zone = null;
let letterGroup = null;
let textObj = null;      // CSS3DObject
let letterTextEl = null; // CSS3D 内文字元素（直接引用，避免未挂载时查不到）
let letterCaretEl = null;
let letterBodyEl = null;
let halo = null;
let petalsMesh = null, starsMesh = null, fxGroup = null;
let pMeta = null, sMeta = null;
const dummy = new THREE.Object3D();
const tilt = { x: 0, y: 0 };

let fxMode = "petal";

/* ---------- 打字机 ---------- */
let typeToken = 0;
let typedKey = null;

function currentText() {
  return App.store.get("loveText", App.defaults.love);
}

async function typeText(el, text) {
  if (!el) return;
  const token = ++typeToken;
  el.textContent = "";
  if (letterCaretEl) letterCaretEl.classList.remove("off");
  for (let i = 0; i < text.length; i++) {
    if (token !== typeToken) return;
    el.textContent += text[i];
    if (i % 4 === 0 && letterBodyEl) letterBodyEl.scrollTop = letterBodyEl.scrollHeight;
    const ch = text[i];
    let delay = 42 + Math.random() * 46;
    if ("，。、！？…—；：".includes(ch)) delay += 200;
    if (ch === "\n") delay += 130;
    await new Promise((r) => setTimeout(r, delay));
  }
  if (token === typeToken && letterCaretEl) setTimeout(() => letterCaretEl.classList.add("off"), 1600);
}

function retype() {
  const text = currentText();
  typedKey = text;
  typeText(letterTextEl, text);
}

/* ---------- 信纸（带厚度的弯曲纸） ---------- */
function buildLetter() {
  letterGroup = new THREE.Group();
  zone.add(letterGroup);

  const W = 6.4, H = 4.6;
  const shape = world.roundedRectShape(W, H, 0.25);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false, curveSegments: 10 });

  /* 纸张卷曲：边缘沿 Z 轴轻微抬起 + 纵向波浪 */
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const edge = Math.pow(Math.abs(x) / (W / 2), 3) * 0.22;
    const wave = Math.sin((y / H) * Math.PI * 1.2) * 0.05;
    pos.setZ(i, pos.getZ(i) + edge + wave);
  }
  geo.computeVertexNormals();

  /* 米白纸 + 次表面散射近似（sheen 透光感） */
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xfffcf0,
    roughness: 0.85,
    metalness: 0,
    sheen: 0.55,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0xffd9c4),
    emissive: new THREE.Color(0xffe9d8),
    emissiveIntensity: 0.06,
  });
  const paper = new THREE.Mesh(geo, mat);
  paper.castShadow = true;
  paper.receiveShadow = true;
  letterGroup.add(paper);

  /* 胶带两枚 */
  const tapeMat = new THREE.MeshStandardMaterial({
    color: 0xf3d9c9, roughness: 0.5, metalness: 0.05,
    transparent: true, opacity: 0.55,
  });
  const tapeGeo = new THREE.BoxGeometry(0.7, 0.22, 0.02);
  const t1 = new THREE.Mesh(tapeGeo, tapeMat);
  t1.position.set(-W * 0.32, H / 2 - 0.05, 0.12);
  t1.rotation.z = 0.5;
  const t2 = new THREE.Mesh(tapeGeo, tapeMat);
  t2.position.set(W * 0.32, H / 2 - 0.05, 0.12);
  t2.rotation.z = -0.5;
  letterGroup.add(t1, t2);

  /* CSS3D 文字（悬浮于信纸上方 0.1） */
  const div = document.createElement("div");
  div.className = "letter3d";
  div.innerHTML = `
    <h2 class="paper-title">致 最爱的你</h2>
    <div class="letter-body" id="letter-body3d"><span id="letter-text"></span><span class="caret" id="letter-caret"></span></div>
    <p class="paper-sign">—— 永远爱你的那颗心</p>`;
  /* 直接持有元素引用：CSS3DRenderer 首帧渲染前元素不在 DOM 中 */
  letterTextEl = div.querySelector("#letter-text");
  letterCaretEl = div.querySelector("#letter-caret");
  letterBodyEl = div.querySelector("#letter-body3d");
  const CSS3DObjectCls = world.CSS3DObject;
  textObj = new CSS3DObjectCls(div);
  textObj.scale.setScalar(0.01); // 620px → 6.2 单位
  textObj.position.set(0, 0.05, 0.14);
  letterGroup.add(textObj);

  /* 背后光晕 */
  halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.softCircleTexture("rgba(255,240,220,0.95)"),
      transparent: true, opacity: 0.3, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.setScalar(11);
  halo.position.z = -1.5;
  zone.add(halo);
}

/* ---------- 3D 花瓣 / 星星（InstancedMesh） ---------- */
function buildFX() {
  fxGroup = new THREE.Group();
  zone.add(fxGroup);

  const isTouch = App.isTouch;
  const nPetal = isTouch ? 60 : 110; // ≤200，手机减半
  const nStar = isTouch ? 40 : 70;

  /* 花瓣几何 */
  const ps = new THREE.Shape();
  ps.moveTo(0, 0.14);
  ps.quadraticCurveTo(0.1, 0.02, 0, -0.14);
  ps.quadraticCurveTo(-0.1, 0.02, 0, 0.14);
  const petalGeo = new THREE.ShapeGeometry(ps, 6);

  petalsMesh = new THREE.InstancedMesh(
    petalGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffc4d4, roughness: 0.6, metalness: 0.05,
      side: THREE.DoubleSide, emissive: 0xff9fb4, emissiveIntensity: 0.12,
    }),
    nPetal
  );
  petalsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  starsMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055),
    new THREE.MeshStandardMaterial({
      color: 0xf6d9a0, roughness: 0.25, metalness: 0.6,
      emissive: 0xffd9a0, emissiveIntensity: 0.8,
    }),
    nStar
  );
  starsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const rnd = (a, b) => a + Math.random() * (b - a);
  pMeta = [];
  for (let i = 0; i < nPetal; i++) {
    pMeta.push({
      x: rnd(-9, 9), y: rnd(-6, 7), z: rnd(-5, 4),
      vy: rnd(0.22, 0.55), rotX: rnd(0.5, 2.4), rotY: rnd(0.5, 2.4), rotZ: rnd(0.3, 1.6),
      phase: Math.random() * Math.PI * 2, freq: rnd(0.5, 1.4), amp: rnd(0.3, 0.9),
      s: rnd(0.7, 1.5),
    });
  }
  sMeta = [];
  for (let i = 0; i < nStar; i++) {
    sMeta.push({
      x: rnd(-9, 9), y: rnd(-6, 7), z: rnd(-5, 4),
      vy: rnd(0.08, 0.2), phase: Math.random() * Math.PI * 2, freq: rnd(0.8, 2),
      s: rnd(0.6, 1.4),
    });
  }

  fxGroup.add(petalsMesh, starsMesh);
  petalsMesh.castShadow = false;
  applyMode();
}

function updatePetals(dt, t) {
  const n = petalsMesh.count;
  for (let i = 0; i < n; i++) {
    const m = pMeta[i];
    m.y -= m.vy * dt;
    if (m.y < -6.5) { m.y = 7; m.x = (Math.random() - 0.5) * 18; }
    dummy.position.set(m.x + Math.sin(t * m.freq + m.phase) * m.amp, m.y, m.z);
    dummy.rotation.set(t * m.rotX + i, t * m.rotY + i * 0.7, t * m.rotZ + i * 0.3);
    dummy.scale.setScalar(m.s);
    dummy.updateMatrix();
    petalsMesh.setMatrixAt(i, dummy.matrix);
  }
  petalsMesh.instanceMatrix.needsUpdate = true;
}

function updateStars(dt, t) {
  const n = starsMesh.count;
  for (let i = 0; i < n; i++) {
    const m = sMeta[i];
    m.y -= m.vy * dt;
    if (m.y < -6.5) { m.y = 7; m.x = (Math.random() - 0.5) * 18; }
    const tw = 0.7 + Math.abs(Math.sin(t * m.freq + m.phase)) * 0.9;
    dummy.position.set(m.x + Math.sin(t * m.freq * 0.6 + m.phase) * 0.35, m.y, m.z);
    dummy.rotation.set(0, t * 0.8 + i, 0);
    dummy.scale.setScalar(m.s * tw);
    dummy.updateMatrix();
    starsMesh.setMatrixAt(i, dummy.matrix);
  }
  starsMesh.instanceMatrix.needsUpdate = true;
}

function applyMode() {
  fxMode = App.store.get("particleStyle", "petal");
  petalsMesh.visible = fxMode === "petal";
  starsMesh.visible = fxMode === "star";
}

/* ---------- HUD 绑定 ---------- */
function bindUI() {
  /* 编辑情话 */
  const modal = document.getElementById("love-modal");
  const input = document.getElementById("love-input");
  document.getElementById("edit-love-btn").addEventListener("click", () => {
    input.value = currentText();
    document.getElementById("love-count").textContent = input.value.length;
    App.openModal("love-modal");
    setTimeout(() => input.focus(), 100);
  });
  input.addEventListener("input", () => {
    document.getElementById("love-count").textContent = input.value.length;
  });
  document.getElementById("love-save").addEventListener("click", () => {
    App.store.set("loveText", input.value.trim() || App.defaults.love);
    App.closeModal("love-modal");
    App.toast("情话已保存");
    retype();
  });

  /* 音乐 */
  const musicBtn = document.getElementById("music-btn");
  musicBtn.addEventListener("click", () => App.music.toggle());
  document.getElementById("music-upload-btn").addEventListener("click", () => {
    document.getElementById("input-music").click();
  });
  App.music.onChange((s) => {
    musicBtn.classList.toggle("playing", s.playing);
    document.getElementById("icon-play").toggleAttribute("hidden", s.playing);
    document.getElementById("icon-pause").toggleAttribute("hidden", !s.playing);
  });
  document.getElementById("input-music").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await App.db.putFile("music", file);
    await App.music.setFile(file);
    App.toast("背景音乐已更换");
    e.target.value = "";
  });

  /* 花瓣 / 星星切换 */
  const toggle = document.getElementById("fx-toggle");
  const label = document.getElementById("fx-toggle-label");
  function refreshToggle() {
    label.textContent = fxMode === "petal" ? "星星" : "花瓣";
    document.getElementById("fx-icon-flower").toggleAttribute("hidden", fxMode !== "petal");
    document.getElementById("fx-icon-star").toggleAttribute("hidden", fxMode === "petal");
  }
  toggle.addEventListener("click", () => {
    fxMode = fxMode === "petal" ? "star" : "petal";
    App.store.set("particleStyle", fxMode);
    applyMode();
    refreshToggle();
  });
  refreshToggle();
}

/* ---------- 模块接口 ---------- */
const s2 = {
  enter(first) {
    if (first) {
      zone = world.createZone(1);
      buildLetter();
      buildFX();
      bindUI();
      /* 信纸升起的入场动画 */
      letterGroup.position.y = -2.4;
      letterGroup.rotation.x = -0.35;
      gsap.to(letterGroup.position, { y: 0, duration: 1.3, ease: "power2.out", delay: 0.2 });
      gsap.to(letterGroup.rotation, { x: 0, duration: 1.3, ease: "power2.out", delay: 0.2 });
    }
    zone.visible = true;
    halo.material.opacity = 0;
    gsap.to(halo.material, { opacity: 0.3, duration: 1.2 });

    const text = currentText();
    if (first || typedKey !== text) retype();
  },

  leave() {
    zone.visible = false;
    typeToken++;
    if (letterTextEl) letterTextEl.textContent = currentText();
    if (letterCaretEl) letterCaretEl.classList.add("off");
  },

  tick(dt, t) {
    if (!letterGroup) return;
    /* 信纸轻微 3D 倾斜跟随（视差） */
    tilt.x += ((-world.parallax.y * 0.07) - tilt.x) * 0.05;
    tilt.y += ((world.parallax.x * 0.09) - tilt.y) * 0.05;
    letterGroup.rotation.x = tilt.x;
    letterGroup.rotation.y = tilt.y;
    letterGroup.position.y = Math.sin(t * 0.7) * 0.08;

    if (petalsMesh && petalsMesh.visible) updatePetals(dt, t);
    if (starsMesh && starsMesh.visible) updateStars(dt, t);
  },
};

App.s2 = s2;
export default s2;
