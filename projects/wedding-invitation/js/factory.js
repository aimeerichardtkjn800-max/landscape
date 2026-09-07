/* ============ factory.js · 程序化中式纹理与 3D 构件 ============
   全部贴图由 Canvas 绘制生成，无需外部图片素材
====================================================== */
import * as THREE from "three";

/* ---------------- 基础工具 ---------------- */
function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d") };
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

const KAI = '"Ma Shan Zheng","KaiTi","STKaiti","楷体",serif';

/* 金色描边文字（Canvas 渐变填充） */
function goldText(ctx, text, x, y, size, align = "center") {
  const g = ctx.createLinearGradient(0, y - size, 0, y + size * 0.2);
  g.addColorStop(0, "#9c6b26");
  g.addColorStop(0.35, "#f0d68a");
  g.addColorStop(0.55, "#fff6d8");
  g.addColorStop(0.75, "#d4af37");
  g.addColorStop(1, "#8a5a1e");
  ctx.fillStyle = g;
  ctx.font = `bold ${size}px ${KAI}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(240,200,110,.55)";
  ctx.shadowBlur = size * 0.18;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/* ---------------- ① 囍字金匾纹理 ---------------- */
export function makeXiTexture(size = 512, { ring = true, char = "囍" } = {}) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;

  /* 朱砂底盘 */
  const bg = ctx.createRadialGradient(c, c * 0.9, size * 0.08, c, c, size * 0.52);
  bg.addColorStop(0, "#a81c2a");
  bg.addColorStop(0.7, "#7a0f1c");
  bg.addColorStop(1, "#4a0a12");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  /* 放射暗纹 */
  ctx.save();
  ctx.translate(c, c);
  ctx.strokeStyle = "rgba(212,175,55,.10)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(size * 0.2, 0);
    ctx.lineTo(size * 0.45, 0);
    ctx.stroke();
  }
  ctx.restore();

  /* 金色双环 */
  if (ring) {
    ctx.strokeStyle = "rgba(240,214,138,.95)";
    ctx.lineWidth = size * 0.028;
    ctx.beginPath(); ctx.arc(c, c, size * 0.445, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(156,107,38,.8)";
    ctx.lineWidth = size * 0.012;
    ctx.beginPath(); ctx.arc(c, c, size * 0.4, 0, Math.PI * 2); ctx.stroke();
  }

  /* 囍字 */
  goldText(ctx, char, c, c + size * 0.02, size * 0.52);
  return toTexture(canvas);
}

/* ---------------- ② 祥云纹理 ---------------- */
function spiral(ctx, cx, cy, rMax, turns, dir) {
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2 * turns; a += 0.15) {
    const r = (a / (Math.PI * 2 * turns)) * rMax;
    const x = cx + Math.cos(a * dir) * r;
    const y = cy + Math.sin(a * dir) * r * 0.9;
    a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function makeCloudTexture(size = 512) {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.strokeStyle = "rgba(240,214,138,.9)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.035;

  const c = size / 2;
  /* 主云盖 */
  ctx.beginPath();
  ctx.arc(c, c + size * 0.06, size * 0.22, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  /* 两侧如意卷 */
  spiral(ctx, c - size * 0.26, c + size * 0.08, size * 0.14, 1.6, 1);
  spiral(ctx, c + size * 0.26, c + size * 0.08, size * 0.14, 1.6, -1);
  /* 云尾涟漪 */
  ctx.lineWidth = size * 0.022;
  ctx.strokeStyle = "rgba(232,201,135,.7)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const y = c + size * 0.2 + i * size * 0.07;
    ctx.moveTo(c - size * (0.3 - i * 0.05), y);
    ctx.bezierCurveTo(c - size * 0.1, y + size * 0.05, c + size * 0.1, y - size * 0.05, c + size * (0.3 - i * 0.05), y);
    ctx.stroke();
  }
  return toTexture(canvas);
}

/* ---------------- ③ 玫瑰花瓣纹理 ---------------- */
export function makePetalTexture(size = 128) {
  const { canvas, ctx } = makeCanvas(size, size);
  const w = size, h = size;
  ctx.translate(w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(0, h * 0.42);
  ctx.bezierCurveTo(-w * 0.42, h * 0.12, -w * 0.38, -h * 0.3, 0, -h * 0.44);
  ctx.bezierCurveTo(w * 0.38, -h * 0.3, w * 0.42, h * 0.12, 0, h * 0.42);
  ctx.closePath();

  const g = ctx.createRadialGradient(0, -h * 0.18, h * 0.05, 0, 0, h * 0.5);
  g.addColorStop(0, "#e8828f");
  g.addColorStop(0.45, "#c8344a");
  g.addColorStop(1, "#7a0f1c");
  ctx.fillStyle = g;
  ctx.fill();

  /* 花瓣脉络 */
  ctx.strokeStyle = "rgba(255,210,210,.35)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.38);
  ctx.bezierCurveTo(-w * 0.04, 0, w * 0.04, -h * 0.2, 0, -h * 0.4);
  ctx.stroke();

  /* 金色边缘微光 */
  ctx.strokeStyle = "rgba(240,214,138,.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  return toTexture(canvas);
}

/* ---------------- ④ 金色碎星光斑 ---------------- */
export function makeFleckTexture(size = 64) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,246,216,1)");
  g.addColorStop(0.35, "rgba(240,214,138,.8)");
  g.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c, c, c * 0.22, c, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c, c, c, c * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

/* ---------------- ⑤ 柔光晕纹理 ---------------- */
export function makeGlowTexture(size = 256, [r, g, b] = [255, 200, 120]) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, `rgba(${r},${g},${b},.9)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},.28)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/* ---------------- ⑥ 灯笼灯身纹理 ---------------- */
export function makeLanternTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;

  const bg = ctx.createRadialGradient(c, c * 0.55, size * 0.1, c, c, size * 0.62);
  bg.addColorStop(0, "#e0463e");
  bg.addColorStop(0.6, "#b01e28");
  bg.addColorStop(1, "#6e0f18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  /* 纵向灯骨 */
  ctx.strokeStyle = "rgba(60,8,12,.55)";
  ctx.lineWidth = 2.5;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.ellipse(c + i * size * 0.09, c, Math.abs(i) * size * 0.02 + size * 0.02, size * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  /* 上下金箍 */
  const gold = ctx.createLinearGradient(0, 0, 0, size);
  gold.addColorStop(0, "#f0d68a");
  gold.addColorStop(0.5, "#b8862f");
  gold.addColorStop(1, "#f0d68a");
  ctx.fillStyle = gold;
  ctx.fillRect(0, size * 0.06, size, size * 0.08);
  ctx.fillRect(0, size * 0.86, size, size * 0.08);
  return toTexture(canvas);
}

/* ---------------- ⑦ 窗棂金边相框纹理（中心透明） ---------------- */
export function makeFrameTexture(w = 512, h = 640) {
  const { canvas, ctx } = makeCanvas(w, h);
  const B = Math.min(w, h) * 0.13; // 边框宽度

  /* 外框金色底 */
  const gold = ctx.createLinearGradient(0, 0, w, h);
  gold.addColorStop(0, "#8a5a1e");
  gold.addColorStop(0.3, "#d4af37");
  gold.addColorStop(0.55, "#f5d98b");
  gold.addColorStop(0.8, "#b8862f");
  gold.addColorStop(1, "#7a4a12");
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, w, h);

  /* 挖空中心（照片区域） */
  ctx.clearRect(B, B, w - B * 2, h - B * 2);

  /* 内沿暗红衬边 */
  ctx.strokeStyle = "#4a0a12";
  ctx.lineWidth = 4;
  ctx.strokeRect(B + 2, B + 2, w - B * 2 - 4, h - B * 2 - 4);
  ctx.strokeStyle = "rgba(255,246,216,.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(B - 5, B - 5, w - (B - 5) * 2, h - (B - 5) * 2);

  /* 回纹（雷纹）带 */
  ctx.strokeStyle = "rgba(90,50,10,.85)";
  ctx.lineWidth = Math.max(2, B * 0.07);
  ctx.lineCap = "square";
  const u = B * 0.42;
  function meanderH(x, y, len, flip) {
    for (let x0 = x; x0 < x + len - u; x0 += u) {
      ctx.beginPath();
      const d = flip ? -1 : 1;
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + u * 0.85, y);
      ctx.lineTo(x0 + u * 0.85, y + d * u * 0.55);
      ctx.lineTo(x0 + u * 0.2, y + d * u * 0.55);
      ctx.lineTo(x0 + u * 0.2, y + d * u * 0.18);
      ctx.stroke();
    }
  }
  function meanderV(x, y, len, flip) {
    for (let y0 = y; y0 < y + len - u; y0 += u) {
      ctx.beginPath();
      const d = flip ? -1 : 1;
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + u * 0.85);
      ctx.lineTo(x + d * u * 0.55, y0 + u * 0.85);
      ctx.lineTo(x + d * u * 0.55, y0 + u * 0.2);
      ctx.lineTo(x + d * u * 0.18, y0 + u * 0.2);
      ctx.stroke();
    }
  }
  const m = B * 0.18;
  meanderH(B + m, B * 0.5, w - (B + m) * 2, 1);
  meanderH(B + m, h - B * 0.5, w - (B + m) * 2, -1);
  meanderV(B * 0.5, B + m, h - (B + m) * 2, 1);
  meanderV(w - B * 0.5, B + m, h - (B + m) * 2, -1);

  /* 四角菱花（朱砂） */
  ctx.fillStyle = "#d24030";
  const corners = [
    [B * 0.5, B * 0.5], [w - B * 0.5, B * 0.5],
    [B * 0.5, h - B * 0.5], [w - B * 0.5, h - B * 0.5],
  ];
  corners.forEach(([x, y]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-B * 0.11, -B * 0.11, B * 0.22, B * 0.22);
    ctx.restore();
  });
  return toTexture(canvas);
}

/* ---------------- ⑧ 照片占位纹理 ---------------- */
export function makePlaceholderTexture(w = 512, h = 640) {
  const { canvas, ctx } = makeCanvas(w, h);

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#5a1018");
  bg.addColorStop(0.55, "#3a0a10");
  bg.addColorStop(1, "#2a060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  /* 囍字水印 */
  ctx.globalAlpha = 0.1;
  goldText(ctx, "囍", w / 2, h * 0.4, Math.min(w, h) * 0.4);
  ctx.globalAlpha = 1;

  /* 虚线提示框 */
  ctx.strokeStyle = "rgba(240,214,138,.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  const rw = w * 0.62, rh = h * 0.5;
  ctx.strokeRect((w - rw) / 2, (h - rh) / 2 - h * 0.05, rw, rh);
  ctx.setLineDash([]);

  goldText(ctx, "轻点上传婚纱照", w / 2, h * 0.82, Math.min(w, h) * 0.075);
  return toTexture(canvas);
}

/* ---------------- ⑨ 视频银幕占位纹理 ---------------- */
export function makeScreenTexture(w = 960, h = 540) {
  const { canvas, ctx } = makeCanvas(w, h);

  const bg = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.6);
  bg.addColorStop(0, "#3a0a10");
  bg.addColorStop(1, "#1a0407");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.08;
  goldText(ctx, "囍", w / 2, h * 0.42, h * 0.5);
  ctx.globalAlpha = 1;

  /* 播放圆钮 */
  ctx.strokeStyle = "rgba(240,214,138,.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(240,214,138,.9)";
  ctx.beginPath();
  const px = w / 2, py = h / 2, s = h * 0.07;
  ctx.moveTo(px - s * 0.5, py - s);
  ctx.lineTo(px - s * 0.5, py + s);
  ctx.lineTo(px + s, py);
  ctx.closePath();
  ctx.fill();

  goldText(ctx, "上传你们的恋爱影片", w / 2, h * 0.8, h * 0.09);
  return toTexture(canvas);
}

/* ---------------- ⑩ 火漆封印纹理 ---------------- */
export function makeSealTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;

  const g = ctx.createRadialGradient(c * 0.8, c * 0.7, size * 0.1, c, c, size * 0.48);
  g.addColorStop(0, "#e0463e");
  g.addColorStop(0.7, "#a81c2a");
  g.addColorStop(1, "#6e0f18");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(240,214,138,.85)";
  ctx.lineWidth = size * 0.025;
  ctx.beginPath(); ctx.arc(c, c, size * 0.4, 0, Math.PI * 2); ctx.stroke();
  goldText(ctx, "囍", c, c + size * 0.01, size * 0.42);
  return toTexture(canvas);
}

/* ---------------- ⑪ 信封内请柬卡纹理 ---------------- */
export function makeCardTexture(w = 512, h = 384) {
  const { canvas, ctx } = makeCanvas(w, h);

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#a81c2a");
  bg.addColorStop(0.5, "#8f1420");
  bg.addColorStop(1, "#6e0f18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(240,214,138,.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84);
  ctx.strokeStyle = "rgba(240,214,138,.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w * 0.09, h * 0.12, w * 0.82, h * 0.76);

  goldText(ctx, "囍", w / 2, h * 0.42, h * 0.42);
  goldText(ctx, "请 柬", w / 2, h * 0.82, h * 0.13);
  return toTexture(canvas);
}

/* ---------------- ⑫ 喜鹊纹理（简约侧影） ---------------- */
export function makeMagpieTexture(w = 256, h = 160) {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.translate(w / 2, h / 2);

  /* 长尾 */
  ctx.fillStyle = "#1c1c22";
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, h * 0.05);
  ctx.lineTo(-w * 0.42, h * 0.22);
  ctx.lineTo(-w * 0.4, h * 0.1);
  ctx.lineTo(-w * 0.08, -h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2c2c34";
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, h * 0.02);
  ctx.lineTo(-w * 0.38, h * 0.3);
  ctx.lineTo(-w * 0.34, h * 0.18);
  ctx.lineTo(-w * 0.06, h * 0.0);
  ctx.closePath();
  ctx.fill();

  /* 身 */
  ctx.fillStyle = "#14141a";
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.16, h * 0.26, -0.3, 0, Math.PI * 2);
  ctx.fill();
  /* 白腹 */
  ctx.fillStyle = "#f2ead8";
  ctx.beginPath();
  ctx.ellipse(w * 0.03, h * 0.12, w * 0.11, h * 0.15, -0.3, 0, Math.PI * 2);
  ctx.fill();
  /* 头 */
  ctx.fillStyle = "#14141a";
  ctx.beginPath();
  ctx.arc(w * 0.15, -h * 0.2, h * 0.13, 0, Math.PI * 2);
  ctx.fill();
  /* 白颊 */
  ctx.fillStyle = "#f2ead8";
  ctx.beginPath();
  ctx.ellipse(w * 0.18, -h * 0.16, h * 0.07, h * 0.05, 0.4, 0, Math.PI * 2);
  ctx.fill();
  /* 喙 */
  ctx.fillStyle = "#d4af37";
  ctx.beginPath();
  ctx.moveTo(w * 0.24, -h * 0.22);
  ctx.lineTo(w * 0.34, -h * 0.18);
  ctx.lineTo(w * 0.24, -h * 0.14);
  ctx.closePath();
  ctx.fill();
  return toTexture(canvas);
}

/* ================= 3D 构件 ================= */

/* 灯笼 */
export function buildLantern(scale = 1) {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    map: makeLanternTexture(),
    emissive: new THREE.Color(0xc8342a),
    emissiveIntensity: 0.55,
    roughness: 0.65,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), bodyMat);
  body.scale.y = 0.92;
  g.add(body);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.75, roughness: 0.3,
    emissive: 0x3a2a08, emissiveIntensity: 0.4,
  });
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 16), goldMat);
  capTop.position.y = 0.55;
  const capBot = capTop.clone();
  capBot.position.y = -0.55;
  g.add(capTop, capBot);

  /* 提绳（加长，顶端挂环用于挂到头顶红绸/主绳） */
  const cordLen = 1.9;
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, cordLen, 6),
    new THREE.MeshBasicMaterial({ color: 0xd4af37 })
  );
  cord.position.y = 0.61 + cordLen / 2;
  g.add(cord);
  /* 挂环（提绳与主绳连接） */
  const cordRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 8, 24), goldMat);
  cordRing.position.y = 0.61 + cordLen;
  cordRing.rotation.x = Math.PI / 2;
  g.add(cordRing);

  /* 流苏 */
  const tassel = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.34, 10),
    new THREE.MeshStandardMaterial({ color: 0xd24030, emissive: 0x5a0d10, emissiveIntensity: 0.5 })
  );
  tassel.position.y = -0.8;
  tassel.rotation.x = Math.PI;
  g.add(tassel);
  const tCord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6),
    new THREE.MeshBasicMaterial({ color: 0xd4af37 })
  );
  tCord.position.y = -0.62;
  g.add(tCord);

  /* 光晕（置于灯身后方，避免近看遮挡） */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 150, 90]),
    transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(2.6, 2.6, 1);
  glow.position.z = -0.4;
  g.add(glow);

  g.scale.setScalar(scale);
  g.userData.swayPhase = Math.random() * Math.PI * 2;
  return g;
}

/* 窗棂金边相框（含照片平面）——立体金边 + 卡纸衬边 + 厚度背板 */
export function buildPhotoFrame(w, h) {
  const g = new THREE.Group();

  /* 背板：深红实木，带厚度与侧边阴影 */
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.62, h + 0.62, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x2e0810, roughness: 0.8, metalness: 0.15 })
  );
  back.position.z = -0.11;
  g.add(back);

  /* 卡纸衬边（暗红绢色，隔开照片与金边，像真实装裱） */
  const linerMat = new THREE.MeshStandardMaterial({ color: 0x57101a, roughness: 0.95, metalness: 0 });
  const linerB = 0.12;
  const linerTop = new THREE.Mesh(new THREE.BoxGeometry(w + linerB * 2, linerB, 0.05), linerMat);
  linerTop.position.set(0, h / 2 + linerB / 2, 0.01);
  const linerBot = linerTop.clone();
  linerBot.position.y = -(h / 2 + linerB / 2);
  const linerLeft = new THREE.Mesh(new THREE.BoxGeometry(linerB, h, 0.05), linerMat);
  linerLeft.position.set(-(w / 2 + linerB / 2), 0, 0.01);
  const linerRight = linerLeft.clone();
  linerRight.position.x = w / 2 + linerB / 2;
  g.add(linerTop, linerBot, linerLeft, linerRight);

  /* 照片面（占位纹理，上传后替换 map）
     MeshBasicMaterial：不受暖光染色、不参与 ACES 色调映射、不受雾影响 → 照片色彩准确不发黄 */
  const photoMat = new THREE.MeshBasicMaterial({
    map: makePlaceholderTexture(1024, Math.round((1024 * h) / w)),
    toneMapped: false, fog: false,
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat);
  photo.position.z = 0.035;
  g.add(photo);

  /* 立体金边：清漆物理材质，金属光泽 + 高光 */
  const goldFrameMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9b45c, metalness: 0.65, roughness: 0.3,
    clearcoat: 0.55, clearcoatRoughness: 0.35,
    emissive: 0x241a06, emissiveIntensity: 0.3,
  });
  const t = 0.17;
  const barH = new THREE.BoxGeometry(w + 0.56, t, 0.18);
  const barV = new THREE.BoxGeometry(t, h + 0.4, 0.18);
  const barTop = new THREE.Mesh(barH, goldFrameMat);
  barTop.position.set(0, h / 2 + linerB + t / 2, 0.08);
  const barBot = barTop.clone();
  barBot.position.y = -(h / 2 + linerB + t / 2);
  const barLeft = new THREE.Mesh(barV, goldFrameMat);
  barLeft.position.set(-(w / 2 + linerB + t / 2), 0, 0.07);
  const barRight = barLeft.clone();
  barRight.position.x = w / 2 + linerB + t / 2;
  g.add(barTop, barBot, barLeft, barRight);

  /* 四角金钉（精致细节） */
  const studGeo = new THREE.SphereGeometry(0.06, 12, 10);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const stud = new THREE.Mesh(studGeo, goldFrameMat);
    stud.position.set(sx * (w / 2 + linerB + t / 2), sy * (h / 2 + linerB + t / 2), 0.18);
    g.add(stud);
  });

  /* 金色窗棂花纹薄片（贴在金边上，中式装饰纹理） */
  const frameMat = new THREE.MeshStandardMaterial({
    map: makeFrameTexture(512, Math.round((512 * h) / w)),
    transparent: true,
    roughness: 0.32, metalness: 0.75,
    emissive: 0x2a1e06, emissiveIntensity: 0.35,
  });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.62, h + 0.62), frameMat);
  frame.position.z = 0.175;
  g.add(frame);

  /* 背后柔光晕 */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 190, 110]),
    transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(w * 2.4, h * 2.2, 1);
  glow.position.z = -0.6;
  g.add(glow);

  g.userData.photo = photo;
  g.userData.photoMat = photoMat;
  return g;
}

/* 视频银幕 */
export function buildScreen(w, h) {
  const g = new THREE.Group();

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.4, h + 0.4, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x2a060a, roughness: 0.7, metalness: 0.2 })
  );
  back.position.z = -0.08;
  g.add(back);

  const screenMat = new THREE.MeshBasicMaterial({
    map: makeScreenTexture(960, 540),
    toneMapped: false,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
  g.add(screen);

  const frameMat = new THREE.MeshStandardMaterial({
    map: makeFrameTexture(960, 540),
    transparent: true,
    roughness: 0.32, metalness: 0.75,
    emissive: 0x2a1e06, emissiveIntensity: 0.35,
  });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.55, h + 0.55), frameMat);
  frame.position.z = 0.06;
  g.add(frame);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 190, 110]),
    transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(w * 1.9, h * 2.6, 1);
  glow.position.z = -0.6;
  g.add(glow);

  g.userData.screen = screen;
  g.userData.screenMat = screenMat;
  return g;
}

/* 囍字金匾 */
export function buildMedallion(radius) {
  const g = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({
      map: makeXiTexture(768, { ring: false }),
      roughness: 0.4, metalness: 0.35,
      emissive: 0x3a0a10, emissiveIntensity: 0.28,
    })
  );
  g.add(disc);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.02, radius * 0.035, 12, 64),
    new THREE.MeshStandardMaterial({
      color: 0xd4af37, metalness: 0.85, roughness: 0.28,
      emissive: 0x4a3508, emissiveIntensity: 0.5,
    })
  );
  ring.position.z = 0.03;
  g.add(ring);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 200, 120]),
    transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(radius * 5.2, radius * 5.2, 1);
  glow.position.z = -0.8;
  g.add(glow);

  return g;
}

/* 红绸（沿曲线的飘带管） */
export function buildRibbon(points, radius = 0.1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 120, radius, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb01e28,
    roughness: 0.55,
    metalness: 0.15,
    emissive: 0x4a0a12,
    emissiveIntensity: 0.45,
  });
  return new THREE.Mesh(geo, mat);
}

/* 红金信封 */
export function buildEnvelope() {
  const g = new THREE.Group();
  const W = 4.4, H = 3.1, D = 0.14;

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xa81c2a, roughness: 0.6, metalness: 0.12,
    emissive: 0x2a0508, emissiveIntensity: 0.4,
  });
  const redDarkMat = new THREE.MeshStandardMaterial({
    color: 0x8f1420, roughness: 0.65, metalness: 0.1,
    emissive: 0x2a0508, emissiveIntensity: 0.35,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.8, roughness: 0.3,
    emissive: 0x3a2a08, emissiveIntensity: 0.4,
  });

  /* 封背 */
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), redMat);
  g.add(back);

  /* 金色镶边 */
  const trimT = 0.09;
  const trimTop = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, trimT, D + 0.08), goldMat);
  trimTop.position.y = H / 2 - trimT / 2;
  const trimBot = trimTop.clone();
  trimBot.position.y = -H / 2 + trimT / 2;
  const trimL = new THREE.Mesh(new THREE.BoxGeometry(trimT, H, D + 0.08), goldMat);
  trimL.position.x = -W / 2 + trimT / 2;
  const trimR = trimL.clone();
  trimR.position.x = W / 2 - trimT / 2;
  g.add(trimTop, trimBot, trimL, trimR);

  /* 封面前片（下半身） */
  const frontH = H * 0.62;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, frontH), redDarkMat);
  front.position.set(0, -H / 2 + frontH / 2 + 0.02, D / 2 + 0.01);
  g.add(front);

  /* 三角封盖（以顶边为轴） */
  const flapShape = new THREE.Shape();
  const flapH = H * 0.52;
  flapShape.moveTo(-W / 2, 0);
  flapShape.lineTo(W / 2, 0);
  flapShape.lineTo(0, -flapH);
  flapShape.closePath();
  const flapGeo = new THREE.ShapeGeometry(flapShape);
  const flap = new THREE.Mesh(flapGeo, redMat);
  /* 轴平移到顶部：几何体在 y≤0，把网格原点放在封顶 */
  flap.position.set(0, H / 2 - 0.02, D / 2 + 0.03);
  /* 双面（翻开时可见背面） */
  flap.material = new THREE.MeshStandardMaterial({
    color: 0xa81c2a, roughness: 0.6, metalness: 0.12,
    emissive: 0x2a0508, emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  });
  g.add(flap);

  /* 火漆封印 */
  const seal = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshStandardMaterial({
      map: makeSealTexture(256),
      roughness: 0.5, metalness: 0.3,
      emissive: 0x3a0a10, emissiveIntensity: 0.4,
    })
  );
  seal.position.set(0, H / 2 - flapH + 0.25, D / 2 + 0.1);
  g.add(seal);

  /* 内请柬卡（初始藏于封内） */
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.5, H - 0.5),
    new THREE.MeshStandardMaterial({
      map: makeCardTexture(512, 384),
      roughness: 0.5, metalness: 0.25,
      emissive: 0x3a0a10, emissiveIntensity: 0.35,
    })
  );
  card.position.set(0, -H - 0.4, D / 2 + 0.06);
  g.add(card);

  g.userData.flap = flap;
  g.userData.seal = seal;
  g.userData.card = card;
  g.userData.envelope = true;
  g.userData.W = W;
  g.userData.H = H;
  return g;
}

/* ---------------- 卷轴画心纹理（红绢金囍） ---------------- */
export function makeScrollTexture(w = 512, h = 704) {
  const { canvas, ctx } = makeCanvas(w, h);

  /* 朱砂绢底 */
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#b21e2c");
  bg.addColorStop(0.5, "#931724");
  bg.addColorStop(1, "#6e0f1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  /* 织锦暗纹（菱格） */
  ctx.save();
  ctx.strokeStyle = "rgba(240,214,138,.07)";
  ctx.lineWidth = 1;
  const step = w * 0.09;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
  }
  ctx.restore();

  /* 金色双线边框 */
  ctx.strokeStyle = "rgba(240,214,138,.92)";
  ctx.lineWidth = 5;
  ctx.strokeRect(w * 0.07, h * 0.045, w * 0.86, h * 0.91);
  ctx.strokeStyle = "rgba(156,107,38,.75)";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.10, h * 0.07, w * 0.80, h * 0.86);

  /* 四角祥云角花 */
  ctx.strokeStyle = "rgba(240,214,138,.85)";
  ctx.lineWidth = 3;
  const corner = (cx, cy, sx, sy) => {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sx, sy);
    spiral(ctx, 0, 0, w * 0.075, 1.4, 1);
    ctx.restore();
  };
  corner(w * 0.14, h * 0.12, 1, 1);
  corner(w * 0.86, h * 0.12, -1, 1);
  corner(w * 0.14, h * 0.88, 1, -1);
  corner(w * 0.86, h * 0.88, -1, -1);

  /* 文字 */
  goldText(ctx, "百 年 好 合", w / 2, h * 0.13, h * 0.058);
  goldText(ctx, "囍", w / 2, h * 0.47, h * 0.40);
  goldText(ctx, "请 柬", w / 2, h * 0.78, h * 0.12);
  goldText(ctx, "恭 请 光 临", w / 2, h * 0.905, h * 0.045);
  return toTexture(canvas);
}

/* ================= 卷轴（开场互动：解绳 → 摊开） ================= */
export function buildScroll() {
  const g = new THREE.Group();
  const W = 3.4, H = 4.4;

  const redRodMat = new THREE.MeshStandardMaterial({
    color: 0x7a0f1c, roughness: 0.45, metalness: 0.25,
    emissive: 0x2a0508, emissiveIntensity: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.8, roughness: 0.28,
    emissive: 0x3a2a08, emissiveIntensity: 0.45,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xd23a3a, roughness: 0.6, metalness: 0.1,
    emissive: 0x4a0a10, emissiveIntensity: 0.4,
  });

  /* ---------- 画心（可展开纸面，顶点逐排摊开） ---------- */
  const paperGeo = new THREE.PlaneGeometry(W, H, 1, 64);
  paperGeo.translate(0, -H / 2, 0);          // 顶点 y：0（天杆处）→ -H（地杆处）
  const baseY = paperGeo.attributes.position.array.slice();
  const paperMat = new THREE.MeshStandardMaterial({
    map: makeScrollTexture(2048, 2816),
    roughness: 0.62, metalness: 0.08,
    emissive: 0x2a0508, emissiveIntensity: 0.32,
    side: THREE.DoubleSide,
  });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  paper.position.z = 0.02;
  g.add(paper);

  /* ---------- 天杆（细）+ 金轴头 ---------- */
  const topRod = new THREE.Group();
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, W + 0.3, 20), redRodMat);
  topBar.rotation.z = Math.PI / 2;
  topRod.add(topBar);
  [-1, 1].forEach((s) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 16), goldMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = s * (W / 2 + 0.18);
    topRod.add(cap);
  });
  g.add(topRod);

  /* ---------- 地杆（粗）+ 金轴头 ---------- */
  const bottomRod = new THREE.Group();
  const botBar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, W + 0.42, 22), redRodMat);
  botBar.rotation.z = Math.PI / 2;
  bottomRod.add(botBar);
  [-1, 1].forEach((s) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 16), goldMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = s * (W / 2 + 0.27);
    bottomRod.add(cap);
  });
  g.add(bottomRod);

  /* ---------- 挂绳（天杆两端汇于上方金环） ---------- */
  const cordLen = Math.sqrt(Math.pow(W / 2 - 0.1, 2) + Math.pow(1.5, 2));
  const cordAngle = Math.atan2(W / 2 - 0.1, 1.5);
  [-1, 1].forEach((s) => {
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, cordLen, 6), goldMat
    );
    cord.position.set(s * (W / 2 - 0.1) / 2, 0.78, 0);
    cord.rotation.z = s * cordAngle;
    g.add(cord);
  });
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 10, 32), goldMat);
  hook.position.set(0, 1.56, 0);
  g.add(hook);

  /* ---------- 红绳（系于卷腰）+ 囍坠 ---------- */
  const ropeGroup = new THREE.Group();
  /* 绳圈（环绕卷轴） */
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.032, 10, 48), ropeMat);
  band.rotation.y = Math.PI / 2;
  band.position.y = -0.18;
  ropeGroup.add(band);
  /* 绳结 */
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), ropeMat);
  knot.position.set(0, -0.18, 0.38);
  ropeGroup.add(knot);
  /* 垂绳 */
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), ropeMat);
  string.position.set(0, -0.5, 0.38);
  ropeGroup.add(string);
  /* 囍坠 */
  const charm = new THREE.Group();
  const charmMat = new THREE.MeshStandardMaterial({
    map: makeXiTexture(768, { ring: false }),
    roughness: 0.4, metalness: 0.35,
    /* 自发光压低：过强的红光晕会把囍字细节冲淡 */
    emissive: 0x3a0a10, emissiveIntensity: 0.28,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 64), charmMat);
  charm.add(disc);
  const charmRing = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.025, 10, 40), goldMat);
  charmRing.position.z = 0.02;
  charm.add(charmRing);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), goldMat);
  bead.position.y = 0.32;
  charm.add(bead);
  charm.position.set(0, -0.92, 0.38);
  ropeGroup.add(charm);
  g.add(ropeGroup);

  /* ---------- 背后柔光晕 ---------- */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 190, 110]),
    transparent: true, opacity: 0.26,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(W * 2.1, H * 1.7, 1);
  glow.position.set(0, -H / 2, -0.9);
  g.add(glow);

  /* 收集可淡出材质 */
  const fadeMats = [];
  g.traverse((o) => {
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (!fadeMats.includes(m)) fadeMats.push(m); });
    }
  });

  g.userData = {
    W, H, paper, paperGeo, baseY,
    topRod, bottomRod, ropeGroup, band, charm,
    paperMat, charmMat, glow, fadeMats, p: 0,
  };
  updateScroll(g, 0);
  return g;
}

/* 卷轴展开进度 p：0 卷起 → 1 完全摊开 */
export function updateScroll(g, p) {
  const { H, paperGeo, baseY, topRod, bottomRod } = g.userData;
  g.userData.p = p;
  const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;  // easeInOut
  const topY = 0.06 * e;
  const botY = -0.26 + (-H - 0.02 + 0.26) * e;
  topRod.position.y = topY;
  bottomRod.position.y = botY;

  const pos = paperGeo.attributes.position;
  const flatLen = e * H;
  for (let i = 0; i < pos.count; i++) {
    const s = -baseY[i * 3 + 1];            // 距天杆的纸面长度
    if (s <= flatLen) {
      pos.setY(i, topY - s);
      pos.setZ(i, 0);
    } else {
      /* 未摊开部分藏于地杆筒内 */
      pos.setY(i, botY + 0.04);
      pos.setZ(i, -0.2);
    }
  }
  pos.needsUpdate = true;
}
