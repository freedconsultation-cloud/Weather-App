import { NextRequest } from "next/server";
import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  searchLocation,
  getCurrentConditions,
  getHourlyForecast,
  getDailyForecast,
} from "@/lib/openmeteo";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { prompt, location, lat, lon } = await req.json();

  if (!prompt || (!location && lat == null)) {
    return Response.json({ error: "prompt and location are required" }, { status: 400 });
  }

  let loc;
  if (typeof lat === "number" && typeof lon === "number") {
    loc = { name: location || "Your location", adminArea: "", country: "", latitude: lat, longitude: lon };
  } else {
    loc = await searchLocation(location);
    if (!loc) {
      return Response.json({ error: `Could not find location: ${location}` }, { status: 404 });
    }
  }

  let fetchedData: any = null;
  let view: "current" | "hourly" | "daily" = "current";

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: `You are a weather assistant. The user's location is ${loc.name}, ${loc.adminArea}, ${loc.country}.
Decide which weather tool best answers their question, call it, then write a friendly 1-2 sentence summary of the result.
Always call exactly one tool.`,
    prompt,
    tools: {
      get_current_conditions: tool({
        description: "Get current weather conditions right now",
        parameters: z.object({ _: z.string().optional() }),
        execute: async () => {
          view = "current";
          fetchedData = await getCurrentConditions(loc);
          return fetchedData;
        },
      }),
      get_hourly_forecast: tool({
        description: "Get the next 12-hour forecast — best for questions about today, rain chances, or specific times",
        parameters: z.object({ _: z.string().optional() }),
        execute: async () => {
          view = "hourly";
          fetchedData = await getHourlyForecast(loc);
          return fetchedData;
        },
      }),
      get_daily_forecast: tool({
        description: "Get the 5-day forecast — best for weekly outlooks or planning ahead",
        parameters: z.object({ _: z.string().optional() }),
        execute: async () => {
          view = "daily";
          fetchedData = await getDailyForecast(loc);
          return fetchedData;
        },
      }),
    },
    maxSteps: 2,
  });

  return Response.json({ summary: text, view, data: fetchedData, location: loc });
}
