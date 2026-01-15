import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentSeason,
  getSeasonalTips,
  getWeatherAlerts,
  adjustIntervalForWeather,
  isGoodDayForOutdoorCare,
  getWeatherDescription,
  getWeatherIcon,
  type WeatherData,
} from "./weather";

// Mock weather data
const createMockWeather = (overrides: Partial<WeatherData> = {}): WeatherData => ({
  current: {
    temperature: 20,
    humidity: 50,
    precipitation: 0,
    weatherCode: 0,
  },
  daily: [
    {
      date: "2024-01-15",
      temperatureMax: 22,
      temperatureMin: 12,
      precipitationSum: 0,
      weatherCode: 0,
    },
    {
      date: "2024-01-16",
      temperatureMax: 20,
      temperatureMin: 10,
      precipitationSum: 0,
      weatherCode: 0,
    },
  ],
  timezone: "America/Los_Angeles",
  ...overrides,
});

describe("weather", () => {
  describe("getCurrentSeason", () => {
    it("should return spring for March in northern hemisphere", () => {
      const date = new Date(2024, 2, 15); // March 15
      expect(getCurrentSeason(40, date)).toBe("spring");
    });

    it("should return autumn for March in southern hemisphere", () => {
      const date = new Date(2024, 2, 15); // March 15
      expect(getCurrentSeason(-33, date)).toBe("autumn");
    });

    it("should return summer for July in northern hemisphere", () => {
      const date = new Date(2024, 6, 15); // July 15
      expect(getCurrentSeason(40, date)).toBe("summer");
    });

    it("should return winter for July in southern hemisphere", () => {
      const date = new Date(2024, 6, 15); // July 15
      expect(getCurrentSeason(-33, date)).toBe("winter");
    });

    it("should return autumn for October in northern hemisphere", () => {
      const date = new Date(2024, 9, 15); // October 15
      expect(getCurrentSeason(40, date)).toBe("autumn");
    });

    it("should return winter for January in northern hemisphere", () => {
      const date = new Date(2024, 0, 15); // January 15
      expect(getCurrentSeason(40, date)).toBe("winter");
    });

    it("should return summer for January in southern hemisphere", () => {
      const date = new Date(2024, 0, 15); // January 15
      expect(getCurrentSeason(-33, date)).toBe("summer");
    });
  });

  describe("getSeasonalTips", () => {
    it("should return tips for spring", () => {
      const tips = getSeasonalTips("spring");
      expect(tips).toContain("Resume regular fertilizing schedule");
      expect(tips.length).toBeGreaterThan(0);
    });

    it("should return tips for summer", () => {
      const tips = getSeasonalTips("summer");
      expect(tips).toContain("Water more frequently in heat");
    });

    it("should return tips for autumn", () => {
      const tips = getSeasonalTips("autumn");
      expect(tips).toContain("Bring tropical plants inside before frost");
    });

    it("should return tips for winter", () => {
      const tips = getSeasonalTips("winter");
      expect(tips).toContain("Most plants need less water");
    });
  });

  describe("getWeatherAlerts", () => {
    it("should return frost warning for cold temperatures", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 5, temperatureMin: 2, precipitationSum: 0, weatherCode: 0 },
          { date: "2024-01-16", temperatureMax: 3, temperatureMin: -2, precipitationSum: 0, weatherCode: 0 },
        ],
      });
      const alerts = getWeatherAlerts(weather, true);
      expect(alerts.some((a) => a.type === "frost")).toBe(true);
    });

    it("should return heatwave alert for high temperatures", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 38, temperatureMin: 25, precipitationSum: 0, weatherCode: 0 },
          { date: "2024-01-16", temperatureMax: 40, temperatureMin: 28, precipitationSum: 0, weatherCode: 0 },
        ],
      });
      const alerts = getWeatherAlerts(weather, true);
      expect(alerts.some((a) => a.type === "heatwave")).toBe(true);
    });

    it("should return heavy rain alert for outdoor plants", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 20, temperatureMin: 10, precipitationSum: 5, weatherCode: 61 },
          { date: "2024-01-16", temperatureMax: 18, temperatureMin: 8, precipitationSum: 30, weatherCode: 63 },
        ],
      });
      const alerts = getWeatherAlerts(weather, true);
      expect(alerts.some((a) => a.type === "heavy-rain")).toBe(true);
    });

    it("should not return heavy rain alert for indoor-only plants", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 20, temperatureMin: 10, precipitationSum: 5, weatherCode: 61 },
          { date: "2024-01-16", temperatureMax: 18, temperatureMin: 8, precipitationSum: 30, weatherCode: 63 },
        ],
      });
      const alerts = getWeatherAlerts(weather, false);
      expect(alerts.some((a) => a.type === "heavy-rain")).toBe(false);
    });

    it("should return low humidity alert", () => {
      const weather = createMockWeather({
        current: { temperature: 20, humidity: 25, precipitation: 0, weatherCode: 0 },
      });
      const alerts = getWeatherAlerts(weather, true);
      expect(alerts.some((a) => a.type === "low-humidity")).toBe(true);
    });

    it("should return no alerts for normal conditions", () => {
      const weather = createMockWeather();
      const alerts = getWeatherAlerts(weather, true);
      expect(alerts.length).toBe(0);
    });
  });

  describe("adjustIntervalForWeather", () => {
    it("should not adjust indoor plants based on weather", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 20, temperatureMin: 10, precipitationSum: 20, weatherCode: 0 },
          { date: "2024-01-16", temperatureMax: 18, temperatureMin: 8, precipitationSum: 15, weatherCode: 0 },
        ],
      });
      const result = adjustIntervalForWeather(7, weather, true, "summer");
      expect(result.adjustedInterval).toBe(7);
      expect(result.reason).toBeNull();
    });

    it("should extend interval for indoor plants in winter", () => {
      const weather = createMockWeather();
      const result = adjustIntervalForWeather(7, weather, true, "winter");
      expect(result.adjustedInterval).toBeGreaterThan(7);
      expect(result.reason).toContain("winter");
    });

    it("should extend interval for outdoor plants when rain is forecast", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 20, temperatureMin: 10, precipitationSum: 8, weatherCode: 61 },
          { date: "2024-01-16", temperatureMax: 18, temperatureMin: 8, precipitationSum: 10, weatherCode: 63 },
        ],
      });
      const result = adjustIntervalForWeather(7, weather, false, "summer");
      expect(result.adjustedInterval).toBeGreaterThan(7);
      expect(result.reason).toContain("rain");
    });

    it("should extend interval for high humidity", () => {
      const weather = createMockWeather({
        current: { temperature: 20, humidity: 80, precipitation: 0, weatherCode: 0 },
      });
      const result = adjustIntervalForWeather(7, weather, false, "summer");
      expect(result.adjustedInterval).toBeGreaterThan(7);
      expect(result.reason).toContain("humidity");
    });

    it("should shorten interval for heatwave", () => {
      const weather = createMockWeather({
        current: { temperature: 38, humidity: 30, precipitation: 0, weatherCode: 0 },
      });
      const result = adjustIntervalForWeather(7, weather, false, "summer");
      expect(result.adjustedInterval).toBeLessThan(7);
    });

    it("should never go below 1 day", () => {
      const weather = createMockWeather({
        current: { temperature: 42, humidity: 20, precipitation: 0, weatherCode: 0 },
      });
      const result = adjustIntervalForWeather(1, weather, false, "summer");
      expect(result.adjustedInterval).toBeGreaterThanOrEqual(1);
    });
  });

  describe("isGoodDayForOutdoorCare", () => {
    it("should return good for normal conditions", () => {
      const weather = createMockWeather();
      const result = isGoodDayForOutdoorCare(weather);
      expect(result.isGood).toBe(true);
    });

    it("should return bad for rainy day", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 20, temperatureMin: 10, precipitationSum: 15, weatherCode: 63 },
        ],
      });
      const result = isGoodDayForOutdoorCare(weather);
      expect(result.isGood).toBe(false);
      expect(result.reason).toContain("Rain");
    });

    it("should return bad for cold day", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 8, temperatureMin: 2, precipitationSum: 0, weatherCode: 0 },
        ],
      });
      const result = isGoodDayForOutdoorCare(weather);
      expect(result.isGood).toBe(false);
      expect(result.reason).toContain("cold");
    });

    it("should return bad for extremely hot day", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 42, temperatureMin: 30, precipitationSum: 0, weatherCode: 0 },
        ],
      });
      const result = isGoodDayForOutdoorCare(weather);
      expect(result.isGood).toBe(false);
      expect(result.reason).toContain("hot");
    });

    it("should return bad for stormy day", () => {
      const weather = createMockWeather({
        daily: [
          { date: "2024-01-15", temperatureMax: 25, temperatureMin: 15, precipitationSum: 0, weatherCode: 95 },
        ],
      });
      const result = isGoodDayForOutdoorCare(weather);
      expect(result.isGood).toBe(false);
      expect(result.reason).toContain("Storms");
    });
  });

  describe("getWeatherDescription", () => {
    it("should return correct description for clear sky", () => {
      expect(getWeatherDescription(0)).toBe("Clear sky");
    });

    it("should return correct description for rain", () => {
      expect(getWeatherDescription(63)).toBe("Moderate rain");
    });

    it("should return Unknown for invalid code", () => {
      expect(getWeatherDescription(999)).toBe("Unknown");
    });
  });

  describe("getWeatherIcon", () => {
    it("should return sun for clear sky", () => {
      expect(getWeatherIcon(0)).toBe("☀️");
    });

    it("should return rain for rain codes", () => {
      expect(getWeatherIcon(63)).toBe("🌧️");
    });

    it("should return snow for snow codes", () => {
      expect(getWeatherIcon(73)).toBe("❄️");
    });

    it("should return storm for thunderstorm", () => {
      expect(getWeatherIcon(95)).toBe("⛈️");
    });
  });
});
