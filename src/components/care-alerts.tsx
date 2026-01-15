"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReminderStatusBadge } from "@/components/reminder-status-badge";
import { QuickCareButton } from "@/components/quick-care-button";
import { careTypeInfo, type ReminderStatus } from "@/lib/care-reminders";

interface ScheduleWithStatus {
  id: string;
  careType: string;
  nextDueDate: string;
  plant: {
    id: string;
    name: string;
    nickname: string | null;
  };
  statusInfo: {
    status: ReminderStatus;
    daysUntilDue: number;
    label: string;
  };
}

export function CareAlerts() {
  const [schedules, setSchedules] = useState<ScheduleWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/care-schedules?dueWithin=3");
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Care Due Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (schedules.length === 0) {
    return null;
  }

  const overdueCount = schedules.filter(
    (s) => s.statusInfo.status === "overdue"
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Care Due Soon</CardTitle>
            <CardDescription>Plants that need your attention</CardDescription>
          </div>
          {overdueCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
              {overdueCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {schedules.map((schedule) => {
            const careInfo = careTypeInfo[schedule.careType] || {
              emoji: "📝",
              label: schedule.careType,
            };
            const plantName =
              schedule.plant.nickname || schedule.plant.name;

            return (
              <li
                key={schedule.id}
                className="flex items-center justify-between gap-2 py-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">
                    {careInfo.emoji}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/plants/${schedule.plant.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {plantName}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {careInfo.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ReminderStatusBadge
                    status={schedule.statusInfo.status}
                    label={schedule.statusInfo.label}
                  />
                  <QuickCareButton
                    plantId={schedule.plant.id}
                    careType={schedule.careType}
                    onComplete={fetchSchedules}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
