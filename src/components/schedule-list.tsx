"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReminderStatusBadge } from "@/components/reminder-status-badge";
import { QuickCareButton } from "@/components/quick-care-button";
import { ScheduleEditPopover } from "@/components/schedule-edit-popover";
import { DeleteScheduleButton } from "@/components/delete-schedule-button";
import { careTypeInfo, formatInterval } from "@/lib/care-reminders";
import type { ReminderStatus } from "@/lib/care-reminders";

type FilterTab = "all" | "overdue" | "due-today" | "due-soon" | "upcoming";

interface ScheduleItem {
  id: string;
  careType: string;
  intervalDays: number;
  nextDueDate: string;
  plant: {
    id: string;
    name: string;
  };
  statusInfo: {
    status: ReminderStatus;
    label: string;
  };
}

interface ScheduleListProps {
  schedules: ScheduleItem[];
}

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due Today" },
  { value: "due-soon", label: "Due Soon" },
  { value: "upcoming", label: "Upcoming" },
];

function ScheduleActions({ schedule, label }: { schedule: ScheduleItem; label: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <QuickCareButton
        plantId={schedule.plant.id}
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
        plantName={schedule.plant.name}
      />
    </div>
  );
}

export function ScheduleList({ schedules }: ScheduleListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const counts = useMemo(() => {
    const result: Record<FilterTab, number> = {
      all: schedules.length,
      overdue: 0,
      "due-today": 0,
      "due-soon": 0,
      upcoming: 0,
    };
    for (const s of schedules) {
      const status = s.statusInfo.status as FilterTab;
      if (status in result) {
        result[status]++;
      }
    }
    return result;
  }, [schedules]);

  const filteredSchedules =
    activeFilter === "all"
      ? schedules
      : schedules.filter((s) => s.statusInfo.status === activeFilter);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(tab.value)}
          >
            {tab.label}
            {counts[tab.value] > 0 && (
              <Badge
                variant={activeFilter === tab.value ? "secondary" : "outline"}
                className="ml-1.5 px-1.5 py-0 text-xs"
              >
                {counts[tab.value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Schedule Items */}
      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No schedules match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSchedules.map((schedule) => {
            const info = careTypeInfo[schedule.careType];
            const label = info?.label ?? schedule.careType;
            const emoji = info?.emoji ?? "📝";

            return (
              <Card key={schedule.id}>
                <CardContent className="py-3">
                  {/* Desktop: single row */}
                  <div className="hidden sm:flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <span className="font-medium">{label}</span>
                        <span className="text-muted-foreground mx-2">·</span>
                        <Link
                          href={`/plants/${schedule.plant.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {schedule.plant.name}
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-muted-foreground">
                        {formatInterval(schedule.intervalDays)}
                      </span>
                      <ReminderStatusBadge
                        status={schedule.statusInfo.status}
                        label={schedule.statusInfo.label}
                      />
                      <ScheduleActions schedule={schedule} label={label} />
                    </div>
                  </div>

                  {/* Mobile: stacked layout */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="font-medium">{label}</span>
                      </div>
                      <ReminderStatusBadge
                        status={schedule.statusInfo.status}
                        label={schedule.statusInfo.label}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <Link
                          href={`/plants/${schedule.plant.id}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {schedule.plant.name}
                        </Link>
                        <span className="mx-1.5">·</span>
                        <span>{formatInterval(schedule.intervalDays)}</span>
                      </div>
                      <ScheduleActions schedule={schedule} label={label} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
