const GEO_BASE = "https://geocoding-api.open-meteo.com/v1";
const FORECAST_BASE = "https://api.open-meteo.com/v1";

export interface LocationResult {
  name: string;
  adminArea: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CurrentConditions {
  tempF: number;
  feelsLikeF: number;
  humidity: number;
  windMph: number;
  condition: string;
  isDaylight: boolean;
  weatherCode: number;
}

export interface HourlyForecast {
  time: string;
  tempF: number;
  precipChance: number;
  condition: string;
  isDaylight: boolean;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  precipChance: number;
  condition: string;
  weatherCode: number;
}

// WMO weather code → human-readable condition
export function wmoCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return "Unknown";
}

export async function searchLocation(query: string): Promise<LocationResult | null> {
  const res = await fetch(
    `${GEO_BASE}/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  );
  const data = await res.json();
  if (!data.results?.length) return null;
  const r = data.results[0];
  return {
    name: r.name,
    adminArea: r.admin1 ?? "",
    country: r.country ?? "",
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

export async function getCurrentConditions(loc: LocationResult): Promise<CurrentConditions | null> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
  });
  const res = await fetch(`${FORECAST_BASE}/forecast?${params}`);
  const data = await res.json();
  const c = data.current;
  if (!c) return null;
  const code = c.weather_code;
  return {
    tempF: Math.round(c.temperature_2m),
    feelsLikeF: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windMph: Math.round(c.wind_speed_10m),
    condition: wmoCondition(code),
    isDaylight: c.is_day === 1,
    weatherCode: code,
  };
}

export async function getHourlyForecast(loc: LocationResult): Promise<HourlyForecast[]> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
    temperature_unit: "fahrenheit",
    forecast_days: "2",
    timezone: "auto",
  });
  const res = await fetch(`${FORECAST_BASE}/forecast?${params}`);
  const data = await res.json();
  const h = data.hourly;
  if (!h) return [];

  // Find current hour index and return next 12
  const now = new Date();
  const startIdx = h.time.findIndex((t: string) => new Date(t) >= now);
  const idx = startIdx === -1 ? 0 : startIdx;

  return h.time.slice(idx, idx + 12).map((t: string, i: number) => {
    const code = h.weather_code[idx + i];
    return {
      time: new Date(t).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      tempF: Math.round(h.temperature_2m[idx + i]),
      precipChance: h.precipitation_probability[idx + i] ?? 0,
      condition: wmoCondition(code),
      isDaylight: h.is_day[idx + i] === 1,
      weatherCode: code,
    };
  });
}

export async function getDailyForecast(loc: LocationResult): Promise<DailyForecast[]> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    temperature_unit: "fahrenheit",
    forecast_days: "5",
    timezone: "auto",
  });
  const res = await fetch(`${FORECAST_BASE}/forecast?${params}`);
  const data = await res.json();
  const d = data.daily;
  if (!d) return [];

  return d.time.map((t: string, i: number) => {
    const code = d.weather_code[i];
    return {
      date: new Date(t + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      high: Math.round(d.temperature_2m_max[i]),
      low: Math.round(d.temperature_2m_min[i]),
      precipChance: d.precipitation_probability_max[i] ?? 0,
      condition: wmoCondition(code),
      weatherCode: code,
    };
  });
}
