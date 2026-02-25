import { useState, useCallback } from 'react';

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  uvIndex?: number;
  code: number;
  desc: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  localTime: string;
}

export type WeatherState = 'idle' | 'locating' | 'fetching' | 'ready' | 'error';

export function decodeWeather(code: number): {
  label: string; emoji: string; bg: [string, string]; accent: string;
} {
  if (code === 0)  return { label:'Clear Sky',     emoji:'sun',       bg:['#fffbeb','#fef3c7'], accent:'#f59e0b' };
  if (code <= 2)   return { label:'Partly Cloudy', emoji:'cloud-sun', bg:['#f0f9ff','#e0f2fe'], accent:'#38bdf8' };
  if (code === 3)  return { label:'Overcast',      emoji:'cloud',     bg:['#f8fafc','#e2e8f0'], accent:'#64748b' };
  if (code <= 48)  return { label:'Foggy',         emoji:'fog',       bg:['#f1f5f9','#cbd5e1'], accent:'#94a3b8' };
  if (code <= 57)  return { label:'Drizzle',       emoji:'drizzle',   bg:['#eff6ff','#dbeafe'], accent:'#60a5fa' };
  if (code <= 67)  return { label:'Rainy',         emoji:'rain',      bg:['#eff6ff','#bfdbfe'], accent:'#3b82f6' };
  if (code <= 77)  return { label:'Snowy',         emoji:'snow',      bg:['#f8fafc','#e2e8f0'], accent:'#94a3b8' };
  if (code <= 82)  return { label:'Rain Showers',  emoji:'showers',   bg:['#eff6ff','#bfdbfe'], accent:'#3b82f6' };
  if (code <= 99)  return { label:'Thunderstorm',  emoji:'storm',     bg:['#f1f5f9','#94a3b8'], accent:'#6366f1' };
  return                  { label:'Unknown',        emoji:'cloud',     bg:['#f8fafc','#e2e8f0'], accent:'#64748b' };
}

export function useWeather() {
  const [weatherState, setWeatherState] = useState<WeatherState>('idle');
  const [data, setData]                 = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const requestWeather = useCallback(() => {
    if (!navigator?.geolocation) {
      setWeatherError('Geolocation not supported in this browser.');
      setWeatherState('error');
      return;
    }
    setWeatherState('locating');
    setWeatherError(null);

    // Two-stage geolocation strategy:
    //   Stage 1 – 12s timeout, accept cached fix up to 5 min old (fast on repeat visits)
    //   Stage 2 – on timeout only, retry with maximumAge: Infinity to use any cached fix
    //             instantly, or wait the full 12s for a fresh one.
    //   This eliminates the 5s TIMEOUT error that fired on first GPS acquisition.
    const handlePosition = async ({ coords: { latitude: lat, longitude: lon } }: GeolocationPosition) => {
        setWeatherState('fetching');
        // ── 1. Fetch weather from our proxy (server sets proper headers + timeout) ──
        let wJson: Record<string, unknown>;
        try {
          const wRes = await fetch(
            `/api/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
          );
          if (!wRes.ok) throw new Error('Weather API returned ' + wRes.status);
          wJson = await wRes.json();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch weather';
          console.error('[useWeather] weather fetch error:', msg);
          setWeatherError('Could not load weather. Check your connection.');
          setWeatherState('error');
          return;
        }

        const c   = wJson.current as Record<string, number>;
        const now = new Date();

        // Show weather immediately with lat/lon as placeholder city
        const partial: WeatherData = {
          temp:      Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          humidity:  c.relative_humidity_2m,
          windSpeed: Math.round(c.wind_speed_10m),
          uvIndex:   c.uv_index != null ? Math.round(c.uv_index) : undefined,
          code:      c.weather_code,
          desc:      decodeWeather(c.weather_code).label,
          city:      lat.toFixed(2) + '°, ' + lon.toFixed(2) + '°',
          country:   '',
          lat, lon,
          localTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        setData(partial);
        setWeatherState('ready');

        // ── 2. Kick off geocode in background – failure just keeps coordinate label ──
        fetch(`/api/geocode?lat=${lat}&lon=${lon}`)
          .then(r => (r.ok ? r.json() : null))
          .then((geo: { city: string | null; country: string } | null) => {
            if (geo?.city) {
              setData(d => d ? { ...d, city: geo.city!, country: geo.country ?? '' } : d);
            }
          })
          .catch(() => { /* city stays as coordinates — not a failure */ });
    };

    const handleError = (err: GeolocationPositionError, isRetry = false) => {
      if (err.code === 3 && !isRetry) {
        // Stage 2: timeout on first attempt — retry immediately accepting any cached fix
        navigator.geolocation.getCurrentPosition(
          handlePosition,
          (err2) => handleError(err2, true),
          { enableHighAccuracy: false, timeout: 12_000, maximumAge: Infinity }
        );
        return;
      }
      const msgs: Record<number, string> = {
        1: 'Location access denied. Enable it in browser settings.',
        2: 'Location signal unavailable. Try moving to a window.',
        3: 'Location request timed out. Try again.',
      };
      const msg = msgs[err.code] ?? err.message;
      console.error('[useWeather] geolocation error:', msg);
      setWeatherError(msg);
      setWeatherState('error');
    };

    // Stage 1: 12s timeout, accept cached fix up to 5 min old
    navigator.geolocation.getCurrentPosition(
      handlePosition,
      (err) => handleError(err, false),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 }
    );
  }, []);

  return { weatherState, data, weatherError, requestWeather };
}
