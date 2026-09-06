/* ============ scene3.js · 3D 弧形照片墙（拍立得厚度 / 连线 / 环绕观看） ============ */
import world from "./world.js";

const App = window.App;
const THREE = world.THREE;
const gsap = window.gsap;

const RADIUS = 6;          // 弧形半径
const ARC = (60 * Math.PI) / 180; // ±60°
const PW = 2, PH = 2.5, PT = 0.1; // 照片宽 / 高 / 厚

let zone = null;
let wallGroup = null, lineGroup = null;
let photos = [];           // { mesh, mats, frame, basePos, baseRot, angle, id }
let tube = null, spark = null;
let loaded = [];           // 数据记录
let focused = -1;
let hoverIdx = -1;
let inited = false;

const raycaster = new THREE.Raycaster();
const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();
const outward = (a) => new THREE.Vector3(Math.sin(a), 0, Math.cos(a));

/* ---------- 拍立得正面贴图（白框 + 照片 + 手写日期） ---------- */
async function polaroidTexture(blob, idx) {
  const img = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = 512; c.height = 640;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fffdf6";
  ctx.fillRect(0, 0, 512, 640);

  /* 照片区（留白相框） */
  const iw = 448, ih = 448, ix = 32, iy = 32;
  const s = Math.max(iw / img.width, ih / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  ctx.drawImage(img, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh);
  ctx.restore();

  /* 底部手写注释 */
  const d = new Date();
  ctx.fillStyle = "#8a6a70";
  ctx.font = '30px "Ma Shan Zheng", KaiTi, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(`回忆 No.${idx + 1} · ${d.getMonth() + 1}月`, 256, 560);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (img.close) img.close();
  return tex;
}

/* ---------- 清空旧照片 ---------- */
function clearWall() {
  for (const p of photos) {
    wallGroup.remove(p.mesh);
    p.mats[4].map && p.mats[4].map.dispose();
    p.mats.forEach((m) => m.dispose());
  }
  photos = [];
  if (tube) { lineGroup.remove(tube); tube.geometry.dispose(); tube.material.dispose(); tube = null; }
}

/* ---------- 构建照片墙 ---------- */
async function buildWall() {
  clearWall();
  const n = loaded.length;
  document.getElementById("empty-photos-hint").hidden = n > 0;

  const sideMat = new THREE.MeshStandardMaterial({ color: 0xcfc4b8, roughness: 0.85 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0xfffdf8, roughness: 0.85 });

  for (let i = 0; i < n; i++) {
    const rec = loaded[i];
    const a = n === 1 ? 0 : -ARC + (2 * ARC * i) / (n - 1);
    const hash = App.hashRandom(rec.id);
    const y = ((i % 3) - 1) * 0.5 + (hash() - 0.5) * 0.5;
    const basePos = new THREE.Vector3(Math.sin(a) * RADIUS, y, Math.cos(a) * RADIUS);
    const tiltX = (hash() - 0.5) * (10 * Math.PI / 180);
    const tiltY = a + (hash() - 0.5) * (10 * Math.PI / 180);
    const tiltZ = (hash() - 0.5) * (10 * Math.PI / 180);

    const tex = await polaroidTexture(rec.blob, i);
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.8, metalness: 0.02,
      transparent: true, emissive: 0xffffff, emissiveIntensity: 0,
    });
    const sm = sideMat.clone(); sm.transparent = true;
    const bm = backMat.clone(); bm.transparent = true;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PT), [sm, sm, sm, sm, frontMat, bm]);
    mesh.position.copy(basePos);
    mesh.rotation.set(tiltX, tiltY, tiltZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    /* 发光边框（悬停 / 聚焦时出现，被 Bloom 捕捉）
       放在照片背后：只在四周露出光边，不会遮挡照片正面 */
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(PW + 0.14, PH + 0.14),
      new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })
    );
    frame.position.z = -PT / 2 - 0.01;
    frame.visible = false;
    mesh.add(frame);

    wallGroup.add(mesh);
    photos.push({
      mesh, mats: [sm, bm, frontMat], frame,
      basePos, baseRot: mesh.rotation.clone(),
      angle: a, id: rec.id, opacity: 1,
    });
  }

  buildLine();
}

/* ---------- 照片之间的 3D 连线（TubeGeometry + 流动光点） ---------- */
function buildLine() {
  if (tube) { lineGroup.remove(tube); tube.geometry.dispose(); tube.material.dispose(); tube = null; }
  if (photos.length < 2) return;
  const pts = photos.map((p) => p.basePos.clone().addScaledVector(outward(p.angle), -0.25).add(new THREE.Vector3(0, -0.4, 0)));
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
  tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(24, photos.length * 8), 0.02, 6, false),
    new THREE.MeshBasicMaterial({
      color: 0xf2c98e, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  lineGroup.add(tube);
}

/* ---------- 悬停 / 点击拾取 ---------- */
function pickPhoto(e) {
  const ndc = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, world.camera);
  const hits = raycaster.intersectObjects(photos.map((p) => p.mesh), false);
  if (!hits.length) return -1;
  return photos.findIndex((p) => p.mesh === hits[0].object);
}

function setHover(idx) {
  if (idx === hoverIdx) return;
  const Z = world.zoneZ(2); // 区域世界偏移
  /* 旧照片复位 */
  if (hoverIdx >= 0 && photos[hoverIdx]) {
    const p = photos[hoverIdx];
    if (!focused || focused !== hoverIdx) {
      gsap.to(p.mesh.position, { ...p.basePos, duration: 0.6, ease: "power2.inOut" });
      gsap.to(p.mesh.rotation, { x: p.baseRot.x, y: p.baseRot.y, z: p.baseRot.z, duration: 0.6, ease: "power2.inOut" });
      gsap.to(p.frame.material, { opacity: 0, duration: 0.4, onComplete: () => (p.frame.visible = false) });
    }
  }
  hoverIdx = idx;
  if (idx >= 0 && focused < 0) {
    const p = photos[idx];
    const target = p.basePos.clone().addScaledVector(outward(p.angle), 1); // 沿 Z 向前 1 单位
    gsap.to(p.mesh.position, { x: target.x, y: target.y, z: target.z, duration: 0.6, ease: "power2.inOut" });
    /* 旋转回正面朝向相机（+Z 正面指向相机：eye=相机, target=照片） */
    const worldPos = p.basePos.clone().add(new THREE.Vector3(0, 0, Z));
    tmpM.lookAt(world.camera.position, worldPos, THREE.Object3D.DEFAULT_UP);
    tmpQ.setFromRotationMatrix(tmpM);
    const eu = new THREE.Euler().setFromQuaternion(tmpQ);
    gsap.to(p.mesh.rotation, { x: eu.x, y: eu.y, z: eu.z, duration: 0.6, ease: "power2.inOut" });
    p.frame.visible = true;
    gsap.to(p.frame.material, { opacity: 0.95, duration: 0.4 });
    world.renderer.domElement.style.cursor = "pointer";
  } else {
    world.renderer.domElement.style.cursor = "default";
  }
}

/* ---------- 聚焦单张照片（相机飞过去，其余虚化） ---------- */
function focusPhoto(i, silent = false) {
  if (i < 0 || i >= photos.length) return;
  focused = i;
  world.disableOrbit();
  const Z = world.zoneZ(2); // 区域世界偏移（相机飞行需要世界坐标）
  const p = photos[i];
  const worldPos = p.basePos.clone().add(new THREE.Vector3(0, 0, Z));
  const camPos = worldPos.clone().addScaledVector(outward(p.angle), 2.7).add(new THREE.Vector3(0, 0.15, 0));
  world.flyTo({ pos: camPos, look: worldPos, dur: 1.2 });

  photos.forEach((o, k) => {
    const target = k === i ? 1 : 0.2;
    gsap.to(o.mats[0], { opacity: target, duration: 0.8 });
    gsap.to(o.mats[1], { opacity: target, duration: 0.8 });
    gsap.to(o.mats[2], { opacity: target, duration: 0.8 });
    o.frame.visible = k === i;
    gsap.to(o.frame.material, { opacity: k === i ? 0.95 : 0, duration: 0.5 });
    if (k === i) {
      /* +Z 正面指向相机（eye=相机位, target=照片位） */
      const eu = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromRotationMatrix(tmpM.lookAt(camPos, worldPos, THREE.Object3D.DEFAULT_UP))
      );
      gsap.to(o.mesh.rotation, { x: eu.x, y: eu.y, z: eu.z, duration: 1, ease: "power2.inOut" });
    }
  });

  const hud = document.getElementById("focus-hud");
  hud.hidden = silent;
  document.getElementById("focus-counter").textContent = `${i + 1} / ${photos.length}`;
}

function unfocus(silent = false) {
  if (focused < 0) return;
  focused = -1;
  document.getElementById("focus-hud").hidden = true;
  photos.forEach((o) => {
    gsap.to(o.mats[0], { opacity: 1, duration: 0.8 });
    gsap.to(o.mats[1], { opacity: 1, duration: 0.8 });
    gsap.to(o.mats[2], { opacity: 1, duration: 0.8 });
    gsap.to(o.mesh.rotation, { x: o.baseRot.x, y: o.baseRot.y, z: o.baseRot.z, duration: 0.8, ease: "power2.inOut" });
    o.frame.visible = false;
  });
  if (!silent) {
    const z = world.zoneZ(2);
    world.flyTo({ pos: new THREE.Vector3(0, 0.6, z + 10.5), look: new THREE.Vector3(0, 0, z), dur: 1.2 });
    setTimeout(() => { if (focused < 0 && App.main.current === 2) world.enableOrbit(2); }, 1300);
  }
}

/* ---------- 数据加载 ---------- */
async function loadPhotos() {
  try {
    loaded = await App.db.getAllPhotos();
  } catch (e) {
    loaded = [];
  }
  await buildWall();
}

async function addPhotos(files) {
  let order = loaded.length;
  for (const file of files) {
    if (order >= 12) { App.toast("最多 12 张照片"); break; }
    const blob = await App.fitImage(file, 1024); // 纹理压缩到 1024px 内
    const id = App.uid();
    await App.db.putPhoto({ id, blob, order });
    loaded.push({ id, blob, order });
    order++;
  }
  await buildWall();
  App.toast("照片已添加");
}

async function deletePhoto(id) {
  const ok = await App.confirm("删除这张回忆照片？");
  if (!ok) return;
  await App.db.deletePhoto(id);
  loaded = loaded.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i }));
  for (const [i, r] of loaded.entries()) await App.db.putPhoto(r);
  const wasFocused = focused >= 0;
  await buildWall();
  focused = -1;
  document.getElementById("focus-hud").hidden = true;
  if (wasFocused) unfocus();
  App.toast("照片已删除");
}

/* ---------- 交互绑定 ---------- */
let downPos = null;
function bindPointer() {
  const canvas = world.renderer.domElement;
  canvas.addEventListener("pointermove", (e) => {
    if (App.main.current !== 2) return;
    if (focused >= 0) return;
    setHover(pickPhoto(e));
  });
  canvas.addEventListener("pointerdown", (e) => { downPos = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", (e) => {
    if (App.main.current !== 2 || App.isOverlayOpen()) return;
    if (!downPos) return;
    const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
    downPos = null;
    if (moved > 7) return; // 拖拽环绕，不算点击
    const idx = pickPhoto(e);
    if (idx >= 0) focusPhoto(idx);
  });

  /* 聚焦 HUD */
  document.getElementById("focus-close").addEventListener("click", () => unfocus());
  document.getElementById("focus-prev").addEventListener("click", () => focusPhoto((focused - 1 + photos.length) % photos.length));
  document.getElementById("focus-next").addEventListener("click", () => focusPhoto((focused + 1) % photos.length));
  document.getElementById("focus-del").addEventListener("click", () => {
    if (focused >= 0) deletePhoto(photos[focused].id);
  });

  /* 添加照片 */
  document.getElementById("add-photos-btn").addEventListener("click", () => {
    document.getElementById("input-photos").click();
  });
  document.getElementById("input-photos").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) await addPhotos(files);
    e.target.value = "";
  });
}

/* ---------- 模块接口 ---------- */
const s3 = {
  enter(first) {
    zone.visible = true;
    if (first) {
      loadPhotos();
      bindPointer();
    }
    /* 照片墙环绕观看（±30° 水平） */
    setTimeout(() => {
      if (App.main.current === 2 && focused < 0) world.enableOrbit(2);
    }, 1500);
  },

  leave() {
    zone.visible = false;
    world.disableOrbit();
    setHover(-1);
    focused = -1;
    document.getElementById("focus-hud").hidden = true;
    world.renderer.domElement.style.cursor = "default";
  },

  tick(dt, t) {
    /* 连线上流动的光点 */
    if (tube && photos.length >= 2) {
      if (!spark) {
        spark = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: world.softCircleTexture("rgba(255,225,170,1)"),
            transparent: true, opacity: 0.9, depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        spark.scale.setScalar(0.5);
        lineGroup.add(spark);
      }
      const u = (t * 0.06) % 1;
      const pts = tube.geometry.parameters.path;
      if (pts) pts.getPointAt(u, spark.position);
    }
    /* 悬停时边框呼吸 */
    for (const [i, p] of photos.entries()) {
      if (p.frame.visible && p.frame.material.opacity > 0.5) {
        p.frame.material.opacity = 0.75 + Math.sin(t * 3 + i) * 0.2;
      }
    }
  },
};

export function initScene3() {
  zone = world.createZone(2);
  wallGroup = new THREE.Group();
  lineGroup = new THREE.Group();
  zone.add(lineGroup, wallGroup);
  inited = true;
}

App.s3 = s3;
export default s3;
