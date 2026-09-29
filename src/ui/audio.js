// Efectos sintetizados con WebAudio (sin archivos) y la voz del cantor.

class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.voiceOn = true;
    this.voice = null;
    this._noise = null;
  }

  unlock() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    this._pickVoice();
  }

  _ok() {
    return this.ctx && !this.muted && this.ctx.state === 'running';
  }

  _noiseBuf() {
    if (this._noise) return this._noise;
    const len = this.ctx.sampleRate * 1;
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noise = b;
    return b;
  }

  _env(node, t0, a, peak, dur) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  tone(freq, dur = 0.3, type = 'sine', vol = 0.3, delay = 0) {
    if (!this._ok()) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    this._env(g, t0, 0.008, vol, dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  whoosh(dur = 0.45) {
    if (!this._ok()) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(2400, t0 + dur * 0.7);
    const g = this.ctx.createGain();
    this._env(g, t0, dur * 0.4, 0.35, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  ding() {
    this.tone(1046.5, 0.9, 'sine', 0.22);
    this.tone(1568, 0.7, 'sine', 0.1, 0.01);
    this.tone(523.25, 0.5, 'triangle', 0.08);
  }

  bean() {
    if (!this._ok()) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf();
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2500;
    const g = this.ctx.createGain();
    this._env(g, t0, 0.002, 0.4, 0.05);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + 0.08);
    this.tone(210, 0.09, 'sine', 0.25);
    // rebotes
    this.tone(260, 0.05, 'sine', 0.12, 0.16);
    this.tone(300, 0.04, 'sine', 0.06, 0.26);
  }

  buzz() {
    this.tone(120, 0.18, 'square', 0.08);
    this.tone(90, 0.2, 'square', 0.06, 0.08);
  }

  pop() {
    if (!this._ok()) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(420 + Math.random() * 300, t0);
    o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 300, t0 + 0.08);
    this._env(g, t0, 0.005, 0.18, 0.14);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + 0.2);
  }

  // Fanfarria tipo trompeta de mariachi
  fanfare() {
    if (!this._ok()) return;
    const notes = [
      [523.25, 0, 0.14], [659.25, 0.15, 0.14], [783.99, 0.3, 0.14], [1046.5, 0.45, 0.7],
      [783.99, 1.2, 0.12], [1046.5, 1.34, 0.9],
    ];
    for (const [f, d, len] of notes) {
      for (const det of [0, 4]) {
        const t0 = this.ctx.currentTime + d;
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t0);
        o.detune.value = det;
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 5.5;
        lg.gain.value = len > 0.3 ? 9 : 0;
        lfo.connect(lg).connect(o.frequency);
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(900, t0);
        flt.frequency.linearRampToValueAtTime(2600, t0 + 0.08);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
        g.gain.setValueAtTime(0.12, t0 + len * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.15);
        o.connect(flt).connect(g).connect(this.master);
        o.start(t0);
        lfo.start(t0);
        o.stop(t0 + len + 0.2);
        lfo.stop(t0 + len + 0.2);
      }
    }
  }

  // --- voz ---------------------------------------------------------------
  voiceAvailable() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  _pickVoice() {
    if (!this.voiceAvailable() || this.voice) return;
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      this.voice = voices.find((v) => /es[-_]MX/i.test(v.lang)) || voices.find((v) => /es[-_](US|419)/i.test(v.lang)) || voices.find((v) => /^es/i.test(v.lang)) || null;
    };
    choose();
    if (!this.voice) window.speechSynthesis.onvoiceschanged = choose;
  }

  speak(text, { rate = 0.98, pitch = 1 } = {}) {
    if (!this.voiceOn || this.muted || !this.voiceAvailable()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.voice?.lang || 'es-MX';
      if (this.voice) u.voice = this.voice;
      u.rate = rate;
      u.pitch = pitch;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  hush() {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }
}

export const sound = new Sound();

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

let wakeLock = null;
export async function keepAwake() {
  try {
    if (wakeLock || !navigator.wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener?.('release', () => (wakeLock = null));
  } catch {
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && wakeLock === null && keepAwake.wanted) keepAwake();
});
