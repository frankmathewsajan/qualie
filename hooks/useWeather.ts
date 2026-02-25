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
      setWeatherError('Geolocation not supported');
      setWeatherState('error');
      return;
    }
    setWeatherState('locating');
    setWeatherError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        setWeatherState('fetching');

        // Fire both requests simultaneously, don't await geocode before showing weather
        const [wRes, gResPromise] = [
          fetch(
            'https://api.open-meteo.com/v1/forecast' +
            '?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
            '&current=temperature_2m,apparent_temperature,relative_humidity_2m,' +
            'wind_speed_10m,weather_code,uv_index' +
            '&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto'
          ),
          fetch(
            'https://nominatim.openstreetmap.org/reverse?lat=' + lat +
            '&lon=' + lon + '&format=json&zoom=14',
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'Qualie/1.0' } }
          ),
        ];

        try {
          const wJson = await (await wRes).json();
          const c = wJson.current;
          const now = new Date();

          // Show weather immediately with coords as placeholder city
          const partial: WeatherData = {
            temp:      Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            humidity:  c.relative_humidity_2m,
            windSpeed: Math.round(c.wind_speed_10m),
            uvIndex:   c.uv_index != null ? Math.round(c.uv_index) : undefined,
            code:      c.weather_code,
            desc:      decodeWeather(c.weather_code).label,
            city:      lat.toFixed(2) + ', ' + lon.toFixed(2),
            country:   '',
            lat, lon,
            localTime: now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
          };
          setData(partial);
          setWeatherState('ready');

          // Then update city name when geocode resolves (non-blocking)
          gResPromise.then(r => r.json()).then(gJson => {
            const a = gJson.address || {};
            const city = a.suburb || a.neighbourhood || a.city || a.town || a.village || a.county;
            if (city) setData(d => d ? { ...d, city, country: (a.country_code || '').toUpperCase() } : d);
          }).catch(() => {/* city stays as coords */});

        } catch {
          setWeatherError('Could not fetch weather');
          setWeatherState('error');
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location access denied.',
          2: 'Location unavailable.',
          3: 'Location timed out.',
        };
        setWeatherError(msgs[err.code] ?? err.message);
        setWeatherState('error');
      },
      // Low-accuracy = instant cell/wifi fix instead of slow GPS
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
    );
  }, []);

  return { weatherState, data, weatherError, requestWeather };
}
