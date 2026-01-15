"use client";

import { useEffect, useState } from "react";
import type { WeatherAlert, Season } from "@/lib/weather";

interface WeatherAlertsData {
  alerts: WeatherAlert[];
  season: Season | null;
  seasonalTips: string[];
  hasOutdoorPlants?: boolean;
}

interface UseWeatherAlertsResult {
  data: WeatherAlertsData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Simple client-side cache for weather alerts data.
 *
 * Note: These module-level variables are safe because this hook is marked
 * "use client" and only runs in the browser. The cache is shared across
 * all components using this hook within the same page session.
 *
 * For more advanced caching needs (persistence, revalidation, SSR support),
 * consider migrating to SWR or React Query.
 */
let cachedData: WeatherAlertsData | null = null;
let cacheTimestamp: number = 0;
let fetchPromise: Promise<WeatherAlertsData> | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWeatherAlerts(): Promise<WeatherAlertsData> {
  const response = await fetch("/api/weather/alerts");
  if (!response.ok) {
    throw new Error("Failed to fetch weather alerts");
  }
  return response.json();
}

export function useWeatherAlerts(): UseWeatherAlertsResult {
  const [data, setData] = useState<WeatherAlertsData | null>(cachedData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (fetchPromise) {
      fetchPromise
        .then((result) => {
          setData(result);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err);
          setIsLoading(false);
        });
      return;
    }

    // Start new fetch
    setIsLoading(true);
    fetchPromise = fetchWeatherAlerts();

    fetchPromise
      .then((result) => {
        cachedData = result;
        cacheTimestamp = Date.now();
        setData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      })
      .finally(() => {
        fetchPromise = null;
      });
  }, []);

  return { data, isLoading, error };
}
