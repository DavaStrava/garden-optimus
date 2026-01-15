"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationPromptProps {
  onLocationSet?: () => void;
}

type PromptState = "idle" | "requesting" | "saving" | "success" | "error";

interface GeocodingResult {
  city?: string;
  country?: string;
  timezone?: string;
}

async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  // Use Open-Meteo's geocoding API for reverse lookup
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto`
  );

  if (!response.ok) {
    return {};
  }

  const data = await response.json();
  return {
    timezone: data.timezone,
  };
}

async function getCityFromCoords(
  latitude: number,
  longitude: number
): Promise<{ city?: string; country?: string }> {
  // Use Nominatim (OpenStreetMap) for city name - free and no API key needed
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          "User-Agent": "GardenOptimus/1.0",
        },
      }
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return {
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality,
      country: data.address?.country,
    };
  } catch {
    return {};
  }
}

export function LocationPrompt({ onLocationSet }: LocationPromptProps) {
  const [state, setState] = useState<PromptState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser");
      setState("error");
      return;
    }

    setState("requesting");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setState("saving");
        const { latitude, longitude } = position.coords;

        try {
          // Get timezone and city info in parallel
          const [geocodeResult, cityResult] = await Promise.all([
            reverseGeocode(latitude, longitude),
            getCityFromCoords(latitude, longitude),
          ]);

          // Save to backend
          const response = await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              city: cityResult.city,
              country: cityResult.country,
              timezone: geocodeResult.timezone,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to save location");
          }

          setState("success");
          onLocationSet?.();
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to save location"
          );
          setState("error");
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage(
              "Location permission denied. You can enable it in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setErrorMessage("Location request timed out.");
            break;
          default:
            setErrorMessage("An unknown error occurred.");
        }
        setState("error");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  if (state === "success") {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <AlertDescription className="text-green-800 dark:text-green-200">
          Location saved! Weather-based recommendations are now enabled.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Enable Weather Features</span>
        </CardTitle>
        <CardDescription>
          Allow location access to get personalized weather alerts and
          season-adjusted care reminders for your plants.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={requestLocation}
            disabled={state === "requesting" || state === "saving"}
          >
            {state === "requesting" && "Requesting..."}
            {state === "saving" && "Saving..."}
            {(state === "idle" || state === "error") && "Enable Location"}
          </Button>
          {state === "error" && (
            <Button variant="ghost" onClick={() => setState("idle")}>
              Dismiss
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Your location is used only for weather data and is never shared.
        </p>
      </CardContent>
    </Card>
  );
}
