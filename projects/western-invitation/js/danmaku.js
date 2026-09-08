/* ============ danmaku.js · 顶部祝福飘屏（弹幕） ============
   手写体风格，深金/红褐配色；多行轨道，右→左缓慢飘动。
   - 无祝福时整体渐隐，不遮挡画面；有新祝福时淡入。
   - 对外接口：App.danmaku.push("祝福文字") / App.danmaku.start() / stop()
   - RSVP 提交后由 main.js 调用 push() 实时飘屏。
====================================================== */
const HAND_FONT = '"Segoe Script","Brush Script MT","Lucida Handwriting","Snell Roundhand","KaiTi","STKaiti","楷体",cursive';
const INK_COLORS = ["#7a5210", "#8a5a1e", "#8a4a3a", "#6e4622", "#93502e"];

export function initDanmaku(cfg) {
  const conf = cfg.danmaku || {};
  const ROWS = conf.rows || 3;
  const durRange = conf.duration || [20, 30];
  const intervalRange = conf.interval || [5.5, 9];
  const presets = conf.presets || [];

  /* 自建容器（不依赖 HTML，便于移植） */
  let layer = document.getElementById("danmaku-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "danmaku-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
  }
  layer.classList.add("danmaku-layer");
  layer.style.opacity = "0";

  /* 每行轨道：记录上次投放时间与动画起始 */
  const tracks = [];
  for (let i = 0; i < ROWS; i++) {
    const row = document.createElement("div");
    row.className = "danmaku-row";
    row.style.top = (8 + i * 6.5) + "%"; /* 顶部 10%~28% 区间内分布 */
    layer.appendChild(row);
    tracks.push({ el: row, lastAt: -999, lastDur: 0 });
  }

  let active = 0;
  let running = false;
  let timer = null;
  let presetIdx = 0;

  function setLayerVisible(v) {
    layer.style.transition = "opacity 1.2s ease";
    layer.style.opacity = v ? "1" : "0";
  }

  function pickTrack(dur) {
    const now = performance.now() / 1000;
    /* 优先选“最早空闲”的轨道；同一轨道需等上一条飘出约 35% 再放新条 */
    let best = null, bestScore = Infinity;
    for (const tr of tracks) {
      const since = now - tr.lastAt;
      const free = since > tr.lastDur * 0.35;
      const score = free ? since : -1;
      if (free && since < bestScore) { best = tr; bestScore = since; }
    }
    if (!best) { /* 全部占用，选最久未用的 */
      best = tracks.reduce((a, b) => (a.lastAt < b.lastAt ? a : b));
    }
    best.lastAt = now; best.lastDur = dur;
    return best;
  }

  function push(text) {
    if (!text || !running) return;
    const dur = durRange[0] + Math.random() * (durRange[1] - durRange[0]);
    const track = pickTrack(dur);

    const item = document.createElement("span");
    item.className = "danmaku-item";
    item.textContent = text;
    item.style.fontFamily = HAND_FONT;
    item.style.color = INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)];
    track.el.appendChild(item);

    active++;
    setLayerVisible(true);

    /* 测量宽度决定起止位移（右屏外 → 左屏外） */
    const w = item.offsetWidth || 220;
    const vw = window.innerWidth;
    const startX = vw + w * 0.5;
    const endX = -w - 40;

    const anim = item.animate(
      [
        { transform: `translateX(${startX}px)`, opacity: 0 },
        { opacity: 0.95, offset: 0.08 },
        { opacity: 0.95, offset: 0.9 },
        { transform: `translateX(${endX}px)`, opacity: 0 },
      ],
      { duration: dur * 1000, easing: "linear", fill: "forwards" }
    );
    anim.onfinish = () => {
      item.remove();
      active = Math.max(0, active - 1);
      if (active === 0) setLayerVisible(false);
    };
    return anim;
  }

  function schedulePreset() {
    if (!running) return;
    /* 轮询 + 轻微随机，避免重复 */
    const msg = presets[presetIdx % presets.length];
    presetIdx++;
    push(msg);
    const wait = intervalRange[0] + Math.random() * (intervalRange[1] - intervalRange[0]);
    timer = setTimeout(schedulePreset, wait * 1000);
  }

  function start() {
    if (running || !conf.enabled) return;
    running = true;
    /* 首条延迟一点，等入场过渡 */
    timer = setTimeout(schedulePreset, 2200);
  }
  function stop() {
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  return { push, start, stop, get running() { return running; } };
}
