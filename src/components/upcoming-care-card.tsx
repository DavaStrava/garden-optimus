"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReminderStatusBadge } from "@/components/reminder-status-badge";
import { QuickCareButton } from "@/components/quick-care-button";
import { ScheduleEditPopover } from "@/components/schedule-edit-popover";
import { DeleteScheduleButton } from "@/components/delete-schedule-button";
import { careTypeInfo } from "@/lib/care-reminders";
import type { ReminderStatus } from "@/lib/care-reminders";

interface ScheduleWithStatus {
  id: string;
  careType: string;
  intervalDays: number;
  nextDueDate: string;
  enabled: boolean;
  statusInfo: {
    status: ReminderStatus;
    label: string;
  };
}

interface UpcomingCareCardProps {
  plantId: string;
  plantName: string;
  schedules: ScheduleWithStatus[];
}

export function UpcomingCareCard({
  plantId,
  plantName,
  schedules,
}: UpcomingCareCardProps) {
  const enabledSchedules = schedules.filter((s) => s.enabled);

  if (enabledSchedules.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Upcoming Care</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {enabledSchedules.map((schedule) => {
          const info = careTypeInfo[schedule.careType];
          const label = info?.label ?? schedule.careType;
          const emoji = info?.emoji ?? "📝";

          return (
            <div
              key={schedule.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-1 min-w-0">
                <span>{emoji}</span>
                <span className="truncate">{label}</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <ReminderStatusBadge
                  status={schedule.statusInfo.status}
                  label={schedule.statusInfo.label}
                />
                <QuickCareButton
                  plantId={plantId}
                  careType={schedule.careType}
                />
                <ScheduleEditPopover
                  scheduleId={schedule.id}
                  careType={schedule.careType}
                  currentInterval={schedule.intervalDays}
                  currentDueDate={schedule.nextDueDate}
                />
                <DeleteScheduleButton
                  scheduleId={schedule.id}
                  careTypeLabel={label}
                  plantName={plantName}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
