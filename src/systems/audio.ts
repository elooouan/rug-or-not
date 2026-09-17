/**
 * Synthesised placeholder audio: chunky arcade blips for UI/gameplay, a rain
 * bed, and a generated lo-fi loop (pad, bass, soft drums, vinyl crackle).
 * Everything goes through one master gain so real samples can replace the
 * oscillators later without touching gameplay code.
 */
export type SoundName =
  | 'paper'
  | 'pin'
  | 'unpin'
  | 'stamp'
  | 'tick'
  | 'ui'
  | 'correct'
  | 'wrong'
  | 'unlock'
  | 'slide'
  | 'sip'
  | 'meow'
  | 'click'
  | 'thunder'
  | 'tally'
  | 'caseClosed'
  | 'hover';

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

// Lo-fi loop: 4 chords x 2 bars, A minor-ish, 74 bpm.
const BPM = 74;
const STEPS_PER_BAR = 16;
const LOOP_STEPS = STEPS_PER_BAR * 16; // A section (8 bars) then B section (8 bars)
const CHORDS: { pad: number[]; bass: number }[] = [
  { pad: [57, 60, 64, 67], bass: 45 }, // Am7
  { pad: [53, 57, 60, 64], bass: 41 }, // Fmaj7
  { pad: [52, 55, 59, 64], bass: 48 }, // Cmaj7 (rootless)
  { pad: [55, 59, 62, 64], bass: 43 }, // G6
  // B section: a little more movement, resolves back to Am.
  { pad: [50, 53, 57, 60], bass: 38 }, // Dm7
  { pad: [55, 59, 62, 65], bass: 43 }, // G7
  { pad: [52, 55, 59, 64], bass: 48 }, // Cmaj7
  { pad: [52, 56, 59, 62], bass: 40 }, // E7 (turnaround)
];
const PENTATONIC = [69, 72, 74, 76, 79, 81, 84];

export class AudioManager {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private crackle: AudioBufferSourceNode | null = null;
  private volume = 0.6;
  private rainWanted = false;
  private rainHeavy = false;
  private rainGain: GainNode | null = null;
  private musicWanted = true;
  private musicTimer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private padVoices: { osc: OscillatorNode[]; gain: GainNode }[] = [];
  private noiseBuf: AudioBuffer | null = null;
  private tension = false;
  private musicVolume = 0.55;

  /** Must be called from a user gesture (pointer/keyboard) to satisfy autoplay rules. */
  unlock(existing?: BaseAudioContext): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void (this.ctx as AudioContext).resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor && !existing) return;
      // `existing` lets tooling render into an OfflineAudioContext to measure levels.
      this.ctx = (existing ?? new Ctor!()) as AudioContext;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 1;
      this.sfx.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVolume;
      this.musicBus.connect(this.master);
      if (this.rainWanted) this.startRain();
      if (this.musicWanted) this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  setRain(on: boolean, heavy = false): void {
    this.rainWanted = on;
    this.rainHeavy = heavy;
    if (!this.ctx) return;
    if (on) {
      this.startRain();
      if (this.rainGain) this.rainGain.gain.value = heavy ? 0.06 : 0.03;
    } else this.stopRain();
  }

  /** Music level relative to the master volume. */
  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume;
  }

  /** Last-seconds mode: busier hats and a driving bass. */
  setTension(on: boolean): void {
    this.tension = on;
  }

  setMusic(on: boolean): void {
    this.musicWanted = on;
    if (!this.ctx) return;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  // ---- one-shots -------------------------------------------------------------------

  private lastHover = -1;

  play(name: SoundName): void {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    if (name === 'hover') {
      // Sweeping the lens across many spots shouldn't machine-gun blips.
      if (t - this.lastHover < 0.07) return;
      this.lastHover = t;
    }
    switch (name) {
      case 'ui':
        this.tone(t, 'square', 660, 660, 0.035, 0.1);
        this.tone(t + 0.04, 'square', 990, 990, 0.05, 0.08);
        break;
      case 'hover':
        this.tone(t, 'square', 520, 520, 0.02, 0.04);
        break;
      case 'pin':
        this.tone(t, 'triangle', 1100, 1650, 0.07, 0.2);
        this.noise(t, 0.02, 0.15, 4000, 'highpass');
        break;
      case 'unpin':
        this.tone(t, 'triangle', 1000, 520, 0.09, 0.16);
        break;
      case 'tick':
        this.noise(t, 0.012, 0.1, 3000, 'highpass');
        break;
      case 'tally':
        this.tone(t, 'square', 880, 880, 0.025, 0.06);
        break;
      case 'click':
        this.noise(t, 0.015, 0.25, 2500, 'highpass');
        this.tone(t, 'square', 1800, 1800, 0.012, 0.08);
        break;
      case 'paper':
        this.noise(t, 0.14, 0.32, 1800, 'bandpass', 500);
        break;
      case 'slide':
        this.noise(t, 0.22, 0.24, 900, 'lowpass', 300);
        break;
      case 'stamp':
        this.tone(t, 'sine', 120, 38, 0.18, 0.55);
        this.tone(t, 'square', 210, 190, 0.03, 0.15);
        this.noise(t, 0.06, 0.35, 700, 'lowpass');
        this.noise(t + 0.01, 0.02, 0.2, 5000, 'highpass');
        break;
      case 'correct':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(t + i * 0.08, 'square', f, f, 0.12, 0.13),
        );
        break;
      case 'caseClosed':
        [523, 659, 784].forEach((f) => this.tone(t, 'triangle', f, f, 0.7, 0.09));
        this.tone(t + 0.02, 'triangle', 1047, 1047, 0.6, 0.06);
        break;
      case 'wrong':
        this.tone(t, 'square', 330, 260, 0.22, 0.12);
        this.tone(t + 0.24, 'square', 220, 165, 0.32, 0.12);
        break;
      case 'unlock':
        [659, 880, 1175, 1568].forEach((f, i) =>
          this.tone(t + i * 0.07, 'triangle', f, f, 0.16, 0.14),
        );
        this.tone(t + 0.3, 'sine', 2093, 2637, 0.25, 0.05);
        break;
      case 'sip':
        this.noise(t, 0.32, 0.18, 500, 'bandpass', 1100);
        this.tone(t + 0.22, 'sine', 170, 110, 0.12, 0.2);
        break;
      case 'meow':
        this.tone(t, 'triangle', 540, 900, 0.13, 0.14);
        this.tone(t + 0.13, 'triangle', 900, 620, 0.2, 0.12);
        break;
      case 'thunder':
        this.noise(t, 1.4, 0.9, 160, 'lowpass', 40);
        this.noise(t + 0.25, 0.9, 0.5, 90, 'lowpass', 30);
        this.noise(t + 0.05, 0.3, 0.12, 900, 'bandpass', 300);
        break;
    }
  }

  private tone(
    t: number,
    type: OscillatorType,
    from: number,
    to: number,
    dur: number,
    gain: number,
    dest: AudioNode | null = this.sfx,
  ): void {
    if (!this.ctx || !dest) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuf) return this.noiseBuf;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  private noise(
    t: number,
    dur: number,
    gain: number,
    freq: number,
    type: BiquadFilterType = 'lowpass',
    sweepTo?: number,
    dest: AudioNode | null = this.sfx,
  ): void {
    if (!this.ctx || !dest) return;
    const buf = this.noiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t);
    if (sweepTo !== undefined) filt.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---- rain bed ----------------------------------------------------------------------

  private startRain(): void {
    if (!this.ctx || !this.sfx || this.rainNode) return;
    const buf = this.noiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 2200;
    filt.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.value = this.rainHeavy ? 0.06 : 0.03;
    src.connect(filt).connect(g).connect(this.sfx);
    src.start();
    this.rainNode = src;
    this.rainGain = g;
  }

  private stopRain(): void {
    try {
      this.rainNode?.stop();
    } catch {
      /* already stopped */
    }
    this.rainNode = null;
    this.rainGain = null;
  }

  // ---- lo-fi loop ---------------------------------------------------------------------

  private get sixteenth(): number {
    return 60 / BPM / 4;
  }

  private startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicTimer !== null) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.startCrackle();
    this.musicTimer = window.setInterval(() => this.schedule(), 90);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    const t = this.ctx?.currentTime ?? 0;
    for (const v of this.padVoices) this.releasePad(v, t);
    this.padVoices = [];
    try {
      this.crackle?.stop();
    } catch {
      /* noop */
    }
    this.crackle = null;
  }

  private schedule(): void {
    if (!this.ctx) return;
    while (this.nextStepTime < this.ctx.currentTime + 0.25) {
      // Light swing on the off-eighths.
      const swing = this.step % 4 === 2 ? this.sixteenth * 0.18 : 0;
      this.playStep(this.step, this.nextStepTime + swing);
      this.step = (this.step + 1) % LOOP_STEPS;
      this.nextStepTime += this.sixteenth;
    }
  }

  private playStep(step: number, t: number): void {
    if (!this.ctx || !this.musicBus) return;
    const bus = this.musicBus;
    const chord = CHORDS[Math.floor(step / (STEPS_PER_BAR * 2)) % CHORDS.length];
    const inBar = step % STEPS_PER_BAR;

    // Pad: retrigger on chord changes.
    if (step % (STEPS_PER_BAR * 2) === 0) {
      for (const v of this.padVoices) this.releasePad(v, t);
      this.padVoices = chord.pad.map((n) => this.padVoice(n, t));
    }
    // Bass on 1 and the "and" of 3; every beat when the clock is running out.
    if (inBar === 0 || inBar === 10 || (this.tension && inBar % 4 === 0))
      this.tone(
        t,
        'sine',
        midi(chord.bass),
        midi(chord.bass),
        this.tension ? 0.3 : 0.55,
        0.16,
        bus,
      );
    // Kick on 1 and 3, snare on 2 and 4, hats on eighths.
    if (inBar === 0 || inBar === 8) this.tone(t, 'sine', 110, 42, 0.13, 0.32, bus);
    if (inBar === 4 || inBar === 12) {
      this.noise(t, 0.11, 0.09, 1700, 'bandpass', undefined, bus);
      this.tone(t, 'sine', 190, 120, 0.05, 0.08, bus);
    }
    if (inBar % 2 === 0 || this.tension)
      this.noise(t, 0.025, inBar % 4 === 0 ? 0.035 : 0.02, 7000, 'highpass', undefined, bus);
    // Sparse pentatonic melody with a little vibrato.
    if (step % 4 === 0 && Math.random() < 0.3) {
      const n = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      this.melodyNote(midi(n), t);
    }
  }

  private padVoice(note: number, t: number): { osc: OscillatorNode[]; gain: GainNode } {
    const ctx = this.ctx as AudioContext;
    const bus = this.musicBus as GainNode;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.6);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 650;
    const oscs = [-6, 6].map((cents) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(note);
      o.detune.value = cents;
      o.connect(filt);
      o.start(t);
      return o;
    });
    filt.connect(g).connect(bus);
    return { osc: oscs, gain: g };
  }

  private releasePad(v: { osc: OscillatorNode[]; gain: GainNode }, t: number): void {
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t);
    v.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    v.osc.forEach((o) => o.stop(t + 0.85));
  }

  private melodyNote(freq: number, t: number): void {
    const ctx = this.ctx as AudioContext;
    const bus = this.musicBus as GainNode;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = freq * 0.006;
    lfo.connect(lfoGain).connect(o.frequency);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(filt).connect(g).connect(bus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.75);
    lfo.stop(t + 0.75);
  }

  private startCrackle(): void {
    if (!this.ctx || !this.musicBus || this.crackle) return;
    const buf = this.noiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.35;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 3500;
    const g = this.ctx.createGain();
    g.gain.value = 0.012;
    src.connect(filt).connect(g).connect(this.musicBus);
    src.start();
    this.crackle = src;
  }
}

export const audio = new AudioManager();
