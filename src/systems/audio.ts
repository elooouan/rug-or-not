/**
 * Placeholder WebAudio synth. All game sounds go through here so real
 * samples can replace the oscillators later without touching gameplay code.
 */
export type SoundName =
  'paper' | 'pin' | 'unpin' | 'stamp' | 'tick' | 'ui' | 'correct' | 'wrong' | 'unlock' | 'slide';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private volume = 0.6;
  private rainWanted = false;

  /** Must be called from a user gesture (pointer/keyboard) to satisfy autoplay rules. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      if (this.rainWanted) this.startRain();
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  setRain(on: boolean): void {
    this.rainWanted = on;
    if (!this.ctx) return;
    if (on) this.startRain();
    else this.stopRain();
  }

  play(name: SoundName): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'pin':
        this.tone(t, 'sine', 880, 520, 0.09, 0.22);
        break;
      case 'unpin':
        this.tone(t, 'sine', 520, 880, 0.09, 0.16);
        break;
      case 'ui':
        this.tone(t, 'square', 660, 660, 0.04, 0.08);
        break;
      case 'tick':
        this.noise(t, 0.012, 0.12, 3000);
        break;
      case 'paper':
        this.noise(t, 0.09, 0.2, 1400);
        this.noise(t + 0.05, 0.06, 0.12, 900);
        break;
      case 'slide':
        this.noise(t, 0.16, 0.14, 700);
        break;
      case 'stamp':
        this.tone(t, 'sine', 140, 60, 0.16, 0.5);
        this.noise(t, 0.05, 0.3, 500);
        break;
      case 'correct':
        this.tone(t, 'triangle', 523, 523, 0.1, 0.2);
        this.tone(t + 0.11, 'triangle', 784, 784, 0.16, 0.2);
        break;
      case 'wrong':
        this.tone(t, 'triangle', 392, 392, 0.12, 0.2);
        this.tone(t + 0.13, 'triangle', 262, 262, 0.22, 0.2);
        break;
      case 'unlock':
        this.tone(t, 'triangle', 659, 659, 0.08, 0.15);
        this.tone(t + 0.09, 'triangle', 880, 880, 0.08, 0.15);
        this.tone(t + 0.18, 'triangle', 1174, 1174, 0.18, 0.15);
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
  ): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noise(t: number, dur: number, gain: number, cutoff: number): void {
    if (!this.ctx || !this.master) return;
    const buf = this.noiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private startRain(): void {
    if (!this.ctx || !this.master || this.rainNode) return;
    const buf = this.noiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 600;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filt).connect(g).connect(this.master);
    src.start();
    this.rainNode = src;
  }

  private stopRain(): void {
    try {
      this.rainNode?.stop();
    } catch {
      /* already stopped */
    }
    this.rainNode = null;
  }
}

export const audio = new AudioManager();
