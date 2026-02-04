"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatInterval, getSuggestedIntervals } from "@/lib/care-reminders";

interface ScheduleEditPopoverProps {
  scheduleId: string;
  careType: string;
  currentInterval: number;
  currentDueDate: string;
  onComplete?: () => void;
}

export function ScheduleEditPopover({
  scheduleId,
  careType,
  currentInterval,
  currentDueDate,
  onComplete,
}: ScheduleEditPopoverProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [intervalDays, setIntervalDays] = useState(currentInterval);
  const [nextDueDate, setNextDueDate] = useState(
    currentDueDate.split("T")[0]
  );

  const suggestedIntervals = getSuggestedIntervals(careType);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIntervalDays(currentInterval);
      setNextDueDate(currentDueDate.split("T")[0]);
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/care-schedules/${scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intervalDays,
          nextDueDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update schedule");
      }

      setIsOpen(false);
      router.refresh();
      onComplete?.();
    } catch (error) {
      console.error("Error updating schedule:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIntervalChange = (value: string) => {
    const days = parseInt(value, 10);
    if (!isNaN(days) && days > 0) {
      setIntervalDays(days);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit schedule</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Edit Schedule</h4>

          <div className="space-y-2">
            <Label htmlFor={`edit-interval-${scheduleId}`}>Interval</Label>
            <div className="flex items-center gap-2">
              <select
                id={`edit-interval-${scheduleId}`}
                value={intervalDays}
                onChange={(e) => handleIntervalChange(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                {suggestedIntervals.map((days) => (
                  <option key={days} value={days}>
                    {formatInterval(days)}
                  </option>
                ))}
                {!suggestedIntervals.includes(intervalDays) && (
                  <option value={intervalDays}>
                    {formatInterval(intervalDays)}
                  </option>
                )}
              </select>
              <Input
                type="number"
                min="1"
                max="365"
                value={intervalDays}
                onChange={(e) => handleIntervalChange(e.target.value)}
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-due-date-${scheduleId}`}>Next Due Date</Label>
            <Input
              id={`edit-due-date-${scheduleId}`}
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
