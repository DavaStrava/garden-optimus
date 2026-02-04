"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  careTypeInfo,
  formatInterval,
  getSuggestedIntervals,
} from "@/lib/care-reminders";

interface CareScheduleFormProps {
  plantId: string;
  existingSchedules?: {
    id: string;
    careType: string;
    intervalDays: number;
    enabled: boolean;
  }[];
}

const careTypes = [
  "WATERING",
  "FERTILIZING",
  "PRUNING",
  "REPOTTING",
  "PEST_TREATMENT",
] as const;

export function CareScheduleForm({
  plantId,
  existingSchedules = [],
}: CareScheduleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildConfig = () => {
    const config: Record<string, { enabled: boolean; intervalDays: number }> =
      {};
    careTypes.forEach((type) => {
      const existing = existingSchedules.find((s) => s.careType === type);
      const suggestedIntervals = getSuggestedIntervals(type);
      config[type] = {
        enabled: existing?.enabled ?? false,
        intervalDays: existing?.intervalDays ?? suggestedIntervals[0],
      };
    });
    return config;
  };

  const [scheduleConfig, setScheduleConfig] = useState(buildConfig);
  // Track the last-saved state to avoid stale prop references on rapid saves
  const [savedConfig, setSavedConfig] = useState(buildConfig);

  const handleToggle = (careType: string, enabled: boolean) => {
    setScheduleConfig((prev) => ({
      ...prev,
      [careType]: { ...prev[careType], enabled },
    }));
  };

  const handleIntervalChange = (careType: string, value: string) => {
    const days = parseInt(value, 10);
    if (!isNaN(days) && days > 0) {
      setScheduleConfig((prev) => ({
        ...prev,
        [careType]: { ...prev[careType], intervalDays: days },
      }));
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const promises: Promise<Response>[] = [];

      Object.entries(scheduleConfig).forEach(([careType, config]) => {
        if (config.enabled) {
          // Save enabled schedules (upsert via POST)
          promises.push(
            fetch(`/api/plants/${plantId}/care-schedules`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                careType,
                intervalDays: config.intervalDays,
              }),
            })
          );
        } else {
          // Disable schedules that were toggled off (use savedConfig to
          // avoid stale prop references on rapid successive saves)
          const wasPreviouslyEnabled = savedConfig[careType]?.enabled;
          const existing = existingSchedules.find(
            (s) => s.careType === careType
          );
          if (existing && wasPreviouslyEnabled) {
            promises.push(
              fetch(`/api/care-schedules/${existing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: false }),
              })
            );
          }
        }
      });

      await Promise.all(promises);
      // Snapshot the current config as the new baseline for change detection
      setSavedConfig({ ...scheduleConfig });
      router.refresh();
    } catch (error) {
      console.error("Failed to save schedules:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledCount = Object.values(scheduleConfig).filter(
    (c) => c.enabled
  ).length;

  const hasChanges = useMemo(
    () =>
      Object.entries(scheduleConfig).some(([careType, config]) => {
        const saved = savedConfig[careType];
        if (!saved) return config.enabled;
        return config.enabled !== saved.enabled || config.intervalDays !== saved.intervalDays;
      }),
    [scheduleConfig, savedConfig]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Care Reminders</CardTitle>
        <CardDescription>
          Set up recurring reminders for plant care tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {careTypes.map((careType) => {
          const info = careTypeInfo[careType];
          const config = scheduleConfig[careType];
          const suggestedIntervals = getSuggestedIntervals(careType);

          return (
            <div
              key={careType}
              className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <Switch
                  id={`switch-${careType}`}
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleToggle(careType, checked)}
                />
                <Label
                  htmlFor={`switch-${careType}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </Label>
              </div>

              {config.enabled && (
                <div className="flex items-center gap-2">
                  <Label htmlFor={`interval-${careType}`} className="sr-only">
                    Interval
                  </Label>
                  <select
                    id={`interval-${careType}`}
                    value={config.intervalDays}
                    onChange={(e) =>
                      handleIntervalChange(careType, e.target.value)
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {suggestedIntervals.map((days) => (
                      <option key={days} value={days}>
                        {formatInterval(days)}
                      </option>
                    ))}
                    {!suggestedIntervals.includes(config.intervalDays) && (
                      <option value={config.intervalDays}>
                        {formatInterval(config.intervalDays)}
                      </option>
                    )}
                  </select>
                  <span className="text-muted-foreground text-sm">or</span>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={config.intervalDays}
                    onChange={(e) =>
                      handleIntervalChange(careType, e.target.value)
                    }
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
            </div>
          );
        })}

        <Button
          onClick={handleSave}
          disabled={isSubmitting || !hasChanges}
          className="w-full"
        >
          {isSubmitting ? "Saving..." : `Save ${enabledCount} Reminder${enabledCount !== 1 ? "s" : ""}`}
        </Button>
      </CardContent>
    </Card>
  );
}
