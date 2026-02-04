import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { CareScheduleForm } from "./care-schedule-form";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const existingSchedules = [
  {
    id: "sched-1",
    careType: "WATERING",
    intervalDays: 7,
    enabled: true,
  },
  {
    id: "sched-2",
    careType: "FERTILIZING",
    intervalDays: 30,
    enabled: true,
  },
];

describe("CareScheduleForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ schedule: {} }),
    });
  });

  it("should render all care types with switches", () => {
    render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    expect(screen.getByText("Watering")).toBeInTheDocument();
    expect(screen.getByText("Fertilizing")).toBeInTheDocument();
    expect(screen.getByText("Pruning")).toBeInTheDocument();
    expect(screen.getByText("Repotting")).toBeInTheDocument();
    expect(screen.getByText("Pest Treatment")).toBeInTheDocument();
  });

  it("should initialize switches from existing schedules", () => {
    render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    const wateringSwitch = screen.getByRole("switch", { name: /watering/i });
    const fertilizingSwitch = screen.getByRole("switch", { name: /fertilizing/i });
    const pruningSwitch = screen.getByRole("switch", { name: /pruning/i });

    expect(wateringSwitch).toBeChecked();
    expect(fertilizingSwitch).toBeChecked();
    expect(pruningSwitch).not.toBeChecked();
  });

  it("should disable save button when no changes made", () => {
    render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("should enable save button when a toggle changes", async () => {
    const { user } = render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    const pruningSwitch = screen.getByRole("switch", { name: /pruning/i });
    await user.click(pruningSwitch);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("should send PUT to disable schedule when toggled off", async () => {
    const { user } = render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    // Toggle watering OFF
    const wateringSwitch = screen.getByRole("switch", { name: /watering/i });
    await user.click(wateringSwitch);

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      // Should have sent a PUT to disable the watering schedule
      const putCall = mockFetch.mock.calls.find(
        (call: [string, RequestInit]) =>
          call[0] === "/api/care-schedules/sched-1" &&
          call[1].method === "PUT"
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body as string);
      expect(body).toEqual({ enabled: false });
    });
  });

  it("should send POST for enabled schedules when saved", async () => {
    const { user } = render(
      <CareScheduleForm plantId="plant-1" existingSchedules={[]} />
    );

    // Toggle watering ON
    const wateringSwitch = screen.getByRole("switch", { name: /watering/i });
    await user.click(wateringSwitch);

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (call: [string, RequestInit]) =>
          call[0].includes("/care-schedules") && call[1].method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body as string);
      expect(body.careType).toBe("WATERING");
    });
  });

  it("should not send duplicate disable requests on rapid double save", async () => {
    const { user } = render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    // Toggle watering OFF
    const wateringSwitch = screen.getByRole("switch", { name: /watering/i });
    await user.click(wateringSwitch);

    // Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // After the first save completes, savedConfig is updated.
    // The button should now be disabled since there are no further changes.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });
  });

  it("should show correct button label with enabled count", async () => {
    const { user } = render(
      <CareScheduleForm plantId="plant-1" existingSchedules={existingSchedules} />
    );

    // Initially 2 enabled (watering + fertilizing), no changes
    expect(screen.getByText(/save 2 reminders/i)).toBeInTheDocument();

    // Toggle watering off
    await user.click(screen.getByRole("switch", { name: /watering/i }));

    expect(screen.getByText(/save 1 reminder$/i)).toBeInTheDocument();
  });
});
