/* ============ scene1.js · 3D 信封封面（真实厚度 / 蜡封 / 视差） ============ */
import world from "./world.js";

const App = window.App;
const THREE = world.THREE;
const gsap = window.gsap;

const W = 3.6, H = 2.5, DEPTH = 0.5; // 信封尺寸与纸张厚度

let zone = null;
let spinGroup = null;   // 自转
let tiltGroup = null;   // 视差倾斜
let flapGroup = null;   // 信封盖
let sealGroup = null;   // 火漆封印
let letter = null;
let halo = null;
let opened = false;
let hoverTween = null;
const tilt = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
let pickMeshes = [];

/* ---------- 材质 ---------- */
function paperMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.1,
    normalMap: world.paperNormalMap(),
    normalScale: new THREE.Vector2(0.55, 0.55),
    ...opts,
  });
}

/* ---------- 构建信封 ---------- */
function buildEnvelope() {
  spinGroup = new THREE.Group();
  tiltGroup = new THREE.Group();
  spinGroup.add(tiltGroup);
  zone.add(spinGroup);
  spinGroup.position.y = -0.3;

  const backMat = paperMat(0xf6dcc0);
  const frontMat = paperMat(0xffe9d2);
  const flapMat = paperMat(0xfbd3ae, { side: THREE.DoubleSide });
  const innerMat = paperMat(0xfffdf6);

  /* 主体（背板 + 两侧/底部厚度墙） */
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.08), backMat);
  back.position.z = -DEPTH / 2 + 0.04;
  tiltGroup.add(back);

  const wallGeoH = new THREE.BoxGeometry(0.07, H, DEPTH); // 左右墙
  const wl = new THREE.Mesh(wallGeoH, backMat);
  wl.position.set(-W / 2 + 0.035, 0, 0);
  const wr = new THREE.Mesh(wallGeoH, backMat);
  wr.position.set(W / 2 - 0.035, 0, 0);
  const wb = new THREE.Mesh(new THREE.BoxGeometry(W - 0.14, 0.07, DEPTH), backMat);
  wb.position.set(0, -H / 2 + 0.035, 0);
  tiltGroup.add(wl, wr, wb);

  /* 内衬（信纸后面） */
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, H * 0.8), innerMat);
  inner.position.z = -0.1;
  tiltGroup.add(inner);

  /* 前口袋（顶部呈 V 形，带厚度） */
  const pocketShape = new THREE.Shape();
  const hSide = H * 0.14, hMid = -H * 0.06;
  pocketShape.moveTo(-W / 2 + 0.03, -H / 2 + 0.02);
  pocketShape.lineTo(W / 2 - 0.03, -H / 2 + 0.02);
  pocketShape.lineTo(W / 2 - 0.03, hSide);
  pocketShape.lineTo(0, hMid);
  pocketShape.lineTo(-W / 2 + 0.03, hSide);
  pocketShape.closePath();
  const pocket = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pocketShape, { depth: 0.06, bevelEnabled: false }),
    frontMat
  );
  pocket.position.z = DEPTH / 2 - 0.06;
  tiltGroup.add(pocket);

  /* 信纸（藏在里面，打开后升起） */
  letter = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.86, H * 0.62, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xfffcf2, roughness: 0.75, metalness: 0.05 })
  );
  letter.position.set(0, -0.35, -0.02);
  letter.rotation.z = 0.02;
  tiltGroup.add(letter);

  /* 信封盖（枢轴在顶边，V 形尖盖） */
  flapGroup = new THREE.Group();
  flapGroup.position.set(0, H / 2 - 0.03, DEPTH / 2 - 0.03);
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-W / 2 + 0.03, 0);
  flapShape.lineTo(W / 2 - 0.03, 0);
  flapShape.lineTo(0, -H * 0.58);
  flapShape.closePath();
  const flap = new THREE.Mesh(
    new THREE.ExtrudeGeometry(flapShape, { depth: 0.05, bevelEnabled: false }),
    flapMat
  );
  flap.position.z = -0.025;
  flapGroup.add(flap);
  tiltGroup.add(flapGroup);

  /* 火漆封印：金色圆环 Torus + 红蜡爱心（球体组合的立体心） */
  sealGroup = new THREE.Group();
  const wax = new THREE.MeshStandardMaterial({ color: 0xc74862, roughness: 0.4, metalness: 0.3 });
  const waxDeep = new THREE.MeshStandardMaterial({ color: 0xa93550, roughness: 0.45, metalness: 0.3 });
  const goldRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.05, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0xd9b380, roughness: 0.3, metalness: 0.75 })
  );
  sealGroup.add(goldRing);

  const waxBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.08, 32), waxDeep);
  waxBase.rotation.x = Math.PI / 2;
  sealGroup.add(waxBase);

  const heartGeo = new THREE.ExtrudeGeometry(world.heartShape(0.5), {
    depth: 0.09, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2,
  });
  heartGeo.center();
  const heart = new THREE.Mesh(heartGeo, wax);
  heart.position.z = 0.08;
  sealGroup.add(heart);

  sealGroup.position.set(0, -H * 0.56, 0.1);
  sealGroup.scale.setScalar(0.9);
  flapGroup.add(sealGroup);

  /* 阴影 */
  [back, wl, wr, wb, pocket, flap].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });

  /* 背后柔光晕（增强空间层次） */
  halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: world.softCircleTexture("rgba(255,236,214,0.4)"),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.setScalar(5);
  halo.position.z = -1.6;
  zone.add(halo);

  /* 不可见拾取代理：信封自转时任意角度都可点击 */
  const pickProxy = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  tiltGroup.add(pickProxy);

  pickMeshes = [pickProxy];
}

/* ---------- 开信 → 进入场景二 ---------- */
function openEnvelope() {
  if (opened) return;
  opened = true;
  document.getElementById("open-hint").classList.add("gone");

  const tl = gsap.timeline();
  /* 1. 信封盖绕 X 轴翻开 -180° */
  tl.to(flapGroup.rotation, { x: -Math.PI, duration: 1.2, ease: "power2.inOut" }, 0);
  /* 2. 封印随盖子掀开，略放大发光 */
  tl.to(sealGroup.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 1.2, ease: "power2.inOut" }, 0);
  /* 3. 信纸从信封内部升起 */
  tl.to(letter.position, { y: H * 0.42, z: 0.28, duration: 1.1, ease: "power2.inOut" }, 0.55);
  tl.to(letter.rotation, { z: 0, duration: 1.1, ease: "power2.inOut" }, 0.55);
  /* 4. 相机同步推进 z: 8.5 → 4.5 */
  tl.add(() => {
    const z = world.zoneZ(0);
    world.flyTo({
      pos: new THREE.Vector3(0, 0.5, z + 4.5),
      look: new THREE.Vector3(0, 0.4, z),
      dur: 1.5,
      ease: "power2.inOut",
    });
  }, 0.35);
  /* 5. 过渡到场景二 */
  tl.add(() => App.main.go(1), 1.75);
}

/* ---------- 指针交互 ---------- */
function bindPointer() {
  const canvas = world.renderer.domElement;

  const pick = (e) => {
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, world.camera);
    return raycaster.intersectObjects(pickMeshes, false).length > 0;
  };

  canvas.addEventListener("pointermove", (e) => {
    if (App.main.current !== 0 || opened) return;
    const over = pick(e);
    canvas.style.cursor = over ? "pointer" : "default";
    const target = over ? 1.04 : 1;
    if (hoverTween) hoverTween.kill();
    hoverTween = gsap.to(spinGroup.scale, { x: target, y: target, z: target, duration: 0.5, ease: "power2.out" });
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (App.main.current !== 0 || opened || App.isOverlayOpen()) return;
    if (pick(e)) openEnvelope();
  });
}

/* ---------- 模块接口 ---------- */
const s1 = {
  enter(first) {
    if (first) {
      zone = world.createZone(0);
      buildEnvelope();
      bindPointer();
      spinGroup.scale.setScalar(0.001);
      gsap.to(spinGroup.scale, { x: 1, y: 1, z: 1, duration: 1.3, ease: "power2.out", delay: 0.25 });
    } else {
      /* 再次回到封面：复位信封 */
      opened = false;
      flapGroup.rotation.x = 0;
      letter.position.set(0, -0.35, -0.02);
      letter.rotation.z = 0.02;
      document.getElementById("open-hint").classList.remove("gone");
      const z = world.zoneZ(0);
      world.flyTo({
        pos: new THREE.Vector3(0, 0.6, z + 8.5),
        look: new THREE.Vector3(0, 0, z),
        dur: 1.4,
      });
    }
    halo.material.opacity = 0;
    gsap.to(halo.material, { opacity: 0.22, duration: 1.2 });
  },

  leave() {
    gsap.to(halo.material, { opacity: 0, duration: 0.8 });
  },

  tick(dt, t) {
    if (!spinGroup) return;
    /* 缓慢自转（Y 轴 0.002 rad/frame ≈ 0.12 rad/s） */
    spinGroup.rotation.y += 0.12 * dt;
    /* 上下浮动（正弦，幅度 0.3） */
    spinGroup.position.y = -0.3 + Math.sin(t * 0.9) * 0.3;
    /* 鼠标视差倾斜（最大 ±15°） */
    tilt.x += ((-world.parallax.y * Math.PI) / 12 - tilt.x) * 0.06;
    tilt.y += ((world.parallax.x * Math.PI) / 12 - tilt.y) * 0.06;
    tiltGroup.rotation.x = tilt.x;
    tiltGroup.rotation.y = tilt.y;
    /* 封印微光呼吸 */
    if (sealGroup) sealGroup.position.z = 0.1 + Math.sin(t * 1.6) * 0.015;
  },
};

App.s1 = s1;
export default s1;
