export interface Settings {
  volume: number; // 0..1
  relaxed: boolean; // disables timers
  reducedMotion: boolean;
  lampFlicker: boolean;
  noMagnifier: boolean; // accessibility: fine print shown inline
  rain: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6,
  relaxed: false,
  reducedMotion: false,
  lampFlicker: true,
  noMagnifier: false,
  rain: true,
};

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Record<keyof Settings, unknown>>;
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
    rain: bool(r.rain, DEFAULT_SETTINGS.rain),
  };
}
