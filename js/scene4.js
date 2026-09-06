/* ============ scene4.js · 3D 影院与祝福（弧形银幕 / 放映机 / 心形曲线 / 3D 结语） ============ */
import world from "./world.js";

const App = window.App;
const THREE = world.THREE;
const gsap = window.gsap;

let zone = null;
let cinemaGroup = null;
let screen = null, screenMat = null, screenEmptyTex = null;
let videoTex = null;
const video = document.createElement("video");
let hasVideo = false;

let reelA = null, reelB = null;
let avatarGroups = [];
let heartCurve = null, heartTube = null, heartFlow = null;
let endingMesh = null, endingHalo = null;
const dummy = new THREE.Object3D();
const raycaster = new THREE.Raycaster();
let pickables = [];

/* ---------- 空银幕贴图（提示文字） ---------- */
function makeEmptyTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 1024, 512);
  g.addColorStop(0, "#3a2b34");
  g.addColorStop(0.5, "#58404a");
  g.addColorStop(1, "#3a2b34");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "rgba(255, 226, 200, 0.9)";
  ctx.font = '54px "Ma Shan Zheng", KaiTi, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("我们的影片", 512, 220);
  ctx.font = '34px "Ma Shan Zheng", KaiTi, sans-serif';
  ctx.fillStyle = "rgba(255, 226, 200, 0.55)";
  ctx.fillText("点击下方「上传影片」，放映属于我们的故事", 512, 300);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- 头像占位贴图 ---------- */
function makeAvatarTexture(which) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "#ffd7e2");
  g.addColorStop(1, "#ffe9d0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#d4738c";
  ctx.font = '110px serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("❤", 128, 134);
  ctx.fillStyle = "#b58a94";
  ctx.font = '26px "Ma Shan Zheng", KaiTi, sans-serif';
  ctx.fillText(which === 1 ? "点击设置头像" : "点击设置头像", 128, 214);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- 弧形银幕 + 金属边框 ---------- */
function buildScreen() {
  screenMat = new THREE.MeshStandardMaterial({
    map: screenEmptyTex,
    emissive: 0xffffff,
    emissiveMap: screenEmptyTex,
    emissiveIntensity: 0.28,
    roughness: 0.9,
    metalness: 0,
  });
  const geo = new THREE.PlaneGeometry(7.2, 3.6, 48, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, 0.38 * Math.pow(x / 3.6, 2)); // 银幕内凹弧度
  }
  geo.computeVertexNormals();
  screen = new THREE.Mesh(geo, screenMat);
  screen.position.set(0, 0.6, 0);
  cinemaGroup.add(screen);

  /* 金属边框 */
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b380, roughness: 0.3, metalness: 0.8 });
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.28, 0.5), gold);
  barTop.position.set(0, 2.55, 0.15);
  const barBottom = new THREE.Mesh(new THREE.BoxGeometry(8, 0.28, 0.5), gold);
  barBottom.position.set(0, -1.35, 0.15);
  const barL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.2, 0.5), gold);
  barL.position.set(-3.9, 0.6, 0.15);
  const barR = barL.clone();
  barR.position.x = 3.9;
  [barTop, barBottom, barL, barR].forEach((m) => { m.castShadow = true; cinemaGroup.add(m); });

  /* 支撑立柱 */
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8a6f5a, roughness: 0.6, metalness: 0.4 });
  [-3.4, 3.4].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.4, 10), legMat);
    leg.position.set(x, -2.4, 0.2);
    leg.castShadow = true;
    cinemaGroup.add(leg);
  });
}

/* ---------- 老式放映机（圆柱机身 + 胶片盘） ---------- */
function buildProjector(x) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a4a44, roughness: 0.45, metalness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9b380, roughness: 0.3, metalness: 0.8 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 1.0, 20), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  g.add(body);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 16), goldMat);
  lens.rotation.z = Math.PI / 2;
  lens.position.set(-0.65, -0.05, 0);
  g.add(lens);

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2cc, toneMapped: false })
  );
  glass.position.set(-0.88, -0.05, 0);
  glass.rotation.y = -Math.PI / 2;
  g.add(glass);

  reelA = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 24), goldMat);
  reelA.position.set(-0.22, 0.62, 0);
  reelB = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 24), goldMat);
  reelB.position.set(0.3, 0.55, 0);
  g.add(reelA, reelB);

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), bodyMat);
  leg1.position.set(-0.3, -0.75, 0);
  const leg2 = leg1.clone();
  leg2.position.x = 0.3;
  g.add(leg1, leg2);

  /* 光束（锥形，指向银幕中心） */
  const beamLen = Math.hypot(5.4 - 0, 1.5 - 0, 2.4 - 0.15);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 1.5, beamLen, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe0b8, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  beam.position.set(-beamLen / 2 + 0.5, -0.6, 0);
  beam.rotation.z = Math.PI / 2 - Math.atan2(1.2, beamLen);
  g.add(beam);

  g.position.set(x, -0.9, 2.4);
  g.rotation.y = x > 0 ? -0.35 : 0.35;
  cinemaGroup.add(g);
  return g;
}

/* ---------- 3D 头像相框（Torus 边框 + Circle 底） ---------- */
function buildAvatar(x, which) {
  const g = new THREE.Group();

  let tex = makeAvatarTexture(which);
  const baseMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), baseMat);
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.06, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0xd9b380, roughness: 0.25, metalness: 0.85 })
  );
  g.add(ring);

  g.position.set(x, -2.05, 1.4);
  g.userData.which = which;
  cinemaGroup.add(g);
  avatarGroups.push({ group: g, baseMat, tex, which });
  pickables.push(base);
  return g;
}

/* ---------- 心形曲线 + 流动爱心 ---------- */
function buildHeartCurve() {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push(new THREE.Vector3(hx * 0.032, hy * 0.032 + 0.55, Math.sin(t * 2) * 0.12));
  }
  heartCurve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);

  heartTube = new THREE.Mesh(
    new THREE.TubeGeometry(heartCurve, 120, 0.035, 6, true),
    new THREE.MeshBasicMaterial({
      color: 0xf0a8b8, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0, -2.0, 1.45);
  heartGroup.add(heartTube);
  cinemaGroup.add(heartGroup);

  /* 沿曲线流动的小爱心（InstancedMesh） */
  const flowGeo = new THREE.ExtrudeGeometry(world.heartShape(0.09), {
    depth: 0.03, bevelEnabled: false,
  });
  flowGeo.center();
  heartFlow = new THREE.InstancedMesh(
    flowGeo,
    new THREE.MeshBasicMaterial({ color: 0xff8fa8, toneMapped: false, transparent: true, opacity: 0.95 }),
    7
  );
  heartFlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  heartGroup.add(heartFlow);
}

/* ---------- 3D 金色结语 + 粒子光晕 ---------- */
function buildEnding() {
  if (endingMesh) {
    cinemaGroup.remove(endingMesh);
    endingMesh.geometry.dispose();
    endingMesh.material.dispose();
    endingMesh = null;
  }
  if (endingHalo) { cinemaGroup.remove(endingHalo); endingHalo = null; }

  const text = App.store.get("ending", App.defaults.ending);
  const geo = world.makeTextGeometry(text, { fontPx: 110, size: 1.35, depth: 0.3 });
  if (geo) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe8c48a,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x8a6420,
      emissiveIntensity: 0.22,
    });
    endingMesh = new THREE.Mesh(geo, mat);
    endingMesh.castShadow = true;
    endingMesh.position.set(0, -3.15, 1.0);
    cinemaGroup.add(endingMesh);
  }

  /* 粒子光晕（扩散呼吸） */
  const n = App.isTouch ? 40 : 70;
  const posArr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.4 + Math.random() * 1.6;
    posArr[i * 3] = Math.cos(a) * r;
    posArr[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
    posArr[i * 3 + 2] = Math.sin(a) * r * 0.5;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  endingHalo = new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.09,
    map: world.softCircleTexture("rgba(255,220,160,1)"),
    color: 0xffd9a0,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  endingHalo.position.set(0, -3.15, 1.0);
  cinemaGroup.add(endingHalo);
}

/* ---------- 视频 ---------- */
function setScreenTexture(tex) {
  screenMat.map = tex;
  screenMat.emissiveMap = tex;
  screenMat.emissiveIntensity = tex === screenEmptyTex ? 0.28 : 0.5;
  screenMat.needsUpdate = true;
}

async function loadVideo() {
  const blob = await App.db.getFile("video");
  if (blob) applyVideo(blob, false);
}

function applyVideo(blob, toast = true) {
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(blob);
  hasVideo = true;
  if (!videoTex || videoTex.image !== video) {
    videoTex = new THREE.VideoTexture(video);
    videoTex.colorSpace = THREE.SRGBColorSpace;
  }
  setScreenTexture(videoTex);
  document.getElementById("upload-video-btn").hidden = true;
  document.getElementById("play-video-btn").hidden = false;
  document.getElementById("replace-video-btn").hidden = false;
  document.getElementById("remove-video-btn").hidden = false;
  if (toast) App.toast("影片已就绪，点击银幕播放");
}

function removeVideo() {
  video.pause();
  if (video.src) URL.revokeObjectURL(video.src);
  video.removeAttribute("src");
  hasVideo = false;
  videoTex = null;
  setScreenTexture(screenEmptyTex);
  document.getElementById("upload-video-btn").hidden = false;
  document.getElementById("play-video-btn").hidden = true;
  document.getElementById("replace-video-btn").hidden = true;
  document.getElementById("remove-video-btn").hidden = true;
}

function togglePlay() {
  if (!hasVideo) return;
  if (video.paused) {
    video.play().catch(() => App.toast("暂时无法播放"));
  } else {
    video.pause();
  }
}

/* ---------- HUD / 交互绑定 ---------- */
async function loadAvatar(which) {
  const blob = await App.db.getFile(`avatar-${which}`);
  if (!blob) return;
  const entry = avatarGroups.find((a) => a.which === which);
  if (!entry) return;
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const s = Math.max(256 / bmp.width, 256 / bmp.height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 127, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(bmp, 128 - (bmp.width * s) / 2, 128 - (bmp.height * s) / 2, bmp.width * s, bmp.height * s);
  ctx.restore();
  if (bmp.close) bmp.close();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  entry.baseMat.map = tex;
  entry.baseMat.needsUpdate = true;
}

function bindUI() {
  /* 视频 */
  document.getElementById("upload-video-btn").addEventListener("click", () =>
    document.getElementById("input-video").click()
  );
  document.getElementById("replace-video-btn").addEventListener("click", () =>
    document.getElementById("input-video").click()
  );
  document.getElementById("remove-video-btn").addEventListener("click", async () => {
    const ok = await App.confirm("删除当前影片？");
    if (!ok) return;
    await App.db.deleteFile("video");
    removeVideo();
    App.toast("影片已删除");
  });
  document.getElementById("play-video-btn").addEventListener("click", togglePlay);
  document.getElementById("input-video").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { App.toast("影片请控制在 50MB 以内"); e.target.value = ""; return; }
    await App.db.putFile("video", file);
    applyVideo(file);
    e.target.value = "";
  });
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.loop = true;

  /* 祝福 / 结语 */
  document.getElementById("edit-bless-btn").addEventListener("click", () => {
    document.getElementById("bless-input").value = App.store.get("blessing", App.defaults.blessing);
    document.getElementById("ending-input").value = App.store.get("ending", App.defaults.ending);
    App.openModal("bless-modal");
  });
  document.getElementById("bless-save").addEventListener("click", () => {
    const b = document.getElementById("bless-input").value.trim() || App.defaults.blessing;
    const t = document.getElementById("ending-input").value.trim() || App.defaults.ending;
    App.store.set("blessing", b);
    App.store.set("ending", t);
    document.getElementById("blessing-text").textContent = b;
    buildEnding();
    App.closeModal("bless-modal");
    App.toast("祝福已保存");
  });

  /* 点击银幕播放 / 点击头像更换 */
  const canvas = world.renderer.domElement;
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", (e) => {
    if (App.main.current !== 3 || App.isOverlayOpen()) return;
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 7) return;
    down = null;
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, world.camera);
    /* 头像 */
    const av = raycaster.intersectObjects(avatarGroups.map((a) => a.group.children[0]), false);
    if (av.length) {
      const which = avatarGroups.find((a) => a.group.children[0] === av[0].object).which;
      document.getElementById(`input-avatar-${which}`).click();
      return;
    }
    /* 银幕 */
    if (raycaster.intersectObject(screen, false).length) togglePlay();
  });
  ["input-avatar-1", "input-avatar-2"].forEach((id, k) => {
    document.getElementById(id).addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const blob = await App.fitImage(file, 1024);
      await App.db.putFile(`avatar-${k + 1}`, blob);
      await loadAvatar(k + 1);
      App.toast("头像已更换");
      e.target.value = "";
    });
  });
}

/* ---------- 模块接口 ---------- */
const s4 = {
  enter(first) {
    if (first) {
      zone = world.createZone(3, -3.8);
      cinemaGroup = new THREE.Group();
      zone.add(cinemaGroup);

      screenEmptyTex = makeEmptyTexture();
      buildScreen();
      buildProjector(-5.4);
      buildProjector(5.4);
      buildAvatar(-1.7, 1);
      buildAvatar(1.7, 2);
      buildHeartCurve();
      buildEnding();
      bindUI();

      loadVideo();
      loadAvatar(1);
      loadAvatar(2);
      document.getElementById("blessing-text").textContent = App.store.get("blessing", App.defaults.blessing);

      /* 入场：银幕亮起 */
      screenMat.emissiveIntensity = 0;
      gsap.to(screenMat, { emissiveIntensity: 0.28, duration: 1.4, ease: "power2.inOut", delay: 0.6 });
    }
    zone.visible = true;
  },

  leave() {
    zone.visible = false;
    if (hasVideo) video.pause();
  },

  tick(dt, t) {
    /* 胶片盘缓慢旋转 */
    if (reelA) reelA.rotation.y += 0.6 * dt;
    if (reelB) reelB.rotation.y += 0.45 * dt;

    /* 心形曲线上的爱心流动 */
    if (heartFlow && heartCurve) {
      for (let i = 0; i < heartFlow.count; i++) {
        const u = (t * 0.1 + i / heartFlow.count) % 1;
        heartCurve.getPointAt(u, dummy.position);
        const tan = heartCurve.getTangentAt(u);
        dummy.rotation.set(0, 0, Math.atan2(tan.y, tan.x) - Math.PI / 2 + Math.PI);
        const pulse = 0.8 + Math.sin(t * 3 + i) * 0.25;
        dummy.scale.setScalar(pulse);
        dummy.updateMatrix();
        heartFlow.setMatrixAt(i, dummy.matrix);
      }
      heartFlow.instanceMatrix.needsUpdate = true;
    }

    /* 结语粒子光晕扩散 */
    if (endingHalo) {
      const s = 1 + Math.sin(t * 1.4) * 0.18;
      endingHalo.scale.setScalar(s);
      endingHalo.material.opacity = 0.55 + Math.sin(t * 1.4) * 0.2;
    }

    /* 结语文字微微浮动 */
    if (endingMesh) {
      endingMesh.position.y = -3.15 + Math.sin(t * 0.8) * 0.06;
      endingHalo.position.y = endingMesh.position.y;
      endingMesh.rotation.y = Math.sin(t * 0.4) * 0.08;
    }
  },
};

App.s4 = s4;
export default s4;
