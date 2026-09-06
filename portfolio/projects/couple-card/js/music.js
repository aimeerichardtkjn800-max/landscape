/* ============ music.js · 背景音乐（内置轻音乐 / 用户上传音频） ============ */
(function () {
  const App = window.App;

  /* ---------- 内置柔和八音盒（WebAudio 合成，无需素材） ---------- */
  const NOTE = {
    F2: 87.31, G2: 98.0, A2: 110.0, C3: 130.81, D3: 146.83, E3: 164.81,
    F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66,
    E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, E5: 659.25,
  };
  const PROG = [
    ["C3", "G3", "C4", "E4", "G4", "E4", "C4", "G3"],
    ["A2", "E3", "A3", "C4", "E4", "C4", "A3", "E3"],
    ["F2", "C3", "F3", "A3", "C4", "A3", "F3", "C3"],
    ["G2", "D3", "G3", "B3", "D4", "B3", "G3", "D3"],
  ];
  const PADS = [
    ["C3", "G3"], ["A2", "E3"], ["F2", "C3"], ["G2", "D3"],
  ];

  const BAR = 3.6; // 每小节时长（秒）
  const STEP = BAR / 8;

  function makeSynth() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0;

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);

    master.connect(ctx.destination);
    return { ctx, master, delay, input: master };
  }

  function playNote(synth, freq, t, vel = 0.16, dur = 1.7) {
    const { ctx, master, delay } = synth;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    g.connect(delay);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  function playPad(synth, freq, t, dur) {
    const { ctx, master } = synth;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  const synthState = {
    synth: null,
    playing: false,
    barIndex: 0,
    timer: null,
  };

  function scheduleBar(t0) {
    const idx = synthState.barIndex % PROG.length;
    const notes = PROG[idx];
    notes.forEach((n, i) => {
      playNote(synthState.synth, NOTE[n], t0 + i * STEP, i % 2 === 0 ? 0.15 : 0.11);
    });
    PADS[idx].forEach((n) => playPad(synthState.synth, NOTE[n], t0, BAR));
    synthState.barIndex++;
  }

  function synthLoop() {
    if (!synthState.playing) return;
    const { ctx } = synthState.synth;
    const t0 = ctx.currentTime + 0.08;
    scheduleBar(t0);
    const waitMs = Math.max(50, (t0 + BAR - ctx.currentTime - 0.08) * 1000);
    synthState.timer = setTimeout(synthLoop, waitMs);
  }

  function synthStart() {
    if (!synthState.synth) synthState.synth = makeSynth();
    const { ctx, master } = synthState.synth;
    if (ctx.state === "suspended") ctx.resume();
    synthState.playing = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
    synthLoop();
  }

  function synthStop() {
    synthState.playing = false;
    clearTimeout(synthState.timer);
    if (synthState.synth) {
      const { ctx, master } = synthState.synth;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    }
  }

  /* ---------- 对外接口 ---------- */
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";

  const state = {
    mode: "none", // none | synth | file
    playing: false,
    listeners: [],
  };

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
    toggle() {
      state.playing ? pause() : play();
    },
    async setFile(blob) {
      const wasPlaying = state.playing;
      if (state.mode === "synth") synthStop();
      if (audio.src) URL.revokeObjectURL(audio.src);
      audio.src = URL.createObjectURL(blob);
      state.mode = "file";
      if (wasPlaying) {
        try {
          await audio.play();
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
