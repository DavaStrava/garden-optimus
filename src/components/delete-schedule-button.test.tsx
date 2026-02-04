import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { DeleteScheduleButton } from "./delete-schedule-button";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DeleteScheduleButton", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should render the delete icon button", () => {
    render(
      <DeleteScheduleButton
        scheduleId="sched-1"
        careTypeLabel="Watering"
        plantName="My Monstera"
      />
    );

    expect(
      screen.getByRole("button", { name: /delete schedule/i })
    ).toBeInTheDocument();
  });

  it("should open confirmation dialog when clicked", async () => {
    const { user } = render(
      <DeleteScheduleButton
        scheduleId="sched-1"
        careTypeLabel="Watering"
        plantName="My Monstera"
      />
    );

    await user.click(
      screen.getByRole("button", { name: /delete schedule/i })
    );

    expect(
      screen.getByRole("heading", { name: /delete care schedule/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/watering/i)).toBeInTheDocument();
    expect(screen.getByText(/my monstera/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("should close dialog when cancel is clicked", async () => {
    const { user } = render(
      <DeleteScheduleButton
        scheduleId="sched-1"
        careTypeLabel="Watering"
        plantName="My Monstera"
      />
    );

    await user.click(
      screen.getByRole("button", { name: /delete schedule/i })
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/cannot be undone/i)
      ).not.toBeInTheDocument();
    });
  });

  it("should call delete API when confirmed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { user } = render(
      <DeleteScheduleButton
        scheduleId="sched-1"
        careTypeLabel="Watering"
        plantName="My Monstera"
      />
    );

    await user.click(
      screen.getByRole("button", { name: /delete schedule/i })
    );

    // Click the "Delete" confirm button in the dialog
    const buttons = screen.getAllByRole("button", { name: /^delete$/i });
    const confirmButton = buttons[buttons.length - 1];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/care-schedules/sched-1", {
        method: "DELETE",
      });
    });
  });

  it("should show loading state while deleting", async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(pendingPromise);

    const { user } = render(
      <DeleteScheduleButton
        scheduleId="sched-1"
        careTypeLabel="Watering"
        plantName="My Monstera"
      />
    );

    await user.click(
      screen.getByRole("button", { name: /delete schedule/i })
    );

    const buttons = screen.getAllByRole("button", { name: /^delete$/i });
    const confirmButton = buttons[buttons.length - 1];
    await user.click(confirmButton);

    expect(
      screen.getByRole("button", { name: /deleting/i })
    ).toBeInTheDocument();

    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("should call onComplete callback after successful delete", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    const onComplete = vi.fn();

    const { user } = render(
      <DeleteScheduleButton
        scheduleId="sched-1"
        careTypeLabel="Watering"
        plantName="My Monstera"
        onComplete={onComplete}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /delete schedule/i })
    );

    const buttons = screen.getAllByRole("button", { name: /^delete$/i });
    const confirmButton = buttons[buttons.length - 1];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
