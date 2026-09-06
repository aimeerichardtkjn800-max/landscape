/* ============ background.js · 全局 3D 光斑粒子（贯穿整个空间走廊） ============ */
import world from "./world.js";

const App = window.App;

let points = null;
let meta = null;
let count = 0;

App.bg = {
  init() {
    const tex = world.softCircleTexture();

    /* 数量 ≤200，手机端减半 */
    count = App.isTouch ? 100 : 190;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    meta = [];

    const palette = [0xffffff, 0xffd9e2, 0xffe9c9, 0xf9c1cf, 0xf6e3d5].map(
      (hex) => new world.THREE.Color(hex)
    );

    /* 分布在整个走廊：从场景一前方延伸到场景四后方 */
    const zMin = world.zoneZ(3) - 16;
    const zMax = world.zoneZ(0) + 12;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);
      const c = palette[(Math.random() * palette.length) | 0];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      meta.push({
        baseX: pos[i * 3],
        phase: Math.random() * Math.PI * 2,
        amp: 0.3 + Math.random() * 0.8,
        freq: 0.1 + Math.random() * 0.25,
        vy: 0.08 + Math.random() * 0.16,
      });
    }

    const geo = new world.THREE.BufferGeometry();
    geo.setAttribute("position", new world.THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new world.THREE.BufferAttribute(col, 3));

    const mat = new world.THREE.PointsMaterial({
      size: 0.55,
      map: tex,
      transparent: true,
      opacity: 0.55,
      vertexColors: true,
      depthWrite: false,
      blending: world.THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: true,
    });

    points = new world.THREE.Points(geo, mat);
    world.scene.add(points);

    world.addTick((dt, t) => {
      if (!points) return;
      const attr = points.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        const m = meta[i];
        let y = attr.array[i * 3 + 1] + m.vy * dt;
        if (y > 10) y = -10;
        attr.array[i * 3] = m.baseX + Math.sin(t * m.freq + m.phase) * m.amp;
        attr.array[i * 3 + 1] = y;
      }
      attr.needsUpdate = true;
    });
  },
};
