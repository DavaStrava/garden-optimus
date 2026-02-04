import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import { UpcomingCareCard } from "./upcoming-care-card";

// Mock fetch for child components (QuickCareButton, etc.)
global.fetch = vi.fn();

const mockSchedules = [
  {
    id: "sched-1",
    careType: "WATERING",
    intervalDays: 7,
    nextDueDate: "2026-02-05T00:00:00.000Z",
    enabled: true,
    statusInfo: { status: "due-today" as const, label: "Due today" },
  },
  {
    id: "sched-2",
    careType: "FERTILIZING",
    intervalDays: 30,
    nextDueDate: "2026-02-20T00:00:00.000Z",
    enabled: true,
    statusInfo: { status: "upcoming" as const, label: "Due in 16 days" },
  },
  {
    id: "sched-3",
    careType: "PRUNING",
    intervalDays: 60,
    nextDueDate: "2026-03-01T00:00:00.000Z",
    enabled: false,
    statusInfo: { status: "upcoming" as const, label: "Due in 25 days" },
  },
];

describe("UpcomingCareCard", () => {
  it("should render the card with enabled schedules", () => {
    render(
      <UpcomingCareCard
        plantId="plant-1"
        plantName="My Monstera"
        schedules={mockSchedules}
      />
    );

    expect(screen.getByText("Upcoming Care")).toBeInTheDocument();
    expect(screen.getByText("Watering")).toBeInTheDocument();
    expect(screen.getByText("Fertilizing")).toBeInTheDocument();
    // Disabled schedule (Pruning) should not appear
    expect(screen.queryByText("Pruning")).not.toBeInTheDocument();
  });

  it("should show status badges for each schedule", () => {
    render(
      <UpcomingCareCard
        plantId="plant-1"
        plantName="My Monstera"
        schedules={mockSchedules}
      />
    );

    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(screen.getByText("Due in 16 days")).toBeInTheDocument();
  });

  it("should render action buttons for each schedule", () => {
    render(
      <UpcomingCareCard
        plantId="plant-1"
        plantName="My Monstera"
        schedules={mockSchedules}
      />
    );

    // Each enabled schedule should have Done, Edit, Delete buttons
    const doneButtons = screen.getAllByRole("button", { name: /done/i });
    const editButtons = screen.getAllByRole("button", { name: /edit schedule/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete schedule/i });

    expect(doneButtons).toHaveLength(2);
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it("should return null when no enabled schedules", () => {
    const disabledOnly = mockSchedules.map((s) => ({
      ...s,
      enabled: false,
    }));

    const { container } = render(
      <UpcomingCareCard
        plantId="plant-1"
        plantName="My Monstera"
        schedules={disabledOnly}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should return null when schedules array is empty", () => {
    const { container } = render(
      <UpcomingCareCard
        plantId="plant-1"
        plantName="My Monstera"
        schedules={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should handle unknown care types gracefully", () => {
    const unknownSchedule = [
      {
        id: "sched-unknown",
        careType: "UNKNOWN_TYPE",
        intervalDays: 14,
        nextDueDate: "2026-02-10T00:00:00.000Z",
        enabled: true,
        statusInfo: { status: "upcoming" as const, label: "Due in 6 days" },
      },
    ];

    render(
      <UpcomingCareCard
        plantId="plant-1"
        plantName="My Monstera"
        schedules={unknownSchedule}
      />
    );

    // Should fall back to the raw care type string
    expect(screen.getByText("UNKNOWN_TYPE")).toBeInTheDocument();
  });
});
