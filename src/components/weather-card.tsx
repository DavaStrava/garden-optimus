"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getWeatherIcon,
  getWeatherDescription,
  type WeatherData,
} from "@/lib/weather";

interface WeatherResponse {
  weather: WeatherData;
  location: {
    city: string | null;
    country: string | null;
    timezone: string | null;
  };
}

export function WeatherCard() {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch("/api/weather");
        if (response.status === 404) {
          // Location not set
          setError("location-not-set");
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeather();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error === "location-not-set" || !data) {
    return null; // Don't show card if location not set
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load weather data
          </p>
        </CardContent>
      </Card>
    );
  }

  const { weather, location } = data;
  const today = weather.daily[0];
  const locationText = location.city
    ? `${location.city}${location.country ? `, ${location.country}` : ""}`
    : "Your Location";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{locationText}</span>
          <span className="text-2xl">
            {getWeatherIcon(weather.current.weatherCode)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">
            {Math.round(weather.current.temperature)}°C
          </span>
          <span className="text-sm text-muted-foreground">
            {getWeatherDescription(weather.current.weatherCode)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Humidity: </span>
            <span>{weather.current.humidity}%</span>
          </div>
          {today && (
            <div>
              <span className="text-muted-foreground">High/Low: </span>
              <span>
                {Math.round(today.temperatureMax)}°/
                {Math.round(today.temperatureMin)}°
              </span>
            </div>
          )}
        </div>

        {today && today.precipitationSum > 0 && (
          <p className="text-sm text-blue-600">
            Rain today: {today.precipitationSum}mm
          </p>
        )}
      </CardContent>
    </Card>
  );
}
