"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWeatherAlerts } from "@/hooks/use-weather-alerts";
import type { Season } from "@/lib/weather";

const seasonEmoji: Record<Season, string> = {
  spring: "🌱",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
};

const seasonName: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

export function SeasonalTips() {
  const { data, isLoading } = useWeatherAlerts();

  if (isLoading || !data || !data.season || data.seasonalTips.length === 0) {
    return null;
  }

  const { season, seasonalTips } = data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{seasonEmoji[season]}</span>
          <span>{seasonName[season]} Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {seasonalTips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
