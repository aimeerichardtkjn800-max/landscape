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

/* ---------------- ②b 信封封面烫金文字（XXX & XXX 婚礼邀请函） ---------------- */
export function makeEnvelopeFaceTexture(w = 800, h = 360) {
  const { canvas, ctx } = makeCanvas(w, h);
  /* 象牙丝绸底 */
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w / 2, h / 2, w * 0.6);
  bg.addColorStop(0, "#fbf6ec");
  bg.addColorStop(0.65, "#f4ecdc");
  bg.addColorStop(1, "#e7d8be");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  /* 金色双线边框 */
  ctx.strokeStyle = "rgba(196,160,90,.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  /* 顶部小菱形饰 */
  ctx.fillStyle = "#c4a05a";
  ctx.save(); ctx.translate(w / 2, 52); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14); ctx.restore();
  ctx.fillStyle = "rgba(196,160,90,.55)";
  ctx.fillRect(w / 2 - 70, 50, 56, 1.5);
  ctx.fillRect(w / 2 + 14, 50, 56, 1.5);

  /* WEDDING INVITATION 英文小标题 */
  ctx.fillStyle = "#8a6a2a";
  ctx.font = `600 26px ${SERIF}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.letterSpacing = "6px";
  ctx.fillText("W E D D I N G   I N V I T A T I O N", w / 2, 112);

  /* XXX & XXX 主标题（流光金） */
  goldText(ctx, "XXX & XXX", w / 2, 205, 78);

  /* 中文：婚礼邀请函 */
  ctx.font = `300 40px ${SERIF}`;
  ctx.fillStyle = "#7a5a20";
  ctx.shadowColor = "rgba(212,175,55,.35)";
  ctx.shadowBlur = 10;
  ctx.fillText("婚  礼  邀  请  函", w / 2, 292);
  ctx.shadowBlur = 0;

  /* 底部细分隔线 */
  ctx.strokeStyle = "rgba(196,160,90,.5)";
  ctx.beginPath(); ctx.moveTo(w / 2 - 90, 330); ctx.lineTo(w / 2 + 90, 330); ctx.stroke();
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
  /* 抛光大理石：浅米白基底 + 浅灰脉络（floor 为抛光地面） */
  const base = variant === "pillar" ? "#f5f0e8" : "#f5f0eb";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  /* 大理石纹理：随机贝塞尔 veins（floor 用浅灰脉络） */
  const veinCol = variant === "pillar" ? "rgba(180,160,130,.5)" : "rgba(150,150,155,.5)";
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

/* ---------------- ⑤b 体积光束纹理（顶亮→底 30%，水平软边） ---------------- */
export function makeBeamTexture(w = 128, h = 512) {
  const { canvas, ctx } = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    /* 沿光束方向衰减：光源端 1.0 → 地面端 0.3 */
    const along = 1 - y / h;
    const lengthFade = 0.3 + 0.7 * Math.pow(along, 1.35);
    for (let x = 0; x < w; x++) {
      const edge = Math.abs(x / w - 0.5) * 2;          /* 0 中心 → 1 边缘 */
      const sideFade = Math.pow(Math.max(0, 1 - edge * edge), 1.8);
      const a = Math.round(255 * lengthFade * sideFade);
      const i = (y * w + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 240; img.data[i + 2] = 205; img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/* ---------------- ⑤c 金色光尘粒子（柔圆） ---------------- */
export function makeDustTexture(size = 64) {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,240,190,1)");
  g.addColorStop(0.35, "rgba(255,220,140,.55)");
  g.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/* ---------------- ⑤d 前景失焦花瓣色块（极大柔边，Bokeh 用） ---------------- */
export function makeBokehTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,.95)");
  g.addColorStop(0.45, "rgba(255,244,244,.55)");
  g.addColorStop(0.8, "rgba(255,235,238,.18)");
  g.addColorStop(1, "rgba(255,235,238,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/* ---------------- ⑤e 拉丝金属 bump（细密垂直拉丝纹） ---------------- */
export function makeBrushedBumpTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  const rnd = App.hashRandom("brushed-bump");
  for (let x = 0; x < size; x++) {
    const v = 128 + (rnd() - 0.5) * 46;
    ctx.strokeStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, size); ctx.stroke();
  }
  const tex = toTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  return tex;
}

/* ---------------- ⑤f 布料编织 bump（雪纺/薄纱） ---------------- */
export function makeClothBumpTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#a8a8a8";
  for (let i = 0; i < size; i += 4) { ctx.fillRect(i, 0, 1, size); ctx.fillRect(0, i, size, 1); }
  ctx.fillStyle = "#606060";
  for (let i = 2; i < size; i += 4) { ctx.fillRect(i, 0, 1, size); ctx.fillRect(0, i, size, 1); }
  const tex = toTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
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

  /* 封面前片（下半身，印有 XXX & XXX 婚礼邀请函） */
  const frontH = H * 0.62;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, frontH), new THREE.MeshStandardMaterial({
    map: makeEnvelopeFaceTexture(800, Math.round(800 * frontH / (W - 0.12))),
    roughness: 0.5, metalness: 0.05,
    emissive: 0x2a2218, emissiveIntensity: 0.12,
  }));
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

  /* 火漆封印（刻新人首字母组合 X&X） */
  const monogram = (App.config.groom[0] || "X") + "&" + (App.config.bride[0] || "X");
  const seal = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshStandardMaterial({
      map: makeWaxSealTexture(256, monogram),
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

/* 大理石立柱 · 科林斯式（茛苕叶柱头 + 垂直凹槽柱身 + 多层阶梯柱基 + 玫瑰花环） */
export function buildPillar(height = 7) {
  const g = new THREE.Group();
  /* 拉丝古铜金：哑光金属质感（柱基/环饰），柱头略亮形成明暗对比 */
  const brushedBump = makeBrushedBumpTexture(256);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xb8860b, metalness: 0.92, roughness: 0.45,
    bumpMap: brushedBump, bumpScale: 0.02,
    emissive: 0x2a1e08, emissiveIntensity: 0.15,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441, metalness: 0.92, roughness: 0.3,
    bumpMap: brushedBump, bumpScale: 0.015,
    emissive: 0x3a2a08, emissiveIntensity: 0.1,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    map: makeMarbleTexture(512, "pillar"),
    roughness: 0.4, metalness: 0.12,
  });

  /* ---- 柱身：24 道垂直凹槽（顶点径向位移） ---- */
  const shaftGeo = new THREE.CylinderGeometry(0.3, 0.36, height, 48, 14);
  const sp = shaftGeo.attributes.position;
  const FLUTES = 24;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.02) {
      const th = Math.atan2(z, x);
      const groove = 1 - 0.055 * 0.5 * (1 - Math.cos(FLUTES * th)); /* 凹入约5% */
      sp.setX(i, (x / r) * r * groove);
      sp.setZ(i, (z / r) * r * groove);
    }
  }
  shaftGeo.computeVertexNormals();
  g.add(new THREE.Mesh(shaftGeo, pillarMat));

  /* ---- 多层阶梯柱基 ---- */
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.98), goldMat);
  plinth.position.y = -height / 2 + 0.08;
  g.add(plinth);
  const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.16, 24), pillarMat);
  baseCyl.position.y = -height / 2 + 0.24;
  g.add(baseCyl);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 28), goldMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -height / 2 + 0.36;
  g.add(baseRing);

  /* ---- 科林斯柱头：钟形 + 双层茛苕叶 + 涡卷 + 顶板 ---- */
  const capY = height / 2;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 10, 28), goldMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = capY - 0.02;
  g.add(collar);
  /* 钟形冠身 */
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.3, 0.62, 24), goldMat);
  bell.position.y = capY + 0.3;
  g.add(bell);
  /* 茛苕叶（两层，每层 8 片，向外微垂） */
  const leafGeo = new THREE.ConeGeometry(0.09, 0.55, 6);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const leafTiers = [
    { n: 8, r: 0.34, y: capY + 0.08, tilt: 0.62, len: 0.55 },
    { n: 8, r: 0.44, y: capY + 0.28, tilt: 0.4, len: 0.45 },
  ];
  leafTiers.forEach((tier, ti) => {
    for (let i = 0; i < tier.n; i++) {
      const a = (i / tier.n) * Math.PI * 2 + (ti ? Math.PI / tier.n : 0);
      const leaf = new THREE.Mesh(ti ? new THREE.ConeGeometry(0.07, tier.len, 6) : leafGeo, goldMat);
      dir.set(Math.cos(a), -tier.tilt * 0.7 + 0.55, Math.sin(a)).normalize();
      leaf.quaternion.setFromUnitVectors(up, dir);
      leaf.position.set(Math.cos(a) * tier.r, tier.y, Math.sin(a) * tier.r);
      leaf.position.addScaledVector(dir, tier.len * 0.28);
      g.add(leaf);
    }
  });
  /* 四角涡卷 */
  for (let sx of [-1, 1]) for (let sz of [-1, 1]) {
    const vol = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 18), goldMat);
    vol.position.set(sx * 0.36, capY + 0.52, sz * 0.36);
    vol.rotation.set(Math.PI / 2, 0, 0);
    g.add(vol);
  }
  /* 顶板（abacus） */
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), capMat);
  abacus.position.y = capY + 0.66;
  g.add(abacus);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 1.02), capMat);
  slab.position.y = capY + 0.77;
  g.add(slab);

  /* ---- 柱基玫瑰花环 + 常春藤 ---- */
  const wreath = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.07, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x7d8c6e, roughness: 0.8, metalness: 0.05 })
  );
  wreath.rotation.x = Math.PI / 2;
  wreath.position.y = -height / 2 + 0.42;
  g.add(wreath);
  const roseTex = makeRoseTexture(128, "white");
  const rosePinkTex = makeRoseTexture(128, "pink");
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: i % 3 === 0 ? rosePinkTex : roseTex, transparent: true, depthWrite: false, opacity: 0.95,
    }));
    sp2.scale.set(0.34, 0.34, 1);
    sp2.position.set(Math.cos(a) * 0.52, -height / 2 + 0.5, Math.sin(a) * 0.52);
    g.add(sp2);
  }
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
    map: marbleTex, roughness: 0.18, metalness: 0.5,
    bumpMap: marbleTex, bumpScale: 0.1,
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
        roughness: 0.18, metalness: 0.85,
        bumpMap: marbleTex, bumpScale: 0.06,
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

/* ================= 殿堂仪式空间填充构件 ================= */

/* 几何体合并（InstancedMesh 用，降低 draw call） */
function _mergeGeoms(parts) {
  const pos = [], nrm = [], uv = [];
  for (const item of parts) {
    let g = item.geo;
    if (item.m) { g = g.clone(); g.applyMatrix4(item.m); }
    g = g.index ? g.toNonIndexed() : g;
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
function _m4(x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4();
  m.makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
  m.setPosition(x, y, z);
  return m;
}

/* 白色长绒地毯纹理（金边） */
function makeCarpetTexture() {
  const { canvas, ctx } = makeCanvas(256, 1024);
  ctx.fillStyle = "#f7f2e6";
  ctx.fillRect(0, 0, 256, 1024);
  /* 长绒噪点 */
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,.10)" : "rgba(190,170,140,.07)";
    ctx.fillRect(Math.random() * 256, Math.random() * 1024, 1.6, 1.6);
  }
  /* 金色双边线 */
  ctx.fillStyle = "#c9a24e";
  ctx.fillRect(14, 0, 5, 1024); ctx.fillRect(237, 0, 5, 1024);
  ctx.fillStyle = "rgba(201,162,78,.5)";
  ctx.fillRect(26, 0, 2, 1024); ctx.fillRect(228, 0, 2, 1024);
  /* 中央淡金虚线 */
  ctx.strokeStyle = "rgba(201,162,78,.35)";
  ctx.lineWidth = 2; ctx.setLineDash([14, 18]);
  ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 1024); ctx.stroke();
  return toTexture(canvas);
}

/* T 台白地毯 */
function buildAisleCarpet() {
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 9.2),
    new THREE.MeshStandardMaterial({
      map: makeCarpetTexture(), roughness: 0.95, metalness: 0,
      emissive: 0x2e2818, emissiveIntensity: 0.12,
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, -3.47, 3.0);
  return carpet;
}

/* 金色落地烛台（合并几何，烛光为发光点云） */
function buildAisleDecor() {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xc2a05a, metalness: 0.7, roughness: 0.4,
    emissive: 0x2a1e08, emissiveIntensity: 0.3,
  });
  /* 烛台几何（基座/杆/托盘/三枝） */
  const candleParts = [];
  const cyl = (r, h, x, y, z) => ({ geo: new THREE.CylinderGeometry(r, r * 1.15, h, 10), m: _m4(x, y, z) });
  candleParts.push(cyl(0.16, 0.08, 0, 0.04, 0));
  candleParts.push(cyl(0.035, 1.1, 0, 0.62, 0));
  candleParts.push(cyl(0.1, 0.05, 0, 1.18, 0));
  candleParts.push(cyl(0.05, 0.22, 0, 1.32, 0));
  /* 侧枝 */
  for (const s of [-1, 1]) {
    const arm = { geo: new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), m: _m4(s * 0.22, 1.12, 0, 0, 0, Math.PI / 2) };
    candleParts.push(arm);
    candleParts.push(cyl(0.04, 0.16, s * 0.44, 1.12, 0));
  }
  const candleGeo = _mergeGeoms(candleParts);

  /* 花艺路引（金色花瓮 + 玫瑰球） */
  const urnParts = [
    cyl(0.2, 0.26, 0, 0.13, 0),
    cyl(0.1, 0.2, 0, 0.36, 0),
  ];
  const urnGeo = _mergeGeoms(urnParts);

  const spots = [
    /* z: 烛台与花艺交替沿 T 台两侧 */
    { z: 6.6, type: "candle" }, { z: 5.4, type: "urn" },
    { z: 4.2, type: "candle" }, { z: 3.0, type: "urn" },
    { z: 1.8, type: "candle" }, { z: 0.6, type: "urn" },
    { z: -0.6, type: "candle" }, { z: -1.4, type: "urn" },
  ];
  const candlePositions = [];
  const urnPositions = [];
  for (const side of [-1, 1]) {
    for (const s of spots) {
      if (s.type === "candle") candlePositions.push([side * 1.6, 0, s.z]);
      else urnPositions.push([side * 1.6, 0, s.z]);
    }
  }
  const candleIM = new THREE.InstancedMesh(candleGeo, goldMat, candlePositions.length);
  const urnIM = new THREE.InstancedMesh(urnGeo, goldMat, urnPositions.length);
  const dummy = new THREE.Object3D();
  candlePositions.forEach((p, i) => { dummy.position.set(p[0], -3.5, p[2]); dummy.updateMatrix(); candleIM.setMatrixAt(i, dummy.matrix); });
  urnPositions.forEach((p, i) => { dummy.position.set(p[0], -3.5, p[2]); dummy.updateMatrix(); urnIM.setMatrixAt(i, dummy.matrix); });
  g.add(candleIM, urnIM);

  /* 烛火点云（暖色，辉光）：烛台中心烛火 + 侧枝烛火 */
  const flamePos = [];
  spots.forEach((s) => {
    if (s.type !== "candle") return;
    for (const side of [-1, 1]) {
      flamePos.push(side * 1.6, -2.05, s.z);   /* 中心烛火 */
      flamePos.push(side * 1.6 + side * 0.44, -2.32, s.z); /* 侧枝烛火 */
    }
  });
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute("position", new THREE.Float32BufferAttribute(flamePos, 3));
  const flameMat = new THREE.PointsMaterial({
    map: makeGlowTexture(128, [255, 205, 120]),
    color: 0xffd9a0, size: 0.55, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const flames = new THREE.Points(fGeo, flameMat);
  g.add(flames);

  /* 花艺路引玫瑰（精灵簇） */
  const roseTex = makeRoseTexture(128, "white");
  const rosePinkTex = makeRoseTexture(128, "pink");
  urnPositions.forEach((p, i) => {
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: k % 3 === 0 ? rosePinkTex : roseTex, transparent: true, depthWrite: false, opacity: 0.95,
      }));
      const s = 0.3 + Math.random() * 0.12;
      sp.scale.set(s, s, 1);
      sp.position.set(p[0] + (Math.random() - 0.5) * 0.3, -3.0 + Math.random() * 0.35, p[2] + (Math.random() - 0.5) * 0.3);
      g.add(sp);
    }
  });

  g.userData.flameMat = flameMat;
  return g;
}

/* 竹节椅阵列（InstancedMesh：金框/象牙坐垫/雪纺飘带/椅背花束，LOD 远景简化） */
function buildChairRows() {
  const g = new THREE.Group();
  const chairGold = new THREE.MeshStandardMaterial({
    color: 0xc9a24e, metalness: 0.75, roughness: 0.35,
    emissive: 0x2a1e08, emissiveIntensity: 0.25,
  });
  const ivoryFabric = new THREE.MeshStandardMaterial({
    color: 0xf6efe0, roughness: 0.9, metalness: 0,
    emissive: 0x2a2414, emissiveIntensity: 0.1,
  });
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf2, transparent: true, opacity: 0.55,
    roughness: 1, metalness: 0, side: THREE.DoubleSide, depthWrite: false,
  });

  /* ---- 金框（合并） ---- */
  const frameParts = [];
  const cyl = (r, h, x, y, z) => ({ geo: new THREE.CylinderGeometry(r, r, h, 8), m: _m4(x, y, z) });
  const box = (w, h, d, x, y, z) => ({ geo: new THREE.BoxGeometry(w, h, d), m: _m4(x, y, z) });
  /* 前腿 */
  frameParts.push(cyl(0.025, 0.55, -0.19, 0.275, 0.17));
  frameParts.push(cyl(0.025, 0.55, 0.19, 0.275, 0.17));
  /* 后高柱 */
  frameParts.push(cyl(0.028, 1.35, -0.19, 0.675, -0.19));
  frameParts.push(cyl(0.028, 1.35, 0.19, 0.675, -0.19));
  /* 座面框 + 侧栏 */
  frameParts.push(box(0.44, 0.05, 0.4, 0, 0.56, 0));
  frameParts.push(box(0.04, 0.04, 0.36, -0.19, 0.56, 0));
  frameParts.push(box(0.04, 0.04, 0.36, 0.19, 0.56, 0));
  /* 椅背顶栏/中栏 */
  frameParts.push(box(0.44, 0.06, 0.05, 0, 1.3, -0.19));
  frameParts.push(box(0.4, 0.04, 0.04, 0, 1.05, -0.19));
  /* 椅背竖棂 */
  frameParts.push(cyl(0.012, 0.5, -0.12, 1.05, -0.19));
  frameParts.push(cyl(0.012, 0.5, 0, 1.05, -0.19));
  frameParts.push(cyl(0.012, 0.5, 0.12, 1.05, -0.19));
  const frameGeo = _mergeGeoms(frameParts);

  /* ---- 坐垫 ---- */
  const cushGeo = _mergeGeoms([box(0.4, 0.08, 0.36, 0, 0.62, 0.02)]);

  /* ---- 雪纺飘带（双条） ---- */
  const ribbonGeo = _mergeGeoms([
    { geo: new THREE.PlaneGeometry(0.1, 0.6), m: _m4(-0.1, 1.02, -0.27, 0, 0, 0.08) },
    { geo: new THREE.PlaneGeometry(0.1, 0.6), m: _m4(0.1, 1.02, -0.27, 0, 0, -0.08) },
  ]);
  /* ---- 椅背小花束 ---- */
  const flowerParts = [];
  for (let k = 0; k < 3; k++) {
    flowerParts.push({ geo: new THREE.OctahedronGeometry(0.055, 0), m: _m4((k - 1) * 0.07, 1.42 + (k === 1 ? 0.05 : 0), -0.26) });
  }
  const flowerGeo = _mergeGeoms(flowerParts);

  /* ---- 布局：4 排 × 两侧各 2 椅 ---- */
  const rows = [6.4, 4.6, 2.8, 1.0];
  const layout = [];
  rows.forEach((z, ri) => {
    for (const side of [-1, 1]) {
      layout.push({ x: side * 2.35, z, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, rich: ri < 2 });
      layout.push({ x: side * 3.2, z: z + 0.4, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, rich: ri < 2 });
    }
  });
  const frameIM = new THREE.InstancedMesh(frameGeo, chairGold, layout.length);
  const cushIM = new THREE.InstancedMesh(cushGeo, ivoryFabric, layout.length);
  const ribbonIM = new THREE.InstancedMesh(ribbonGeo, ribbonMat, layout.filter(l => l.rich).length);
  const flowerIM = new THREE.InstancedMesh(flowerGeo, ivoryFabric, layout.filter(l => l.rich).length);
  const dummy = new THREE.Object3D();
  let ri2 = 0;
  layout.forEach((l, i) => {
    dummy.position.set(l.x, -3.5, l.z);
    dummy.rotation.set(0, l.ry, 0);
    dummy.updateMatrix();
    frameIM.setMatrixAt(i, dummy.matrix);
    cushIM.setMatrixAt(i, dummy.matrix);
    if (l.rich) { ribbonIM.setMatrixAt(ri2, dummy.matrix); flowerIM.setMatrixAt(ri2, dummy.matrix); ri2++; }
  });
  g.add(frameIM, cushIM, ribbonIM, flowerIM);
  g.userData.ribbonMat = ribbonMat;
  return g;
}

/* 暖色灯串（T 台上方悬垂，Points 辉光） */
function buildStringLights() {
  const g = new THREE.Group();
  const pos = [];
  for (const x of [-1.5, 0, 1.5]) {
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const z = 7.2 - u * 9.4;
      const sag = Math.sin(u * Math.PI) * 1.1;
      pos.push(x, 4.6 - sag, z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: makeGlowTexture(64, [255, 214, 140]),
    color: 0xffe0b0, size: 0.3, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  g.add(new THREE.Points(geo, mat));
  g.userData.mat = mat;
  return g;
}

/* 半透明白纱幔（顶部垂下，微风摆动） */
function buildDrapes() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfffaf0, transparent: true, opacity: 0.3,
    roughness: 1, metalness: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  const drapes = [];
  const defs = [
    { x: -3.6, z: 6.4, w: 2.4, h: 5.2, ry: 0.32, ph: 0 },
    { x: 3.6, z: 6.4, w: 2.4, h: 5.2, ry: -0.32, ph: 2.1 },
    { x: 0, z: 7.6, w: 3.0, h: 4.2, ry: 0, ph: 4.2 },
  ];
  defs.forEach((d) => {
    const geo = new THREE.PlaneGeometry(d.w, d.h, 12, 18);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(d.x, d.h / 2 - 0.6, d.z);
    mesh.rotation.y = d.ry;
    g.add(mesh);
    drapes.push({ mesh, base: geo.attributes.position.array.slice(0), w: d.w, h: d.h, ph: d.ph });
  });
  g.userData.drapes = drapes;
  return g;
}

/* 前景顶部垂坠花环（藤蔓帘） */
function buildTopGarland() {
  const g = new THREE.Group();
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x7d8c6e, roughness: 0.85, metalness: 0.05,
    emissive: 0x1a2010, emissiveIntensity: 0.2,
  });
  /* 主蔓（U 形垂弧） */
  const pts = [
    new THREE.Vector3(-4.2, 4.6, 6.6),
    new THREE.Vector3(-2, 3.9, 6.6),
    new THREE.Vector3(0, 3.7, 6.6),
    new THREE.Vector3(2, 3.9, 6.6),
    new THREE.Vector3(4.2, 4.6, 6.6),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.05, 6, false), vineMat));
  /* 垂吊藤条 */
  for (let i = 0; i < 7; i++) {
    const x = -3.6 + i * 1.2;
    const len = 0.7 + (i % 3) * 0.45;
    const strand = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 4.0 - Math.abs(x) * 0.08, 6.6),
      new THREE.Vector3(x + 0.15, 4.0 - len * 0.6, 6.7),
      new THREE.Vector3(x - 0.1, 4.0 - len, 6.6),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(strand, 12, 0.02, 5, false), vineMat));
  }
  /* 尤加利叶 + 白玫瑰 */
  const eucMat = new THREE.MeshStandardMaterial({
    map: makeEucalyptusTexture(256), transparent: true, roughness: 0.7,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const roseTex = makeRoseTexture(128, "white");
  const rosePinkTex = makeRoseTexture(128, "pink");
  for (let i = 0; i <= 22; i++) {
    const p = curve.getPoint(i / 22);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), eucMat);
    leaf.position.copy(p);
    leaf.position.z += 0.05;
    leaf.rotation.z = (i / 22) * Math.PI;
    g.add(leaf);
    if (i % 3 === 0) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: i % 6 === 0 ? rosePinkTex : roseTex, transparent: true, depthWrite: false, opacity: 0.95,
      }));
      const s = 0.42;
      sp.scale.set(s, s, 1);
      sp.position.copy(p);
      sp.position.y -= 0.1;
      sp.position.z += 0.1;
      g.add(sp);
    }
  }
  return g;
}

/* 远景绿植墙（虚化背景，防穿帮 + 纵深） */
function buildGreeneryBackdrop() {
  const { canvas, ctx } = makeCanvas(512, 256);
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, "#4a5a44");
  bg.addColorStop(0.6, "#3a4a36");
  bg.addColorStop(1, "#2c3a2a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  /* 树冠剪影 */
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(${40 + Math.random() * 30},${60 + Math.random() * 40},${40 + Math.random() * 25},.5)`;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, 60 + Math.random() * 140, 20 + Math.random() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = toTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 11),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false, fog: true })
  );
  mesh.position.set(0, 0.5, -9);
  return mesh;
}

/* 殿堂组合（拱门 + 科林斯立柱 + T台 + 烛台花艺 + 竹节椅 + 灯串 + 纱幔 + 吊灯 + 花环 + 绿植背景） */
export function buildHall(useReflector = false) {
  const g = new THREE.Group();

  /* 远景绿植墙 */
  g.add(buildGreeneryBackdrop());

  /* 拱门花门（中央） */
  const arch = buildGardenArch(7);
  arch.position.set(0, -3.5, 0);
  g.add(arch);

  /* 6 根科林斯立柱（左右各 3） */
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const p = buildPillar(7);
      p.position.set(side * 3.6, -3.5 + 3.5, -4 + i * 4);
      g.add(p);
    }
  }

  /* T 台白地毯 */
  g.add(buildAisleCarpet());
  /* 烛台 + 花艺路引 */
  const aisleDecor = buildAisleDecor();
  g.add(aisleDecor);
  /* 竹节椅阵列 */
  const chairRows = buildChairRows();
  g.add(chairRows);

  /* 水晶吊灯（拱门正上方 + T台两盏副灯） */
  const chandelier = buildChandelier();
  chandelier.position.set(0, 2.6, 0);
  g.add(chandelier);
  const miniLights = [];
  for (const z of [4.6, -3.2]) {
    const m = buildChandelier();
    m.scale.setScalar(0.6);
    m.position.set(0, 3.1, z);
    g.add(m);
    miniLights.push(m);
  }
  /* 暖色灯串 */
  const stringLights = buildStringLights();
  g.add(stringLights);

  /* 顶部垂坠纱幔 + 前景花环 */
  const drapes = buildDrapes();
  g.add(drapes);
  g.add(buildTopGarland());

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
  g.userData.miniLights = miniLights;
  g.userData.flameMat = aisleDecor.userData.flameMat;
  g.userData.stringMat = stringLights.userData.mat;
  g.userData.drapes = drapes.userData.drapes;
  return g;
}

/* 4:3 金雕花相框（照片墙用） */
export function buildPhotoFrame(w, h) {
  const g = new THREE.Group();

  /* 背板：象牙白底，避免任何边缘出现黑色条 */
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.42, h + 0.42, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.8, metalness: 0.15 })
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

  /* 立体边框：哑光古铜金（与罗马柱统一） */
  const goldFrameMat = new THREE.MeshPhysicalMaterial({
    color: 0xb8860b, metalness: 0.9, roughness: 0.35,
    clearcoat: 0.25, clearcoatRoughness: 0.45,
    bumpMap: makeBrushedBumpTexture(128), bumpScale: 0.012,
    emissive: 0x241a06, emissiveIntensity: 0.2,
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

  /* 内侧倒角极细亮线高光（模拟金属倒角反光，emissive 0.2） */
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x4a3508, metalness: 0.9, roughness: 0.35,
    emissive: 0xffe2a0, emissiveIntensity: 0.2,
  });
  const eh = 0.028, edgeZ = 0.115;
  const edgeH = new THREE.BoxGeometry(w + 0.02, eh, 0.02);
  const edgeV = new THREE.BoxGeometry(eh, h + 0.02, 0.02);
  const edgeTop = new THREE.Mesh(edgeH, edgeMat);
  edgeTop.position.set(0, h / 2 + eh / 2, edgeZ);
  const edgeBot = edgeTop.clone(); edgeBot.position.y = -(h / 2 + eh / 2);
  const edgeLeft = new THREE.Mesh(edgeV, edgeMat);
  edgeLeft.position.set(-(w / 2 + eh / 2), 0, edgeZ);
  const edgeRight = edgeLeft.clone(); edgeRight.position.x = w / 2 + eh / 2;
  g.add(edgeTop, edgeBot, edgeLeft, edgeRight);

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
    transparent: true, roughness: 0.35, metalness: 0.8,
    emissive: 0x2a1e06, emissiveIntensity: 0.25,
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

/* 照片墙 · 360° 圆环轮播画廊（Carousel）：
   所有相框围绕中心 Y 轴均匀排成圆环，正面朝内（面向圆心观者），
   由 main.js 旋转整组；正前相框自动放大提亮，两侧/背后渐隐。 */
export function buildPhotoWall(cols = 5, rows = 3) {
  const g = new THREE.Group();
  const N = cols * rows;
  const STEP = (Math.PI * 2) / N;                 /* 每张相框占 24° */
  const R = App.isMobile ? 6.8 : 7.6;             /* 环半径（相邻间距≈0.42R，不重叠） */
  const FW = 2.0, FH = 1.5;                        /* 4:3 */

  const frames = [];
  for (let i = 0; i < N; i++) {
    const slot = i + 1;
    const alpha = i * STEP;                        /* 相对中心的方位角 */
    const f = buildPhotoFrame(FW, FH);
    /* 轻微高度起伏（波浪），增加生气但不影响对焦 */
    const y = Math.sin(alpha * 2) * 0.28 + (Math.random() - 0.5) * 0.12;
    f.position.set(R * Math.sin(alpha), y, -R * Math.cos(alpha));
    f.rotation.y = -alpha;                          /* 正面朝内（面向圆心观者） */
    f.userData.slot = slot;
    f.userData.angle = alpha;
    f.userData.baseY = y;
    f.userData.phase = Math.random() * Math.PI * 2;
    f.userData.speed = 0.5 + Math.random() * 0.4;
    /* 找到相框背后的光晕精灵，供焦点提亮 */
    f.userData.glow = null;
    f.traverse((o) => { if (o.isSprite && o.material && o.material.blending === THREE.AdditiveBlending) f.userData.glow = o; });
    g.add(f);
    frames.push(f);
  }

  g.userData.frames = frames;
  g.userData.R = R;
  g.userData.step = STEP;
  g.userData.count = N;
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
