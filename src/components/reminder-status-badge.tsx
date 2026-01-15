"use client";

import { Badge } from "@/components/ui/badge";
import type { ReminderStatus } from "@/lib/care-reminders";

interface ReminderStatusBadgeProps {
  status: ReminderStatus;
  label: string;
}

const variantMap: Record<
  ReminderStatus,
  "destructive" | "secondary" | "default" | "outline"
> = {
  overdue: "destructive",
  "due-today": "secondary",
  "due-soon": "default",
  upcoming: "outline",
};

export function ReminderStatusBadge({
  status,
  label,
}: ReminderStatusBadgeProps) {
  return <Badge variant={variantMap[status]}>{label}</Badge>;
}
