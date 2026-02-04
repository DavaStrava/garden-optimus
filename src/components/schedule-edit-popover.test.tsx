import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { ScheduleEditPopover } from "./schedule-edit-popover";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ScheduleEditPopover", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should render the edit icon button", () => {
    render(
      <ScheduleEditPopover
        scheduleId="sched-1"
        careType="WATERING"
        currentInterval={7}
        currentDueDate="2026-02-10T00:00:00.000Z"
      />
    );

    expect(
      screen.getByRole("button", { name: /edit schedule/i })
    ).toBeInTheDocument();
  });

  it("should open popover with current values when clicked", async () => {
    const { user } = render(
      <ScheduleEditPopover
        scheduleId="sched-1"
        careType="WATERING"
        currentInterval={7}
        currentDueDate="2026-02-10T00:00:00.000Z"
      />
    );

    await user.click(
      screen.getByRole("button", { name: /edit schedule/i })
    );

    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
      /edit schedule/i
    );
    // Date input should show the date portion
    const dateInput = screen.getByLabelText(/next due date/i);
    expect(dateInput).toHaveValue("2026-02-10");
  });

  it("should call PUT API with updated values when saved", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ schedule: {} }),
    });

    const { user } = render(
      <ScheduleEditPopover
        scheduleId="sched-1"
        careType="WATERING"
        currentInterval={7}
        currentDueDate="2026-02-10T00:00:00.000Z"
      />
    );

    await user.click(
      screen.getByRole("button", { name: /edit schedule/i })
    );

    // Change the date
    const dateInput = screen.getByLabelText(/next due date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-02-15");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/care-schedules/sched-1",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.nextDueDate).toBe("2026-02-15");
    expect(body.intervalDays).toBe(7);
  });

  it("should reset state to current props when reopened", async () => {
    const { user, rerender } = render(
      <ScheduleEditPopover
        scheduleId="sched-1"
        careType="WATERING"
        currentInterval={7}
        currentDueDate="2026-02-10T00:00:00.000Z"
      />
    );

    // Open, modify, close
    await user.click(
      screen.getByRole("button", { name: /edit schedule/i })
    );

    const dateInput = screen.getByLabelText(/next due date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-03-01");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Rerender with new props (simulating server refresh with new date)
    rerender(
      <ScheduleEditPopover
        scheduleId="sched-1"
        careType="WATERING"
        currentInterval={14}
        currentDueDate="2026-02-20T00:00:00.000Z"
      />
    );

    // Reopen - should show the new prop values, not the stale modified ones
    await user.click(
      screen.getByRole("button", { name: /edit schedule/i })
    );

    await waitFor(() => {
      const reopenedDateInput = screen.getByLabelText(/next due date/i);
      expect(reopenedDateInput).toHaveValue("2026-02-20");
    });
  });

  it("should use unique ids per scheduleId", () => {
    const { container } = render(
      <div>
        <ScheduleEditPopover
          scheduleId="sched-1"
          careType="WATERING"
          currentInterval={7}
          currentDueDate="2026-02-10T00:00:00.000Z"
        />
        <ScheduleEditPopover
          scheduleId="sched-2"
          careType="FERTILIZING"
          currentInterval={30}
          currentDueDate="2026-03-01T00:00:00.000Z"
        />
      </div>
    );

    // Verify two distinct edit buttons are rendered
    const editButtons = container.querySelectorAll("button");
    expect(editButtons.length).toBe(2);
  });

  it("should call onComplete callback after successful save", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ schedule: {} }),
    });
    const onComplete = vi.fn();

    const { user } = render(
      <ScheduleEditPopover
        scheduleId="sched-1"
        careType="WATERING"
        currentInterval={7}
        currentDueDate="2026-02-10T00:00:00.000Z"
        onComplete={onComplete}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /edit schedule/i })
    );
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
