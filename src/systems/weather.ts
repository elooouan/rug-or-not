import { audio } from './audio';
import { saveStore } from './save';
import { WEATHERS, type Weather } from './settings';

/** Cycle to the next weather, persist it, and update the rain bed. Returns the new weather. */
export function cycleWeather(): Weather {
  const cur = saveStore.get().settings.weather;
  const next = WEATHERS[(WEATHERS.indexOf(cur) + 1) % WEATHERS.length];
  setWeather(next);
  return next;
}

export function setWeather(w: Weather): void {
  saveStore.update((d) => (d.settings.weather = w));
  applyWeatherAudio(w);
}

export function applyWeatherAudio(w: Weather): void {
  audio.setRain(w === 'rain' || w === 'storm', w === 'storm');
  audio.setWind(w === 'snow' || w === 'fog');
}
