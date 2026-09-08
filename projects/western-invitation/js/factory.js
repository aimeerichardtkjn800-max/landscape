/* ============ factory.js · 西式程序化纹理与 3D 构件 ============
   全部贴图由 Canvas 程序化生成，无需外部图片素材
   色系：香槟金 / 象牙白 / 浅玫瑰金 / 暖光
====================================================== */
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

/* ---------------- 基础工具 ---------------- */
function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
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

const SERIF = '"Cormorant Garamond","Playfair Display",Georgia,"Times New Roman",serif';

/* 香槟金渐变文字 */
function goldText(ctx, text, x, y, size, align = "center") {
  const g = ctx.createLinearGradient(0, y - size, 0, y + size * 0.2);
  g.addColorStop(0, "#9c6b26");
  g.addColorStop(0.35, "#f0d68a");
  g.addColorStop(0.55, "#fff6d8");
  g.addColorStop(0.75, "#d4af37");
  g.addColorStop(1, "#8a5a1e");
  ctx.fillStyle = g;
  ctx.font = `italic bold ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(240,200,110,.5)";
  ctx.shadowBlur = size * 0.16;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/* 象牙白文字 */
function ivoryText(ctx, text, x, y, size, align = "center") {
  ctx.fillStyle = "#fbf6ec";
  ctx.font = `italic ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(180,140,90,.4)";
  ctx.shadowBlur = size * 0.1;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/* ---------------- ① 象牙白丝绸纹理 ---------------- */
export function makeSilkTexture(size = 512) {
  const { canvas, ctx } = makeCanvas(size, size);
  /* 象牙白底 */
  const bg = ctx.createRadialGradient(size * 0.4, size * 0.35, size * 0.05, size / 2, size / 2, size * 0.7);
  bg.addColorStop(0, "#fbf6ec");
  bg.addColorStop(0.6, "#f3ead8");
  bg.addColorStop(1, "#e0d2bc");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  /* 丝绸经纬斜纹（极淡） */
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = "#c9b896";
  ctx.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
  }
  /* 微噪点 */
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#c9b896";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  ctx.globalAlpha = 1;

  /* 边缘暗化（折光） */
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.55);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(120,90,50,0.18)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/* ---------------- ② 玫瑰金火漆印章纹理（刻 XXX） ---------------- */
export function makeWaxSealTexture(size = 256, name = "XXX") {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;

  /* 玫瑰金火漆体 */
  const g = ctx.createRadialGradient(c * 0.75, c * 0.65, size * 0.08, c, c, size * 0.48);
  g.addColorStop(0, "#f0c4b0");
  g.addColorStop(0.5, "#e3b1a0");
  g.addColorStop(0.85, "#b8866e");
  g.addColorStop(1, "#8a5a48");
  ctx.fillStyle = g;
  ctx.beginPath();
  /* 不规则圆边（火漆自然流形） */
  const pts = 32;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 7) * 0.04 + Math.sin(a * 13) * 0.025;
    const r = size * 0.46 * wobble;
    const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  /* 高光圈 */
  ctx.strokeStyle = "rgba(255,240,220,.5)";
  ctx.lineWidth = size * 0.02;
  ctx.beginPath(); ctx.arc(c, c, size * 0.4, 0, Math.PI * 2); ctx.stroke();

  /* 内圈金线 */
  ctx.strokeStyle = "rgba(212,175,55,.8)";
  ctx.lineWidth = size * 0.012;
  ctx.beginPath(); ctx.arc(c, c, size * 0.36, 0, Math.PI * 2); ctx.stroke();

  /* 刻字 XXX（花体衬线） */
  goldText(ctx, name, c, c + size * 0.01, size * 0.4);

  /* 边缘暗影 */
  const edge = ctx.createRadialGradient(c, c, size * 0.3, c, c, size * 0.46);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(80,40,20,0.35)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/* ---------------- ③ 玫瑰花纹理（拱门装饰用，正面单朵） ---------------- */
export function makeRoseTexture(size = 128, color = "white") {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  const cols = color === "pink"
    ? [["#f5d4d0", "#e8c4c0"], ["#d89a96", "#b8706a"]]
    : [["#fffafa", "#f5ece6"], ["#e0d0c4", "#c0a096"]];
  /* 外层花瓣 */
  for (let layer = 0; layer < 3; layer++) {
    const r = size * (0.4 - layer * 0.1);
    const petals = 6 - layer;
    ctx.fillStyle = cols[layer === 2 ? 1 : 0][layer === 2 ? 1 : 0];
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + layer * 0.4;
      ctx.beginPath();
      ctx.ellipse(
        c + Math.cos(a) * r * 0.5, c + Math.sin(a) * r * 0.5,
        r * 0.55, r * 0.4, a, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  /* 中心花蕊 */
  ctx.fillStyle = cols[1][1];
  ctx.beginPath(); ctx.arc(c, c, size * 0.08, 0, Math.PI * 2); ctx.fill();
  /* 高光 */
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath(); ctx.arc(c - size * 0.05, c - size * 0.05, size * 0.06, 0, Math.PI * 2); ctx.fill();
  return toTexture(canvas);
}

/* ---------------- ④ 尤加利叶藤蔓纹理 ---------------- */
export function makeEucalyptusTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  /* 主茎 */
  ctx.strokeStyle = "#7d8c6e";
  ctx.lineWidth = size * 0.018;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.bezierCurveTo(size * 0.1, -size * 0.2, -size * 0.1, size * 0.15, 0, size * 0.45);
  ctx.stroke();
  /* 对生叶片 */
  const leafCol = ctx.createLinearGradient(0, 0, size * 0.3, 0);
  leafCol.addColorStop(0, "#a8b89a");
  leafCol.addColorStop(1, "#7d8c6e");
  ctx.fillStyle = leafCol;
  for (let i = -4; i <= 4; i++) {
    const y = i * size * 0.1;
    const side = i % 2 === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(0, y);
    ctx.rotate(side * 0.6);
    ctx.beginPath();
    ctx.ellipse(side * size * 0.15, 0, size * 0.14, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return toTexture(canvas);
}

/* ---------------- ⑤ 大理石纹理（立柱/地面） ---------------- */
export function makeMarbleTexture(size = 512, variant = "floor") {
  const { canvas, ctx } = makeCanvas(size, size);
  const base = variant === "pillar" ? "#f5f0e8" : "#ece4d4";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  /* 大理石纹理：随机贝塞尔 veins */
  const veinCol = variant === "pillar" ? "rgba(180,160,130,.5)" : "rgba(160,140,100,.55)";
  ctx.strokeStyle = veinCol;
  ctx.lineWidth = variant === "pillar" ? 1.5 : 2;
  const rnd = App.hashRandom("marble-" + variant);
  for (let v = 0; v < 8; v++) {
    ctx.globalAlpha = 0.3 + rnd() * 0.4;
    ctx.beginPath();
    let x = rnd() * size, y = rnd() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      const cx = x + (rnd() - 0.5) * size * 0.4;
      const cy = y + (rnd() - 0.5) * size * 0.3;
      x += (rnd() - 0.5) * size * 0.5;
      y += (rnd() - 0.5) * size * 0.5;
      ctx.quadraticCurveTo(cx, cy, x, y);
    }
    ctx.stroke();
  }
  /* 细密纹 */
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 0.8;
  for (let v = 0; v < 20; v++) {
    ctx.beginPath();
    const x1 = rnd() * size, y1 = rnd() * size;
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x1 + (rnd() - 0.5) * 200, y1 + (rnd() - 0.5) * 200,
      x1 + (rnd() - 0.5) * 300, y1 + (rnd() - 0.5) * 300);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* 地面加斜反射高光 */
  if (variant === "floor") {
    const shine = ctx.createLinearGradient(0, 0, size, size);
    shine.addColorStop(0, "rgba(255,250,240,.25)");
    shine.addColorStop(0.5, "rgba(255,250,240,0)");
    shine.addColorStop(1, "rgba(255,250,240,.15)");
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, size, size);
  }
  return toTexture(canvas);
}

/* ---------------- ⑥ 金雕花边框纹理（4:3，中心透明） ---------------- */
export function makeGoldFrameTexture(w = 512, h = 384) {
  const { canvas, ctx } = makeCanvas(w, h);
  const B = Math.min(w, h) * 0.08;

  /* 外框金色渐变底 */
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

  /* 内沿象牙白衬边 */
  ctx.strokeStyle = "rgba(251,246,236,.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(B - 4, B - 4, w - (B - 4) * 2, h - (B - 4) * 2);
  ctx.strokeStyle = "rgba(120,90,50,.6)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(B + 2, B + 2, w - (B + 2) * 2, h - (B + 2) * 2);

  /* 茛苕叶纹（acanthus，西式装饰，代替中式回纹） */
  ctx.strokeStyle = "rgba(90,50,10,.7)";
  ctx.lineWidth = Math.max(1.5, B * 0.06);
  ctx.lineCap = "round";
  const acanthus = (cx, cy, scale, flip) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale * (flip ? -1 : 1), scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(B * 0.3, -B * 0.15, B * 0.5, -B * 0.05, B * 0.6, B * 0.2);
    ctx.bezierCurveTo(B * 0.4, B * 0.1, B * 0.2, B * 0.15, 0, B * 0.05);
    ctx.stroke();
    ctx.restore();
  };
  const m = B * 0.2;
  for (let x = B + m; x < w - B - m; x += B * 0.55) {
    acanthus(x, B * 0.5, 1, false);
    acanthus(x, h - B * 0.5, 1, false);
  }
  for (let y = B + m; y < h - B - m; y += B * 0.55) {
    acanthus(B * 0.5, y, 1, true);
    acanthus(w - B * 0.5, y, 1, true);
  }

  /* 四角玫瑰金花饰 */
  ctx.fillStyle = "#e3b1a0";
  const corners = [[B * 0.5, B * 0.5], [w - B * 0.5, B * 0.5],
    [B * 0.5, h - B * 0.5], [w - B * 0.5, h - B * 0.5]];
  corners.forEach(([x, y]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-B * 0.12, -B * 0.12, B * 0.24, B * 0.24);
    ctx.restore();
  });
  return toTexture(canvas);
}

/* ---------------- ⑦ 象牙白磨砂信息卡纹理 ---------------- */
export function makeInfoCardTexture(w = 512, h = 384) {
  const { canvas, ctx } = makeCanvas(w, h);
  /* 象牙白磨砂底 */
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#fbf6ec");
  bg.addColorStop(0.5, "#f5ede0");
  bg.addColorStop(1, "#ece2d0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  /* 磨砂噪点 */
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#c9b896";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.globalAlpha = 1;

  /* 双线金描边 */
  ctx.strokeStyle = "rgba(212,175,55,.85)";
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.06, h * 0.06, w * 0.88, h * 0.88);
  ctx.strokeStyle = "rgba(212,175,55,.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w * 0.09, h * 0.09, w * 0.82, h * 0.82);

  /* 四角小花饰 */
  ctx.fillStyle = "rgba(212,175,55,.7)";
  const cs = h * 0.04;
  [[w * 0.1, h * 0.1], [w * 0.9, h * 0.1], [w * 0.1, h * 0.9], [w * 0.9, h * 0.9]].forEach(([x, y]) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-cs / 2, -cs / 2, cs, cs);
    ctx.restore();
  });
  return toTexture(canvas);
}

/* ---------------- ⑧ 星空光斑纹理 ---------------- */
export function makeStarfieldTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, size, size);
  const rnd = App.hashRandom("starfield");
  /* 小星点 */
  for (let i = 0; i < 80; i++) {
    const x = rnd() * size, y = rnd() * size;
    const r = rnd() * 1.5 + 0.5;
    ctx.fillStyle = `rgba(255,250,230,${0.4 + rnd() * 0.5})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  /* 大星（十字星芒） */
  for (let i = 0; i < 6; i++) {
    const x = rnd() * size, y = rnd() * size;
    const r = rnd() * 3 + 2;
    ctx.fillStyle = "rgba(255,240,200,.9)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    /* 十字光 */
    ctx.strokeStyle = "rgba(255,240,200,.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - r * 3, y); ctx.lineTo(x + r * 3, y);
    ctx.moveTo(x, y - r * 3); ctx.lineTo(x, y + r * 3);
    ctx.stroke();
  }
  return toTexture(canvas);
}

/* ---------------- ⑨ 玫瑰花瓣纹理（飘落粒子，浅粉） ---------------- */
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
  g.addColorStop(0, "#f5d4d0");
  g.addColorStop(0.45, "#e8c4c0");
  g.addColorStop(1, "#b8706a");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,210,210,.3)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.38);
  ctx.bezierCurveTo(-w * 0.04, 0, w * 0.04, -h * 0.2, 0, -h * 0.4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(240,214,138,.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return toTexture(canvas);
}

/* ---------------- ⑩ 金色碎星光斑 ---------------- */
export function makeFleckTexture(size = 64) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,246,216,1)");
  g.addColorStop(0.35, "rgba(240,214,138,.8)");
  g.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(c, c, c * 0.22, c, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(c, c, c, c * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  return toTexture(canvas);
}

/* ---------------- ⑪ 柔光晕纹理 ---------------- */
export function makeGlowTexture(size = 256, rgb = [255, 200, 120]) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.9)`);
  grad.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.28)`);
  grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/* ---------------- ⑫ 照片占位纹理（象牙白底） ---------------- */
export function makePlaceholderTexture(w = 512, h = 384) {
  const { canvas, ctx } = makeCanvas(w, h);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f3ead8");
  bg.addColorStop(0.55, "#e9dcc6");
  bg.addColorStop(1, "#d9c8ac");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  /* 花体水印 */
  ctx.globalAlpha = 0.12;
  ivoryText(ctx, "&", w / 2, h * 0.42, Math.min(w, h) * 0.4);
  ctx.globalAlpha = 1;

  /* 虚线提示框 */
  ctx.strokeStyle = "rgba(212,175,55,.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  const rw = w * 0.62, rh = h * 0.5;
  ctx.strokeRect((w - rw) / 2, (h - rh) / 2, rw, rh);
  ctx.setLineDash([]);

  ivoryText(ctx, "Upload Photo", w / 2, h * 0.82, Math.min(w, h) * 0.07);
  return toTexture(canvas);
}

/* ---------------- ⑬ 地图纹理（场景6 浮层用） ---------------- */
export function makeMapTexture(w = 512, h = 384) {
  const { canvas, ctx } = makeCanvas(w, h);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f5ede0");
  bg.addColorStop(1, "#e9dcc6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  /* 道路网格 */
  ctx.strokeStyle = "rgba(180,160,130,.4)";
  ctx.lineWidth = 1;
  const rnd = App.hashRandom("map");
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(rnd() * w, 0);
    ctx.bezierCurveTo(rnd() * w, h * 0.3, rnd() * w, h * 0.6, rnd() * w, h);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(0, rnd() * h); ctx.lineTo(w, rnd() * h); ctx.stroke();
  }
  /* 地标 */
  const cx = w * 0.5, cy = h * 0.45;
  ctx.fillStyle = "#d4af37";
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9c6b26"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
  ivoryText(ctx, "Venue", cx, cy + 28, 16);
  return toTexture(canvas);
}

/* ================= 3D 构件 ================= */

/* 信封（象牙白丝绸 + 金边 + 火漆 XXX） */
export function buildEnvelope() {
  const g = new THREE.Group();
  const W = 4.4, H = 3.1, D = 0.14;
  const cfg = App.config.theme;

  const silkMat = new THREE.MeshStandardMaterial({
    map: makeSilkTexture(), roughness: 0.5, metalness: 0.05,
    emissive: 0x2a2218, emissiveIntensity: 0.12,
  });
  const silkDarkMat = new THREE.MeshStandardMaterial({
    map: makeSilkTexture(), roughness: 0.55, metalness: 0.04,
    emissive: 0x2a2218, emissiveIntensity: 0.1,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.8, roughness: 0.3,
    emissive: 0x3a2a08, emissiveIntensity: 0.4,
  });

  /* 封背 */
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), silkMat);
  g.add(back);

  /* 金色镶边 */
  const trimT = 0.09;
  const trims = [
    [new THREE.BoxGeometry(W + 0.06, trimT, D + 0.08), [0, H / 2 - trimT / 2, 0]],
    [new THREE.BoxGeometry(W + 0.06, trimT, D + 0.08), [0, -H / 2 + trimT / 2, 0]],
    [new THREE.BoxGeometry(trimT, H, D + 0.08), [-W / 2 + trimT / 2, 0, 0]],
    [new THREE.BoxGeometry(trimT, H, D + 0.08), [W / 2 - trimT / 2, 0, 0]],
  ];
  trims.forEach(([geo, pos]) => {
    const m = new THREE.Mesh(geo, goldMat);
    m.position.set(...pos);
    g.add(m);
  });

  /* 封面前片（下半身） */
  const frontH = H * 0.62;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, frontH), silkDarkMat);
  front.position.set(0, -H / 2 + frontH / 2 + 0.02, D / 2 + 0.01);
  g.add(front);

  /* 三角封盖（以顶边为轴翻开） */
  const flapShape = new THREE.Shape();
  const flapH = H * 0.52;
  flapShape.moveTo(-W / 2, 0);
  flapShape.lineTo(W / 2, 0);
  flapShape.lineTo(0, -flapH);
  flapShape.closePath();
  const flapGeo = new THREE.ShapeGeometry(flapShape);
  const flap = new THREE.Mesh(flapGeo, new THREE.MeshStandardMaterial({
    map: makeSilkTexture(), roughness: 0.5, metalness: 0.05,
    emissive: 0x2a2218, emissiveIntensity: 0.12, side: THREE.DoubleSide,
  }));
  flap.position.set(0, H / 2 - 0.02, D / 2 + 0.03);
  g.add(flap);

  /* 火漆封印（刻 XXX） */
  const seal = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshStandardMaterial({
      map: makeWaxSealTexture(256, App.config.groom),
      roughness: 0.5, metalness: 0.3,
      emissive: 0x4a2a18, emissiveIntensity: 0.25,
    })
  );
  seal.position.set(0, H / 2 - flapH + 0.25, D / 2 + 0.1);
  g.add(seal);

  /* 内请柬卡 */
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.5, H - 0.5),
    new THREE.MeshStandardMaterial({
      map: makeInfoCardTexture(512, 384),
      roughness: 0.5, metalness: 0.15,
      emissive: 0x2a2218, emissiveIntensity: 0.15,
    })
  );
  card.position.set(0, -H - 0.4, D / 2 + 0.06);
  g.add(card);

  /* 周围柔光晕 */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 230, 180]),
    transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(W * 2.2, H * 2.2, 1);
  glow.position.z = -0.6;
  g.add(glow);

  /* 收集可淡出材质 */
  const fadeMats = [];
  g.traverse((o) => {
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (!fadeMats.includes(m)) fadeMats.push(m); });
    }
  });

  g.userData = { W, H, flap, seal, card, fadeMats, glow, envelope: true };
  return g;
}

/* 大理石立柱（含金色柯林斯式柱头） */
export function buildPillar(height = 8) {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.8, roughness: 0.3,
    emissive: 0x3a2a08, emissiveIntensity: 0.35,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    map: makeMarbleTexture(512, "pillar"),
    roughness: 0.35, metalness: 0.15,
  });

  /* 柱身 */
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, height, 24, 1), pillarMat);
  shaft.position.y = 0;
  g.add(shaft);

  /* 柱头（柯林斯简化：涡卷 + 金色方座） */
  const capBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.85), goldMat);
  capBase.position.y = height / 2 + 0.12;
  g.add(capBase);
  /* 涡卷装饰 */
  for (let s of [-1, 1]) {
    const volute = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI * 1.5), goldMat);
    volute.position.set(s * 0.22, height / 2 + 0.32, 0);
    volute.rotation.set(Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
    g.add(volute);
  }
  /* 柱础 */
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), goldMat);
  base.position.y = -height / 2 - 0.1;
  g.add(base);
  return g;
}

/* 花园拱门（半圆拱 + 尤加利叶 + 白玫瑰） */
export function buildGardenArch(width = 6) {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.7, roughness: 0.35,
    emissive: 0x3a2a08, emissiveIntensity: 0.3,
  });

  /* 半圆拱曲线 */
  const pts = [];
  const segs = 40;
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI * (i / segs);
    pts.push(new THREE.Vector3(Math.cos(a) * width / 2, Math.sin(a) * 3.2, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const archGeo = new THREE.TubeGeometry(curve, 60, 0.1, 8, false);
  const arch = new THREE.Mesh(archGeo, goldMat);
  g.add(arch);

  /* 尤加利叶藤蔓沿拱分布 */
  const eucTex = makeEucalyptusTexture(256);
  const eucMat = new THREE.MeshStandardMaterial({
    map: eucTex, transparent: true, roughness: 0.6, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const eucCount = 14;
  for (let i = 0; i < eucCount; i++) {
    const t = i / (eucCount - 1);
    const p = curve.getPoint(t);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), eucMat);
    leaf.position.copy(p).add(new THREE.Vector3(0, 0, 0.05));
    leaf.rotation.z = Math.PI / 2 - Math.PI * t;
    leaf.rotation.y = (Math.random() - 0.5) * 0.6;
    g.add(leaf);
  }

  /* 白玫瑰沿拱分布（精灵） */
  const roseTex = makeRoseTexture(128, "white");
  const rosePinkTex = makeRoseTexture(128, "pink");
  const roseCount = 10;
  for (let i = 0; i < roseCount; i++) {
    const t = 0.1 + (i / roseCount) * 0.8;
    const p = curve.getPoint(t);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: i % 3 === 0 ? rosePinkTex : roseTex,
      transparent: true, depthWrite: false, opacity: 0.95,
    }));
    const s = 0.5 + Math.random() * 0.3;
    sp.scale.set(s, s, 1);
    sp.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, 0.12));
    g.add(sp);
  }
  return g;
}

/* 水晶吊灯 */
export function buildChandelier() {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.85, roughness: 0.25,
    emissive: 0x3a2a08, emissiveIntensity: 0.4,
  });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.1, roughness: 0.05,
    transmission: 0.6, transparent: true, opacity: 0.85,
    ior: 1.5, thickness: 0.5,
  });

  /* 中心主球 */
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), goldMat);
  g.add(core);

  /* 多臂（弧形管） */
  const armCount = 6;
  for (let i = 0; i < armCount; i++) {
    const a = (i / armCount) * Math.PI * 2;
    const armPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(a) * 0.3, -0.15, Math.sin(a) * 0.3),
      new THREE.Vector3(Math.cos(a) * 0.7, -0.35, Math.sin(a) * 0.7),
    ];
    const armCurve = new THREE.CatmullRomCurve3(armPts);
    const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 16, 0.04, 6, false), goldMat);
    g.add(arm);
    /* 臂端水晶球 */
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), crystalMat);
    crystal.position.set(Math.cos(a) * 0.75, -0.4, Math.sin(a) * 0.75);
    g.add(crystal);
    /* 臂端蜡烛灯（小球+光晕） */
    const candle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
    candle.position.set(Math.cos(a) * 0.75, -0.28, Math.sin(a) * 0.75);
    g.add(candle);
  }

  /* 顶部吊链 */
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), goldMat);
  chain.position.y = 0.6;
  g.add(chain);

  /* 暖黄光晕 */
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 220, 150]),
    transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(3.5, 3.5, 1);
  glow.position.set(0, -0.4, 0);
  g.add(glow);

  g.userData.glow = glow;
  g.userData.glowMat = glowMat;
  return g;
}

/* 殿堂镜面地面（分级：0=高光假反射，1=Reflector真反射）
   注意：Reflector 为 ES 模块直接导入，勿用 window.Reflector 判断（永远为 undefined）。 */
export function buildHallFloor(useReflector = false) {
  const marbleTex = makeMarbleTexture(512, "floor");
  if (useReflector) {
    const geo = new THREE.PlaneGeometry(46, 46);
    const mirror = new Reflector(geo, {
      textureWidth: Math.min(1024, Math.floor(window.innerWidth * 0.6)),
      textureHeight: Math.min(1024, Math.floor(window.innerHeight * 0.6)),
      color: 0x8d8070, /* 暖灰叠加色，保持镜面明亮 */
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = -3.5;
    /* 大理石半透明覆盖 */
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshStandardMaterial({
        map: marbleTex, transparent: true, opacity: 0.22,
        roughness: 0.12, metalness: 0.85,
      })
    );
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = -3.49;
    const grp = new THREE.Group();
    grp.add(mirror, overlay);
    grp.userData.mirror = mirror;
    return grp;
  }
  /* 移动端：高光大理石地面（低粗糙度 + 高金属度模拟镜面） */
  const mat = new THREE.MeshStandardMaterial({
    map: marbleTex, roughness: 0.16, metalness: 0.55,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.5;
  return floor;
}

/* 全局贯通式镜面大理石地面：横跨全部章节，可倒映照片墙 / 立柱 / 灯光，
   填补下半屏视觉空白。桌面高清档使用真 Reflector，移动端用高光大理石。 */
export function buildGrandFloor(useReflector = false) {
  const W = 50, L = 168, CY = -52; /* 覆盖 z≈32 → z≈-136 */
  const marbleTex = makeMarbleTexture(512, "floor");
  marbleTex.wrapS = marbleTex.wrapT = THREE.RepeatWrapping;
  marbleTex.repeat.set(6, 22);

  const grp = new THREE.Group();
  grp.position.set(0, -3.5, CY);

  if (useReflector) {
    const mirror = new Reflector(new THREE.PlaneGeometry(W, L), {
      textureWidth: Math.min(1024, Math.floor(window.innerWidth * 0.6)),
      textureHeight: Math.min(1024, Math.floor(window.innerHeight * 0.6)),
      color: 0x8d8070,
    });
    mirror.rotation.x = -Math.PI / 2;
    grp.add(mirror);
    grp.userData.mirror = mirror;

    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L),
      new THREE.MeshStandardMaterial({
        map: marbleTex, transparent: true, opacity: 0.2,
        roughness: 0.12, metalness: 0.85,
      })
    );
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.01;
    grp.add(overlay);
  } else {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L),
      new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.17, metalness: 0.55 })
    );
    floor.rotation.x = -Math.PI / 2;
    grp.add(floor);

    /* 暖光反光（模拟地面承接吊灯光晕，填补下半屏） */
    const sheenTex = makeGlowTexture(256, [255, 228, 170]);
    for (let k = 0; k < 5; k++) {
      const sheen = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial({
          map: sheenTex, transparent: true, opacity: 0.1,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
        })
      );
      sheen.rotation.x = -Math.PI / 2;
      sheen.position.set((k % 2 ? 1 : -1) * 2.5, 0.02, -k * 28);
      grp.add(sheen);
    }
  }
  return grp;
}

/* 殿堂组合（拱门 + 6立柱 + 吊灯 + 地面 + 天花板光晕） */
export function buildHall(useReflector = false) {
  const g = new THREE.Group();

  /* 拱门花门（中央） */
  const arch = buildGardenArch(7);
  arch.position.set(0, -3.5, 0);
  g.add(arch);

  /* 6 根立柱（左右各 3） */
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const p = buildPillar(7);
      p.position.set(side * 3.5, -3.5 + 3.5, -4 + i * 4);
      g.add(p);
    }
  }

  /* 水晶吊灯（拱门正上方） */
  const chandelier = buildChandelier();
  chandelier.position.set(0, 2.5, 0);
  g.add(chandelier);

  /* 地面由全局 buildGrandFloor 统一提供（跨章节镜面），此处不再添加 */

  /* 天花板光晕板 */
  const ceilGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 230, 190]),
    transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  ceilGlow.scale.set(16, 16, 1);
  ceilGlow.position.set(0, 4.2, 0);
  g.add(ceilGlow);

  g.userData.chandelier = chandelier;
  return g;
}

/* 4:3 金雕花相框（照片墙用） */
export function buildPhotoFrame(w, h) {
  const g = new THREE.Group();

  /* 背板：深棕实木 */
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.42, h + 0.42, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.8, metalness: 0.15 })
  );
  back.position.z = -0.09;
  g.add(back);

  /* 象牙白衬边 */
  const linerMat = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.9, metalness: 0 });
  const linerB = 0.08;
  const linerTop = new THREE.Mesh(new THREE.BoxGeometry(w + linerB * 2, linerB, 0.04), linerMat);
  linerTop.position.set(0, h / 2 + linerB / 2, 0.01);
  const linerBot = linerTop.clone(); linerBot.position.y = -(h / 2 + linerB / 2);
  const linerLeft = new THREE.Mesh(new THREE.BoxGeometry(linerB, h, 0.04), linerMat);
  linerLeft.position.set(-(w / 2 + linerB / 2), 0, 0.01);
  const linerRight = linerLeft.clone(); linerRight.position.x = w / 2 + linerB / 2;
  g.add(linerTop, linerBot, linerLeft, linerRight);

  /* 照片面（占位纹理，上传后替换 map） */
  const photoMat = new THREE.MeshBasicMaterial({
    map: makePlaceholderTexture(1024, Math.round((1024 * h) / w)),
    color: 0xffffff, transparent: false, blending: THREE.NormalBlending,
    toneMapped: false, fog: false,
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat);
  photo.position.z = 0.035;
  g.add(photo);

  /* 立体金边框（物理材质，金属光泽） */
  const goldFrameMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9b45c, metalness: 0.65, roughness: 0.3,
    clearcoat: 0.55, clearcoatRoughness: 0.35,
    emissive: 0x241a06, emissiveIntensity: 0.25,
  });
  const t = 0.13;
  const barH = new THREE.BoxGeometry(w + 0.36, t, 0.15);
  const barV = new THREE.BoxGeometry(t, h + 0.28, 0.15);
  const barTop = new THREE.Mesh(barH, goldFrameMat);
  barTop.position.set(0, h / 2 + linerB + t / 2, 0.06);
  const barBot = barTop.clone(); barBot.position.y = -(h / 2 + linerB + t / 2);
  const barLeft = new THREE.Mesh(barV, goldFrameMat);
  barLeft.position.set(-(w / 2 + linerB + t / 2), 0, 0.05);
  const barRight = barLeft.clone(); barRight.position.x = w / 2 + linerB + t / 2;
  g.add(barTop, barBot, barLeft, barRight);

  /* 四角金钉 */
  const studGeo = new THREE.SphereGeometry(0.045, 10, 8);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const stud = new THREE.Mesh(studGeo, goldFrameMat);
    stud.position.set(sx * (w / 2 + linerB + t / 2), sy * (h / 2 + linerB + t / 2), 0.15);
    g.add(stud);
  });

  /* 金雕花薄片（贴在金边上） */
  const frameMat = new THREE.MeshStandardMaterial({
    map: makeGoldFrameTexture(512, Math.round((512 * h) / w)),
    transparent: true, roughness: 0.32, metalness: 0.75,
    emissive: 0x2a1e06, emissiveIntensity: 0.28,
  });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.42, h + 0.42), frameMat);
  frame.position.z = 0.14;
  g.add(frame);

  /* 背后柔光晕 */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 220, 150]),
    transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(w * 2, h * 2, 1);
  glow.position.z = -0.5;
  g.add(glow);

  g.userData.photo = photo;
  g.userData.photoMat = photoMat;
  return g;
}

/* 照片墙（弧形排列 cols×rows） */
export function buildPhotoWall(cols = 5, rows = 3) {
  const g = new THREE.Group();
  const R = App.isMobile ? 14 : 18;
  const colSpan = 0.5;
  const dA = colSpan / (cols - 1);
  const rowY = [1.6, 0.0, -1.6];
  const rowZ = [-0.5, 0, 0.5];
  const FW = 2.4, FH = 1.8;  /* 4:3 */

  const frames = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const slot = r * cols + c + 1;
      const angle = -colSpan / 2 + c * dA;
      const f = buildPhotoFrame(FW, FH);
      f.position.set(R * Math.sin(angle), rowY[r], -R * Math.cos(angle) + rowZ[r]);
      f.rotation.y = angle;
      f.userData.slot = slot;
      f.userData.baseY = rowY[r];
      f.userData.phase = Math.random() * Math.PI * 2;
      f.userData.speed = 0.5 + Math.random() * 0.4;
      g.add(f);
      frames.push(f);
    }
  }
  /* 光影扫过精灵 */
  const sweep = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(128, [255, 240, 200]),
    transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sweep.scale.set(4, 4, 1);
  g.add(sweep);

  g.userData.frames = frames;
  g.userData.R = R;
  g.userData.sweep = sweep;
  g.userData.colSpan = colSpan;
  return g;
}

/* 时间线（垂直金线 + 节点圆点 + 相框） */
export function buildTimeline(nodes) {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.8, roughness: 0.3,
    emissive: 0x3a2a08, emissiveIntensity: 0.35,
  });

  /* 垂直金色线 */
  const linePts = [
    new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, -6 - nodes.length * 2, 0),
  ];
  const lineCurve = new THREE.CatmullRomCurve3(linePts);
  const line = new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 2, 0.04, 8, false), goldMat);
  g.add(line);

  /* 节点 */
  const nodeObjs = [];
  nodes.forEach((nd, i) => {
    const y = 4 - i * 2.2;
    const side = nd.side;

    /* 金色圆点 */
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), goldMat);
    dot.position.set(0, y, 0);
    g.add(dot);

    /* 脉冲光晕 */
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(128, [255, 220, 150]),
      transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    pulse.scale.set(1.2, 1.2, 1);
    pulse.position.set(0, y, 0.1);
    g.add(pulse);

    /* 小相框 */
    const fw = 1.6, fh = 1.2;
    const frame = buildPhotoFrame(fw, fh);
    frame.position.set(side * 2.4, y, 0);
    frame.rotation.y = -side * 0.3;
    frame.userData.slot = nd.photo;
    frame.userData.baseY = y;
    g.add(frame);

    nodeObjs.push({ dot, pulse, frame, y, side, node: nd });
  });

  g.userData.nodes = nodeObjs;
  return g;
}

/* 信息卡（象牙白磨砂 + 金边） */
export function buildInfoCard() {
  const g = new THREE.Group();
  const W = 4.5, H = 3.4;
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.8, roughness: 0.3,
    emissive: 0x3a2a08, emissiveIntensity: 0.35,
  });

  /* 卡片主体 */
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({
      map: makeInfoCardTexture(512, 384),
      roughness: 0.5, metalness: 0.15,
      emissive: 0x2a2218, emissiveIntensity: 0.12, side: THREE.DoubleSide,
    })
  );
  g.add(card);

  /* 金色描边框 */
  const t = 0.08;
  const bars = [
    [new THREE.BoxGeometry(W + 0.1, t, 0.1), [0, H / 2 + t / 2, 0.01]],
    [new THREE.BoxGeometry(W + 0.1, t, 0.1), [0, -H / 2 - t / 2, 0.01]],
    [new THREE.BoxGeometry(t, H, 0.1), [-(W / 2 + t / 2), 0, 0.01]],
    [new THREE.BoxGeometry(t, H, 0.1), [W / 2 + t / 2, 0, 0.01]],
  ];
  bars.forEach(([geo, pos]) => {
    const m = new THREE.Mesh(geo, goldMat);
    m.position.set(...pos);
    g.add(m);
  });

  /* 背后柔光 */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 220, 150]),
    transparent: true, opacity: 0.2,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(W * 1.8, H * 1.8, 1);
  glow.position.z = -0.5;
  g.add(glow);

  return g;
}

/* RSVP 卡（结构同信息卡） */
export function buildRsvpCard() { return buildInfoCard(); }

/* 结尾场景（星空 + 花瓣，文字走 DOM） */
export function buildEndingScene() {
  const g = new THREE.Group();
  /* 星空背景板 */
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 20),
    new THREE.MeshBasicMaterial({
      map: makeStarfieldTexture(512), depthWrite: false, fog: false, toneMapped: false,
    })
  );
  sky.position.z = -8;
  g.add(sky);

  /* 暖光晕 */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(256, [255, 230, 180]),
    transparent: true, opacity: 0.2,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(8, 8, 1);
  glow.position.set(0, 0, -4);
  g.add(glow);

  return g;
}
