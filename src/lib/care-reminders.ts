/**
 * Care Reminders Utilities
 * Functions for calculating due dates and reminder status
 */

export type ReminderStatus = "overdue" | "due-today" | "due-soon" | "upcoming";

export interface ReminderStatusInfo {
  status: ReminderStatus;
  daysUntilDue: number;
  label: string;
}

/**
 * Calculate the next due date based on care date and interval
 */
export function calculateNextDueDate(careDate: Date, intervalDays: number): Date {
  const next = new Date(careDate);
  next.setDate(next.getDate() + intervalDays);
  // Reset time to start of day for consistent comparisons
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Determine reminder status based on next due date
 */
export function getReminderStatus(nextDueDate: Date): ReminderStatusInfo {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(
    nextDueDate.getFullYear(),
    nextDueDate.getMonth(),
    nextDueDate.getDate()
  );

  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let status: ReminderStatus;
  let label: string;

  if (diffDays < 0) {
    status = "overdue";
    label = diffDays === -1 ? "1 day overdue" : `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    status = "due-today";
    label = "Due today";
  } else if (diffDays <= 2) {
    status = "due-soon";
    label = diffDays === 1 ? "Due tomorrow" : `Due in ${diffDays} days`;
  } else {
    status = "upcoming";
    label = `Due in ${diffDays} days`;
  }

  return { status, daysUntilDue: diffDays, label };
}

/**
 * Parse species waterFrequency text to suggest interval in days
 */
export function suggestIntervalFromSpecies(waterFrequency: string): number {
  const lower = waterFrequency.toLowerCase();

  // Match specific patterns first (order matters - check more specific patterns before general ones)
  if (lower.includes("daily") || lower.includes("every day")) return 1;
  if (lower.includes("every other day") || lower.includes("every 2 days")) return 2;
  if (lower.includes("2-3 times per week") || lower.includes("twice a week")) return 3;
  if (lower.includes("every 3-4 days")) return 4;
  // Check bi-weekly BEFORE weekly (bi-weekly contains "weekly")
  if (lower.includes("every 2 weeks") || lower.includes("bi-weekly") || lower.includes("biweekly") || lower.includes("bi weekly")) return 14;
  if (lower.includes("every 1-2 weeks") || lower.includes("1-2 weeks")) return 10;
  if (lower.includes("weekly") || lower.includes("once a week") || lower.includes("every week")) return 7;
  if (lower.includes("every 2-3 weeks") || lower.includes("2-3 weeks")) return 18;
  if (lower.includes("every 2-4 weeks") || lower.includes("2-4 weeks")) return 21;
  if (lower.includes("every 3 weeks")) return 21;
  if (lower.includes("monthly") || lower.includes("once a month") || lower.includes("every month")) return 30;
  if (lower.includes("every 4-6 weeks")) return 35;
  if (lower.includes("every 6 weeks")) return 42;

  // Default to weekly if no pattern matches
  return 7;
}

/**
 * Get badge variant based on reminder status
 */
export function getStatusBadgeVariant(
  status: ReminderStatus
): "destructive" | "secondary" | "default" | "outline" {
  switch (status) {
    case "overdue":
      return "destructive";
    case "due-today":
      return "secondary";
    case "due-soon":
      return "default";
    case "upcoming":
      return "outline";
  }
}

/**
 * Care type display info
 */
export const careTypeInfo: Record<string, { emoji: string; label: string }> = {
  WATERING: { emoji: "💧", label: "Watering" },
  FERTILIZING: { emoji: "🌿", label: "Fertilizing" },
  REPOTTING: { emoji: "🪴", label: "Repotting" },
  PRUNING: { emoji: "✂️", label: "Pruning" },
  PEST_TREATMENT: { emoji: "🐛", label: "Pest Treatment" },
  OTHER: { emoji: "📝", label: "Other Care" },
};

/**
 * Format interval for display
 */
export function formatInterval(days: number): string {
  if (days === 1) return "Daily";
  if (days === 7) return "Weekly";
  if (days === 14) return "Every 2 weeks";
  if (days === 21) return "Every 3 weeks";
  if (days === 30) return "Monthly";
  return `Every ${days} days`;
}

/**
 * Get suggested intervals for different care types
 */
export function getSuggestedIntervals(careType: string): number[] {
  switch (careType) {
    case "WATERING":
      return [3, 7, 10, 14, 21]; // More frequent
    case "FERTILIZING":
      return [14, 21, 30, 42, 60]; // Less frequent
    case "REPOTTING":
      return [180, 365]; // Rare
    case "PRUNING":
      return [30, 60, 90, 180]; // Occasional
    case "PEST_TREATMENT":
      return [14, 30, 60]; // As needed
    default:
      return [7, 14, 30];
  }
}
