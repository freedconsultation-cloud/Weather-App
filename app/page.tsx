"use client";

import { useState, useEffect, FormEvent } from "react";

interface HourlyForecast {
  time: string;
  tempF: number;
  precipChance: number;
  condition: string;
  isDaylight: boolean;
  weatherCode: number;
}

interface DailyForecast {
  date: string;
  high: number;
  low: number;
  precipChance: number;
  condition: string;
  weatherCode: number;
}

interface CurrentConditions {
  tempF: number;
  feelsLikeF: number;
  humidity: number;
  windMph: number;
  condition: string;
  isDaylight: boolean;
  weatherCode: number;
}

interface WeatherResult {
  summary: string;
  view: "current" | "hourly" | "daily";
  data: any;
  location: { name: string; adminArea: string; country: string };
}

interface DetectedCoords {
  lat: number;
  lon: number;
}

const SUGGESTIONS = [
  "What's the weather like this week?",
  "What are the chances it will rain today?",
  "What's it like outside right now?",
  "Should I bring an umbrella this afternoon?",
];

function weatherIcon(isDaylight: boolean, condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "⛈️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return "🌧️";
  if (c.includes("fog") || c.includes("haze") || c.includes("mist")) return "🌫️";
  if (c.includes("overcast")) return "☁️";
  if (c.includes("cloud") || c.includes("partly")) return isDaylight ? "⛅" : "☁️";
  if (c.includes("wind")) return "💨";
  return isDaylight ? "☀️" : "🌙";
}

function PrecipBar({ chance }: { chance: number }) {
  const color = chance >= 70 ? "#3b82f6" : chance >= 40 ? "#60a5fa" : "#93c5fd";
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${chance}%`, background: color }} />
      </div>
      <span className="text-[11px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{chance}%</span>
    </div>
  );
}

function CurrentView({ data }: { data: CurrentConditions }) {
  return (
    <div className="rounded-xl p-6 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-4">
        <span className="text-6xl">{weatherIcon(data.isDaylight, data.condition)}</span>
        <div>
          <p className="text-5xl font-bold" style={{ color: "var(--foreground)" }}>{data.tempF}°F</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{data.condition}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Feels like", value: `${data.feelsLikeF}°F` },
          { label: "Humidity", value: `${data.humidity}%` },
          { label: "Wind", value: `${data.windMph} mph` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg px-3 py-2 text-center" style={{ background: "var(--surface-2)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function rainSummary(data: HourlyForecast[]): string {
  const rainy = data.filter((h) => h.precipChance >= 30);
  if (rainy.length === 0) return "No significant rain expected";
  if (rainy.length === data.length) return "Rain likely all day";
  return `Rain possible ${rainy[0].time}–${rainy[rainy.length - 1].time}`;
}

function HourlyView({ data }: { data: HourlyForecast[] }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Next 12 Hours</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rainSummary(data)}</p>
      </div>

      {/* Horizontal scrollable card strip */}
      <div className="overflow-x-auto -mx-1 pb-1">
        <div className="flex gap-2 px-1" style={{ minWidth: "max-content" }}>
          {data.map((h, i) => {
            const isRainy = h.precipChance >= 30;
            const barColor = h.precipChance >= 70 ? "#3b82f6" : h.precipChance >= 40 ? "#60a5fa" : "#93c5fd";
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 w-[3.5rem]"
                style={{
                  background: isRainy ? "rgba(96,165,250,0.08)" : "var(--surface-2)",
                  border: `1px solid ${isRainy ? "rgba(96,165,250,0.25)" : "transparent"}`,
                }}
              >
                <span className="text-[11px] font-medium leading-none" style={{ color: "var(--text-muted)" }}>
                  {h.time}
                </span>
                <span className="text-xl leading-none">{weatherIcon(h.isDaylight, h.condition)}</span>
                <span className="text-xs font-semibold leading-none" style={{ color: "var(--foreground)" }}>
                  {h.tempF}°
                </span>

                {/* Vertical rain bar */}
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className="w-5 rounded-full overflow-hidden flex flex-col-reverse"
                    style={{ height: "3rem", background: "var(--border)" }}
                  >
                    <div
                      className="w-full rounded-full transition-all"
                      style={{
                        height: `${h.precipChance}%`,
                        background: barColor,
                        opacity: h.precipChance < 5 ? 0.2 : 1,
                      }}
                    />
                  </div>
                  <span className="text-[10px] leading-none" style={{ color: isRainy ? "#60a5fa" : "var(--text-muted)" }}>
                    {h.precipChance}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DailyView({ data }: { data: DailyForecast[] }) {
  const maxHigh = Math.max(...data.map((d) => d.high));
  const minLow = Math.min(...data.map((d) => d.low));
  const range = maxHigh - minLow || 1;

  return (
    <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>5-Day Forecast</p>
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: "7rem 2rem 3rem 1fr 3rem" }}>
            <span className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{d.date}</span>
            <span className="text-lg">{weatherIcon(true, d.condition)}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{d.low}°</span>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  marginLeft: `${((d.low - minLow) / range) * 100}%`,
                  width: `${((d.high - d.low) / range) * 100}%`,
                  background: "linear-gradient(to right, #60a5fa, #f97316)",
                }}
              />
            </div>
            <span className="text-xs font-semibold text-right" style={{ color: "var(--foreground)" }}>{d.high}°</span>
          </div>
        ))}
      </div>
      <div className="pt-2 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Rain chance by day</p>
        {data.map((d, i) => (
          <div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: "7rem 1fr" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{d.date.split(",")[0]}</span>
            <PrecipBar chance={d.precipChance} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const [prompt, setPrompt] = useState("");
  const [location, setLocation] = useState("");
  const [detectedCoords, setDetectedCoords] = useState<DetectedCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "";
          if (city) setLocation(city);
          setDetectedCoords({ lat: latitude, lon: longitude });
        } catch {
          // silent fail — user can type manually
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  useEffect(() => {
    detectLocation();
  }, []);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || !location.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: any = { prompt, location };
      if (detectedCoords) {
        body.lat = detectedCoords.lat;
        body.lon = detectedCoords.lon;
      }
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <nav
        className="flex items-center justify-between px-4 sm:px-8 py-4 sticky top-0 z-10"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-bold font-mono text-sm" style={{ color: "var(--accent)" }}>{"</>"}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:inline" style={{ color: "var(--border)" }}>weather-freed.vercel.app</span>
          <a href="https://freedprojects.vercel.app" className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            ← Portfolio
          </a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Weather</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ask anything about the forecast.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Location row with detect button */}
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setDetectedCoords(null); }}
              placeholder={locating ? "Detecting location…" : "City, e.g. New York"}
              disabled={locating}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", opacity: locating ? 0.6 : 1 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              title="Detect my location"
              className="px-3 py-2.5 rounded-lg text-sm transition-opacity disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: detectedCoords ? "var(--accent)" : "var(--text-muted)" }}
            >
              {locating ? (
                <span className="block w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              ) : "📍"}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about the weather…"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || !location.trim() || loading}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {loading ? "…" : "Ask"}
            </button>
          </div>
        </form>

        {!result && !loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(248,81,73,0.1)", color: "#f85149" }}>
            {error}
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Checking the forecast…</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">📍</span>
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {result.location.name}{result.location.adminArea ? `, ${result.location.adminArea}` : ""}
              </span>
            </div>

            <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "var(--accent-bg)", color: "var(--foreground)", border: "1px solid var(--accent)" }}>
              {result.summary}
            </div>

            {result.view === "current" && result.data && <CurrentView data={result.data} />}
            {result.view === "hourly" && result.data && <HourlyView data={result.data} />}
            {result.view === "daily" && result.data && <DailyView data={result.data} />}

            <button
              onClick={() => { setResult(null); setPrompt(""); }}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              ← Ask something else
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
