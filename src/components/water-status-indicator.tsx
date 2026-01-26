import { getReminderStatus } from "@/lib/care-reminders";

interface WaterStatusIndicatorProps {
  nextDueDate: Date;
}

export function WaterStatusIndicator({ nextDueDate }: WaterStatusIndicatorProps) {
  const status = getReminderStatus(nextDueDate);

  const colorClass =
    status.status === "overdue"
      ? "text-red-600"
      : status.status === "due-today"
        ? "text-orange-600"
        : status.status === "due-soon"
          ? "text-blue-600"
          : "text-gray-500";

  const displayText =
    status.status === "overdue" || status.status === "due-today"
      ? status.label
      : `Next water: ${nextDueDate.toLocaleDateString()}`;

  return (
    <div className={`flex items-center gap-1 mt-2 text-sm ${colorClass}`}>
      <span>💧</span>
      <span>{displayText}</span>
    </div>
  );
}
