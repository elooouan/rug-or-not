export const WEATHERS = ['rain', 'storm', 'snow', 'clear', 'fog'] as const;
export type Weather = (typeof WEATHERS)[number];
export const WEATHER_LABEL: Record<Weather, string> = {
  rain: 'rain',
  storm: 'thunderstorm',
  snow: 'snow',
  clear: 'clear night',
  fog: 'fog',
};

export interface Settings {
  volume: number; // 0..1
  relaxed: boolean; // disables timers
  reducedMotion: boolean;
  lampFlicker: boolean;
  noMagnifier: boolean; // accessibility: fine print shown inline
  weather: Weather;
  music: boolean;
  musicVolume: number; // 0..1, relative to master
  /** Lucien's once-only guidance. */
  hints: boolean;
  /** Lucien's passing remarks (corner bubbles). */
  quips: boolean;
  /** Detective's honour: no nudges, no counters, no hover highlights, x1.25 score. */
  hardMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6,
  relaxed: false,
  reducedMotion: false,
  lampFlicker: true,
  noMagnifier: false,
  weather: 'rain',
  music: true,
  musicVolume: 0.5,
  hints: true,
  quips: true,
  hardMode: false,
};

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Record<keyof Settings | 'rain', unknown>>;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const vol =
    typeof r.volume === 'number' && Number.isFinite(r.volume)
      ? Math.min(1, Math.max(0, r.volume))
      : DEFAULT_SETTINGS.volume;
  return {
    volume: vol,
    relaxed: bool(r.relaxed, DEFAULT_SETTINGS.relaxed),
    reducedMotion: bool(r.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    lampFlicker: bool(r.lampFlicker, DEFAULT_SETTINGS.lampFlicker),
    noMagnifier: bool(r.noMagnifier, DEFAULT_SETTINGS.noMagnifier),
    weather: (WEATHERS as readonly string[]).includes(r.weather as string)
      ? (r.weather as Weather)
      : r.rain === false
        ? 'clear' // legacy saves had a rain on/off switch
        : DEFAULT_SETTINGS.weather,
    music: bool(r.music, DEFAULT_SETTINGS.music),
    musicVolume:
      typeof r.musicVolume === 'number' && Number.isFinite(r.musicVolume)
        ? Math.min(1, Math.max(0, r.musicVolume))
        : DEFAULT_SETTINGS.musicVolume,
    hints: bool(r.hints, DEFAULT_SETTINGS.hints),
    quips: bool(r.quips, DEFAULT_SETTINGS.quips),
    hardMode: bool(r.hardMode, DEFAULT_SETTINGS.hardMode),
  };
}
