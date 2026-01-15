import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateNextDueDate,
  getReminderStatus,
  suggestIntervalFromSpecies,
  getStatusBadgeVariant,
  formatInterval,
  getSuggestedIntervals,
} from "./care-reminders";

describe("care-reminders", () => {
  describe("calculateNextDueDate", () => {
    it("should add interval days to care date", () => {
      const careDate = new Date(2024, 0, 15); // Jan 15, 2024
      const result = calculateNextDueDate(careDate, 7);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(22);
    });

    it("should handle month boundaries", () => {
      const careDate = new Date(2024, 0, 28); // Jan 28, 2024
      const result = calculateNextDueDate(careDate, 7);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it("should handle year boundaries", () => {
      const careDate = new Date(2024, 11, 28); // Dec 28, 2024
      const result = calculateNextDueDate(careDate, 7);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(4);
    });

    it("should reset time to start of day", () => {
      const careDate = new Date(2024, 0, 15, 15, 30, 0); // Jan 15, 2024 15:30
      const result = calculateNextDueDate(careDate, 7);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe("getReminderStatus", () => {
    beforeEach(() => {
      // Mock current date to 2024-01-15 12:00:00 local time
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return overdue for past dates", () => {
      const result = getReminderStatus(new Date(2024, 0, 13)); // Jan 13
      expect(result.status).toBe("overdue");
      expect(result.daysUntilDue).toBe(-2);
      expect(result.label).toBe("2 days overdue");
    });

    it("should return due-today for today", () => {
      const result = getReminderStatus(new Date(2024, 0, 15)); // Jan 15
      expect(result.status).toBe("due-today");
      expect(result.daysUntilDue).toBe(0);
      expect(result.label).toBe("Due today");
    });

    it("should return due-soon for tomorrow", () => {
      const result = getReminderStatus(new Date(2024, 0, 16)); // Jan 16
      expect(result.status).toBe("due-soon");
      expect(result.daysUntilDue).toBe(1);
      expect(result.label).toBe("Due tomorrow");
    });

    it("should return due-soon for 2 days", () => {
      const result = getReminderStatus(new Date(2024, 0, 17)); // Jan 17
      expect(result.status).toBe("due-soon");
      expect(result.daysUntilDue).toBe(2);
      expect(result.label).toBe("Due in 2 days");
    });

    it("should return upcoming for 3+ days", () => {
      const result = getReminderStatus(new Date(2024, 0, 20)); // Jan 20
      expect(result.status).toBe("upcoming");
      expect(result.daysUntilDue).toBe(5);
      expect(result.label).toBe("Due in 5 days");
    });

    it("should handle 1 day overdue singular", () => {
      const result = getReminderStatus(new Date(2024, 0, 14)); // Jan 14
      expect(result.status).toBe("overdue");
      expect(result.label).toBe("1 day overdue");
    });
  });

  describe("suggestIntervalFromSpecies", () => {
    it("should return 1 for daily watering", () => {
      expect(suggestIntervalFromSpecies("Daily, keep soil moist")).toBe(1);
      expect(suggestIntervalFromSpecies("Water every day")).toBe(1);
    });

    it("should return 7 for weekly watering", () => {
      expect(suggestIntervalFromSpecies("Weekly, when top inch is dry")).toBe(7);
      expect(suggestIntervalFromSpecies("Once a week")).toBe(7);
      expect(suggestIntervalFromSpecies("Every week")).toBe(7);
    });

    it("should return 14 for bi-weekly watering", () => {
      expect(suggestIntervalFromSpecies("Every 2 weeks")).toBe(14);
      expect(suggestIntervalFromSpecies("Bi-weekly watering")).toBe(14);
    });

    it("should return 18 for 2-3 weeks", () => {
      expect(suggestIntervalFromSpecies("Every 2-3 weeks")).toBe(18);
    });

    it("should return 30 for monthly", () => {
      expect(suggestIntervalFromSpecies("Monthly during growing season")).toBe(30);
      expect(suggestIntervalFromSpecies("Once a month")).toBe(30);
    });

    it("should return 7 as default for unknown patterns", () => {
      expect(suggestIntervalFromSpecies("Keep soil moist")).toBe(7);
      expect(suggestIntervalFromSpecies("As needed")).toBe(7);
    });

    it("should be case insensitive", () => {
      expect(suggestIntervalFromSpecies("WEEKLY")).toBe(7);
      expect(suggestIntervalFromSpecies("Daily")).toBe(1);
    });
  });

  describe("getStatusBadgeVariant", () => {
    it("should return destructive for overdue", () => {
      expect(getStatusBadgeVariant("overdue")).toBe("destructive");
    });

    it("should return secondary for due-today", () => {
      expect(getStatusBadgeVariant("due-today")).toBe("secondary");
    });

    it("should return default for due-soon", () => {
      expect(getStatusBadgeVariant("due-soon")).toBe("default");
    });

    it("should return outline for upcoming", () => {
      expect(getStatusBadgeVariant("upcoming")).toBe("outline");
    });
  });

  describe("formatInterval", () => {
    it("should format common intervals", () => {
      expect(formatInterval(1)).toBe("Daily");
      expect(formatInterval(7)).toBe("Weekly");
      expect(formatInterval(14)).toBe("Every 2 weeks");
      expect(formatInterval(21)).toBe("Every 3 weeks");
      expect(formatInterval(30)).toBe("Monthly");
    });

    it("should format custom intervals", () => {
      expect(formatInterval(5)).toBe("Every 5 days");
      expect(formatInterval(10)).toBe("Every 10 days");
    });
  });

  describe("getSuggestedIntervals", () => {
    it("should return frequent intervals for watering", () => {
      const intervals = getSuggestedIntervals("WATERING");
      expect(intervals).toContain(7);
      expect(intervals[0]).toBeLessThan(intervals[intervals.length - 1]);
    });

    it("should return less frequent intervals for fertilizing", () => {
      const intervals = getSuggestedIntervals("FERTILIZING");
      expect(intervals[0]).toBeGreaterThanOrEqual(14);
    });

    it("should return rare intervals for repotting", () => {
      const intervals = getSuggestedIntervals("REPOTTING");
      expect(intervals).toContain(365);
    });

    it("should return default intervals for unknown types", () => {
      const intervals = getSuggestedIntervals("UNKNOWN");
      expect(intervals).toEqual([7, 14, 30]);
    });
  });
});
