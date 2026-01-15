"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWeatherAlerts } from "@/hooks/use-weather-alerts";

export function WeatherAlerts() {
  const { data, isLoading } = useWeatherAlerts();

  if (isLoading || !data || data.alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {data.alerts.map((alert, index) => (
        <Alert
          key={index}
          variant={alert.severity === "critical" ? "destructive" : "default"}
        >
          <span className="text-lg mr-2">{alert.icon}</span>
          <div>
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </div>
        </Alert>
      ))}
    </div>
  );
}
