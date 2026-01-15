/**
 * Weather Utilities
 * Functions for fetching weather data and adjusting care schedules
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
  };
  daily: {
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationSum: number;
    weatherCode: number;
  }[];
  timezone: string;
}

export interface WeatherAlert {
  type: "frost" | "heatwave" | "heavy-rain" | "low-humidity";
  severity: "warning" | "critical";
  title: string;
  message: string;
  icon: string;
}

// Weather code descriptions from Open-Meteo
const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

/**
 * Get weather description from code
 */
export function getWeatherDescription(code: number): string {
  return weatherCodeDescriptions[code] || "Unknown";
}

/**
 * Get weather icon based on code
 */
export function getWeatherIcon(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌧️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

/**
 * Fetch weather data from Open-Meteo API
 */
export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    timezone: "auto",
    forecast_days: "7",
  });

  let response: Response;
  try {
    response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch weather data: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Failed to parse weather API response");
  }

  // Validate response structure
  if (
    !data ||
    typeof data !== "object" ||
    !("current" in data) ||
    !("daily" in data) ||
    !("timezone" in data)
  ) {
    throw new Error("Invalid weather data structure from API");
  }

  const weatherData = data as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      precipitation: number;
      weather_code: number;
    };
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      weather_code: number[];
    };
    timezone: string;
  };

  return {
    current: {
      temperature: weatherData.current.temperature_2m,
      humidity: weatherData.current.relative_humidity_2m,
      precipitation: weatherData.current.precipitation,
      weatherCode: weatherData.current.weather_code,
    },
    daily: weatherData.daily.time.map((date: string, i: number) => ({
      date,
      temperatureMax: weatherData.daily.temperature_2m_max[i],
      temperatureMin: weatherData.daily.temperature_2m_min[i],
      precipitationSum: weatherData.daily.precipitation_sum[i],
      weatherCode: weatherData.daily.weather_code[i],
    })),
    timezone: weatherData.timezone,
  };
}

/**
 * Determine current season based on latitude and date
 */
export function getCurrentSeason(latitude: number, date: Date = new Date()): Season {
  const month = date.getMonth();
  const isNorthernHemisphere = latitude >= 0;

  // Meteorological seasons
  if (month >= 2 && month <= 4) {
    // March, April, May
    return isNorthernHemisphere ? "spring" : "autumn";
  }
  if (month >= 5 && month <= 7) {
    // June, July, August
    return isNorthernHemisphere ? "summer" : "winter";
  }
  if (month >= 8 && month <= 10) {
    // September, October, November
    return isNorthernHemisphere ? "autumn" : "spring";
  }
  // December, January, February
  return isNorthernHemisphere ? "winter" : "summer";
}

/**
 * Get seasonal care tips
 */
export function getSeasonalTips(season: Season): string[] {
  switch (season) {
    case "spring":
      return [
        "Resume regular fertilizing schedule",
        "Good time to repot root-bound plants",
        "Increase watering as plants grow",
        "Watch for new pest activity",
      ];
    case "summer":
      return [
        "Water more frequently in heat",
        "Provide shade for sensitive plants",
        "Check soil moisture daily",
        "Best time for outdoor plants",
      ];
    case "autumn":
      return [
        "Reduce watering frequency",
        "Bring tropical plants inside before frost",
        "Last chance to fertilize before winter",
        "Clean up fallen leaves",
      ];
    case "winter":
      return [
        "Most plants need less water",
        "Keep plants away from cold drafts",
        "Pause fertilizing for most plants",
        "Increase humidity for indoor plants",
      ];
  }
}

/**
 * Generate weather alerts based on conditions
 */
export function getWeatherAlerts(
  weather: WeatherData,
  hasOutdoorPlants: boolean
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const tomorrow = weather.daily[1];

  // Check tomorrow's forecast if available
  if (tomorrow) {
    const { temperatureMin, temperatureMax, precipitationSum } = tomorrow;

    // Frost warning (min temp below 5°C)
    if (temperatureMin < 5) {
      const isFreezing = temperatureMin < 0;
      alerts.push({
        type: "frost",
        severity: isFreezing ? "critical" : "warning",
        title: "Frost Warning",
        message: isFreezing
          ? `Freezing temperatures expected (${temperatureMin}°C). Move outdoor plants inside immediately.`
          : `Cold temperatures expected (${temperatureMin}°C). Consider protecting sensitive plants.`,
        icon: "❄️",
      });
    }

    // Heatwave (max temp above 35°C)
    if (temperatureMax > 35) {
      alerts.push({
        type: "heatwave",
        severity: temperatureMax > 40 ? "critical" : "warning",
        title: "Heatwave Alert",
        message: `High temperatures expected (${temperatureMax}°C). Increase watering and provide shade for plants.`,
        icon: "🔥",
      });
    }

    // Heavy rain (more than 20mm) - only relevant for outdoor plants
    if (hasOutdoorPlants && precipitationSum > 20) {
      alerts.push({
        type: "heavy-rain",
        severity: precipitationSum > 50 ? "critical" : "warning",
        title: "Heavy Rain Expected",
        message: `${precipitationSum}mm of rain expected. Skip watering outdoor plants.`,
        icon: "🌧️",
      });
    }
  }

  // Low humidity warning (below 30%) - always check current conditions
  if (weather.current.humidity < 30) {
    alerts.push({
      type: "low-humidity",
      severity: "warning",
      title: "Low Humidity",
      message: `Current humidity is ${weather.current.humidity}%. Consider misting tropical plants.`,
      icon: "💨",
    });
  }

  return alerts;
}

/**
 * Adjust care interval based on weather conditions
 */
export function adjustIntervalForWeather(
  baseInterval: number,
  weather: WeatherData,
  isIndoor: boolean,
  season: Season
): { adjustedInterval: number; reason: string | null } {
  // Indoor plants are not affected by weather
  if (isIndoor) {
    // Only seasonal adjustment for indoor plants in winter
    if (season === "winter") {
      return {
        adjustedInterval: Math.round(baseInterval * 1.3),
        reason: "Extended for winter dormancy",
      };
    }
    return { adjustedInterval: baseInterval, reason: null };
  }

  let adjustment = 0;
  let reasons: string[] = [];

  // Check for rain in next 2 days
  const rainNext2Days = weather.daily
    .slice(0, 2)
    .reduce((sum, day) => sum + day.precipitationSum, 0);

  if (rainNext2Days > 10) {
    adjustment += 2;
    reasons.push("rain forecast");
  }

  // High humidity extends interval
  if (weather.current.humidity > 70) {
    adjustment += 1;
    reasons.push("high humidity");
  }

  // Heatwave shortens interval
  if (weather.current.temperature > 35) {
    adjustment -= 1;
    reasons.push("high temperature");
  }

  // Seasonal adjustments
  if (season === "winter") {
    adjustment += 3;
    reasons.push("winter season");
  } else if (season === "summer" && weather.current.temperature > 30) {
    adjustment -= 1;
    reasons.push("summer heat");
  }

  const adjustedInterval = Math.max(1, baseInterval + adjustment);

  if (adjustment === 0) {
    return { adjustedInterval: baseInterval, reason: null };
  }

  const direction = adjustment > 0 ? "Extended" : "Shortened";
  return {
    adjustedInterval,
    reason: `${direction} due to ${reasons.join(", ")}`,
  };
}

/**
 * Check if it's a good day for outdoor care activities
 */
export function isGoodDayForOutdoorCare(weather: WeatherData): {
  isGood: boolean;
  reason: string;
} {
  const today = weather.daily[0];

  // Check for rain
  if (today.precipitationSum > 5) {
    return { isGood: false, reason: "Rain expected today" };
  }

  // Check for extreme cold
  if (today.temperatureMin < 5) {
    return { isGood: false, reason: "Too cold for outdoor work" };
  }

  // Check for extreme heat
  if (today.temperatureMax > 38) {
    return { isGood: false, reason: "Too hot for outdoor work" };
  }

  // Check weather code for storms
  if (today.weatherCode >= 95) {
    return { isGood: false, reason: "Storms expected" };
  }

  return { isGood: true, reason: "Good conditions for outdoor care" };
}
