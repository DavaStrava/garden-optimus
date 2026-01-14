import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { CareLogForm } from "./care-log-form";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CareLogForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should render the form with all fields", () => {
    render(<CareLogForm plantId="plant-123" />);

    // Check for labels (shadcn Select doesn't use htmlFor properly)
    expect(screen.getByText(/care type/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., 200ml/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/any additional notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log care/i })).toBeInTheDocument();
  });

  it("should have a select dropdown for care type", () => {
    render(<CareLogForm plantId="plant-123" />);

    // The select should be present as a combobox
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should submit form with correct data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "log-1" }),
    });

    const { user } = render(<CareLogForm plantId="plant-123" />);

    // Fill in the amount field
    await user.type(screen.getByPlaceholderText(/e.g., 200ml/i), "200ml");

    // Fill in notes
    await user.type(screen.getByPlaceholderText(/any additional notes/i), "Morning watering");

    // Submit the form
    await user.click(screen.getByRole("button", { name: /log care/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/care-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("plant-123"),
      });
    });
  });

  it("should display error message on failed submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to log care" }),
    });

    const { user } = render(<CareLogForm plantId="plant-123" />);

    await user.click(screen.getByRole("button", { name: /log care/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to log care/i)).toBeInTheDocument();
    });
  });

  it("should show loading state while submitting", async () => {
    // Create a promise that we can control
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(pendingPromise);

    const { user } = render(<CareLogForm plantId="plant-123" />);

    await user.click(screen.getByRole("button", { name: /log care/i }));

    expect(screen.getByRole("button", { name: /logging/i })).toBeInTheDocument();

    // Resolve the promise to clean up
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ id: "log-1" }),
    });
  });
});
