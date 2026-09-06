/* ============ music.js · 背景音乐 ============
   内置「宫商角徵羽」五声音阶合成（古筝拨弦质感，无需素材）
   也支持用户上传自己的音乐（Blob 循环播放）
====================================================== */
(function () {
  const App = window.App;

  const NOTE = {
    F2: 87.31, G2: 98.0, A2: 110.0,
    C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.0, A3: 220.0,
    C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
    C6: 1046.5,
  };

  /* 五声音阶主旋律（宫调式，舒缓喜庆） */
  const MELODY = [
    ["C5", null, "E5", null, "D5", "C5", null, "A4"],
    ["G4", null, "A4", null, "C5", null, "D5", null],
    ["E5", null, "D5", "C5", null, "A4", null, "G4"],
    ["A4", null, "C5", "D5", null, "E5", null, null],
    ["G5", null, "E5", null, "D5", "E5", null, "C5"],
    ["D5", null, "C5", "A4", null, "G4", null, "A4"],
    ["C5", null, "D5", "E5", null, "G5", null, "E5"],
    ["D5", null, "C5", null, "A4", null, "G4", null],
  ];
  /* 每小节和声垫（C - Am - F - G 走向） */
  const PADS = [
    ["C3", "G3"], ["A2", "E3"], ["F2", "C3"], ["G2", "D3"],
    ["C3", "G3"], ["A2", "E3"], ["F2", "C3"], ["G2", "D3"],
  ];

  const BAR = 4.2;
  const STEP = BAR / 8;

  function makeSynth() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0;

    /* 简易回声，模拟厅堂 */
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.38;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);

    master.connect(ctx.destination);
    return { ctx, master, delay, input: master };
  }

  /* 拨弦音：正弦基音 + 微弱高八度三角波，快起音、长衰减 */
  function pluck(synth, freq, t, vel = 0.14, dur = 2.0) {
    const { ctx, master, delay } = synth;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(g);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;
    osc2.connect(g2).connect(g);

    g.connect(master);
    g.connect(delay);
    osc.start(t); osc.stop(t + dur + 0.1);
    osc2.start(t); osc2.stop(t + dur + 0.1);
  }

  function pad(synth, freq, t, dur) {
    const { ctx, master } = synth;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.03, t + 1.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  const synthState = { synth: null, playing: false, barIndex: 0, timer: null };

  function scheduleBar(t0) {
    const idx = synthState.barIndex % MELODY.length;
    MELODY[idx].forEach((n, i) => {
      if (!n) return;
      const accent = i === 0 ? 0.16 : 0.11;
      pluck(synthState.synth, NOTE[n], t0 + i * STEP, accent, n[1] === "5" ? 2.2 : 1.8);
    });
    /* 小节首音加一声高音泛音，如碰铃 */
    if (idx % 2 === 0) pluck(synthState.synth, NOTE.C6, t0 + 0.02, 0.05, 2.6);
    PADS[idx].forEach((n) => pad(synthState.synth, NOTE[n], t0, BAR));
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
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8);
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
  audio.preload = "auto";

  const state = { mode: "none", playing: false, listeners: [] };

  function emit() {
    state.listeners.forEach((cb) => cb(state));
  }

  async function play() {
    try {
      if (state.mode === "file") {
        await audio.play();
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
    onChange(cb) {
      state.listeners.push(cb);
    },
    play,
    pause,
    toggle() {
      state.playing ? pause() : play();
    },
    async setFile(blob, autoplay) {
      const wasPlaying = state.playing || autoplay;
      if (state.mode === "synth") synthStop();
      if (audio.src) URL.revokeObjectURL(audio.src);
      audio.src = URL.createObjectURL(blob);
      state.mode = "file";
      if (wasPlaying) {
        try {
          await audio.play();
          state.playing = true;
        } catch (e) {
          state.playing = false;
        }
      } else {
        state.playing = false;
      }
      emit();
    },
    hasFile: () => state.mode === "file",
  };
})();
