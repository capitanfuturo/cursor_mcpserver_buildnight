import { requireApiKey } from "../config";
import type { CurrentWeather } from "../types";

type WeatherstackResponse = {
  success?: boolean;
  error?: {
    code?: number;
    type?: string;
    info?: string;
  };
  request?: {
    type?: string;
    query?: string;
    language?: string;
    unit?: string;
  };
  location?: {
    name?: string;
    country?: string;
    region?: string;
    lat?: string;
    lon?: string;
    timezone_id?: string;
    localtime?: string;
  };
  current?: {
    observation_time?: string;
    temperature?: number;
    weather_code?: number;
    weather_descriptions?: string[];
    wind_speed?: number;
    wind_degree?: number;
    wind_dir?: string;
    pressure?: number;
    precip?: number;
    humidity?: number;
    cloudcover?: number;
    feelslike?: number;
    uv_index?: number;
    visibility?: number;
    is_day?: string;
  };
};

export async function getCurrentWeather(input: {
  city: string;
  units?: "metric" | "fahrenheit";
}): Promise<CurrentWeather> {
  const accessKey = requireApiKey("Weatherstack");
  const units = input.units === "fahrenheit" ? "f" : "m";
  const params = new URLSearchParams({
    access_key: accessKey,
    query: input.city.trim(),
    units,
  });

  const response = await fetch(
    `https://api.weatherstack.com/current?${params.toString()}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Weatherstack request failed (${response.status}): ${await response.text()}`
    );
  }

  const payload = (await response.json()) as WeatherstackResponse;

  if (payload.success === false || payload.error) {
    throw new Error(
      payload.error?.info ||
        "Weatherstack returned an error for the requested city."
    );
  }

  const location = payload.location;
  const current = payload.current;

  if (!location?.name || !current) {
    throw new Error("Weatherstack returned an incomplete weather response.");
  }

  return {
    city: location.name,
    country: location.country || "Unknown",
    region: location.region,
    localtime: location.localtime,
    timezoneId: location.timezone_id,
    query: payload.request?.query || input.city,
    units: units === "f" ? "fahrenheit" : "metric",
    temperature: current.temperature ?? 0,
    feelsLike: current.feelslike ?? current.temperature ?? 0,
    humidity: current.humidity ?? 0,
    windSpeed: current.wind_speed ?? 0,
    windDirection: current.wind_dir,
    pressure: current.pressure,
    precipitation: current.precip,
    cloudCover: current.cloudcover,
    visibility: current.visibility,
    uvIndex: current.uv_index,
    isDay: current.is_day === "yes",
    weatherCode: current.weather_code,
    description:
      current.weather_descriptions?.[0] || "Current conditions unavailable",
    observationTime: current.observation_time,
  };
}
