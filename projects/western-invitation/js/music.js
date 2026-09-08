/* ============ music.js · 西式婚礼背景音乐 ============
   内置 Canon in D 风格合成（钢琴+弦乐，帕赫贝尔和弦走向）
   也支持用户上传自己的音乐（Blob 循环播放）
====================================================== */
(function () {
  const App = window.App;

  /* 音名→频率 */
  const NOTE = {
    D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0,
    B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, F4s: 369.99,
    G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
    F5: 698.46, F5s: 739.99, G5: 783.99, A5: 880.0,
  };

  /* 帕赫贝尔 Canon 和弦走向：D - A - Bm - F#m - G - D - G - A
     每小节 8 拍，旋律为 canon 风格的模进 */
  const BASS = ["D2", "A2", "B2", "F2", "G2", "D2", "G2", "A2"];
  /* 和弦音（上方三声部，每小节持续） */
  const CHORDS = [
    ["D3", "A3", "D4"],
    ["A2", "E3", "A3"],
    ["B2", "F3", "B3"],
    ["F2", "C3", "F3"],
    ["G2", "D3", "G3"],
    ["D3", "A3", "D4"],
    ["G2", "D3", "G3"],
    ["A2", "E3", "A3"],
  ];
  /* canon 主旋律模进（8 小节循环，每小节 8 个音） */
  const MELODY = [
    ["D5", "C5", "B4", "A4", "G4", "F4s", "E4", "D4"],
    ["C5", "B4", "A4", "G4", "F4s", "E4", "D4", "C4"],
    ["B4", "A4", "G4", "F4s", "E4", "D4", "C4", "B3"],
    ["A4", "G4", "F4s", "E4", "D4", "C4", "B3", "A3"],
    ["G4", "F4s", "E4", "D4", "C4", "B3", "A3", "G3"],
    ["F4s", "E4", "D4", "C4", "B3", "A3", "G3", "F3"],
    ["E4", "D4", "C4", "B3", "A3", "G3", "F3", "E3"],
    ["D4", "C4", "B3", "A3", "G3", "F3", "E3", "D3"],
  ];

  const BAR = 4.0;          // 每小节 4 秒（舒缓）
  const STEP = BAR / 8;     // 八分音符

  function makeSynth() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0;

    /* 厅堂混响：简单延迟回声 */
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.32;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
    master.connect(ctx.destination);
    return { ctx, master, delay, input: master };
  }

  /* 钢琴音：正弦基音 + 三角泛音，快起音、中长衰减 */
  function pianoNote(synth, freq, t, vel = 0.16, dur = 1.8) {
    const { ctx, master, delay } = synth;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(g);

    /* 二次泛音（三角波，模拟琴槌敲击的明亮感） */
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    osc2.connect(g2).connect(g);

    /* 三次泛音（极弱，增加质感） */
    const osc3 = ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.value = freq * 3;
    const g3 = ctx.createGain();
    g3.gain.value = 0.06;
    osc3.connect(g3).connect(g);

    g.connect(master);
    g.connect(delay);
    osc.start(t); osc.stop(t + dur + 0.1);
    osc2.start(t); osc2.stop(t + dur + 0.1);
    osc3.start(t); osc3.stop(t + dur + 0.1);
  }

  /* 弦乐持续音（pad）：慢起音、长延音 */
  function stringPad(synth, freq, t, dur) {
    const { ctx, master } = synth;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    /* 低通滤波让锯齿波变柔和弦乐 */
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 1.0);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  const synthState = { synth: null, playing: false, barIndex: 0, timer: null };

  function scheduleBar(t0) {
    const idx = synthState.barIndex % MELODY.length;
    /* 主旋律（钢琴，中音区，轻盈） */
    MELODY[idx].forEach((n, i) => {
      if (!n) return;
      const accent = i === 0 ? 0.18 : 0.12;
      pianoNote(synthState.synth, NOTE[n], t0 + i * STEP, accent, n.endsWith("5") ? 2.0 : 1.5);
    });
    /* 低音（钢琴，低八度，每小节首拍） */
    pianoNote(synthState.synth, NOTE[BASS[idx]], t0, 0.20, 2.8);
    pianoNote(synthState.synth, NOTE[BASS[idx]] / 2, t0, 0.10, 2.8);
    /* 和弦垫（弦乐 pad，三声部持续整小节） */
    CHORDS[idx].forEach((n) => stringPad(synthState.synth, NOTE[n], t0, BAR));
    /* 小节首拍高音泛音（碰钟点缀） */
    if (idx % 2 === 0) pianoNote(synthState.synth, NOTE.A5, t0 + 0.02, 0.04, 2.4);
    synthState.barIndex++;
  }

  function synthLoop() {
    if (!synthState.playing) return;
    const { ctx } = synthState.synth;
    const t0 = ctx.currentTime + 0.1;
    scheduleBar(t0);
    const waitMs = Math.max(50, (t0 + BAR - ctx.currentTime - 0.1) * 1000);
    synthState.timer = setTimeout(synthLoop, waitMs);
  }

  function synthStart() {
    if (!synthState.synth) synthState.synth = makeSynth();
    const { ctx, master } = synthState.synth;
    if (ctx.state === "suspended") ctx.resume();
    synthState.playing = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    synthLoop();
  }

  function synthStop() {
    synthState.playing = false;
    clearTimeout(synthState.timer);
    if (synthState.synth) {
      const { ctx, master } = synthState.synth;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    }
  }

  /* ---------- 对外接口 ---------- */
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "none";

  /* 默认无文件曲目 → 用合成器；用户上传后切换为文件模式 */
  const DEFAULT_TRACK = App.config && App.config.defaultMusic ? App.config.defaultMusic : null;
  if (DEFAULT_TRACK) audio.src = DEFAULT_TRACK;

  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  const state = { mode: DEFAULT_TRACK ? "file" : "synth", playing: false, listeners: [] };
  /* 初始无文件且无合成器时，mode 设为 synth 等待首次 play 启动合成器 */

  function emit() { state.listeners.forEach((cb) => cb(state)); }

  async function play() {
    try {
      if (state.mode === "file" && audio.src) {
        try { await audio.play(); }
        catch (e) { state.mode = "synth"; synthStart(); }
      } else {
        state.mode = "synth";
        synthStart();
      }
      state.playing = true;
      emit();
    } catch (e) {
      App.toast("暂时无法播放，请再试一次");
    }
  }

  function pause() {
    if (state.mode === "file") audio.pause();
    else synthStop();
    state.playing = false;
    emit();
  }

  App.music = {
    state,
    onChange(cb) { state.listeners.push(cb); },
    play, pause,
    toggle() { state.playing ? pause() : play(); },
    async setFile(blob, autoplay) {
      const wasPlaying = state.playing || autoplay;
      if (state.mode === "synth") synthStop();
      if (audio.src) URL.revokeObjectURL(audio.src);
      audio.src = URL.createObjectURL(blob);
      state.mode = "file";
      if (wasPlaying) {
        try { await audio.play(); state.playing = true; }
        catch (e) { state.playing = false; }
      } else { state.playing = false; }
      emit();
    },
    hasFile: () => state.mode === "file",
  };
})();
