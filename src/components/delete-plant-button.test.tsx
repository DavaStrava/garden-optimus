import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { DeletePlantButton } from "./delete-plant-button";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DeletePlantButton", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should render the delete button", () => {
    render(<DeletePlantButton plantId="plant-123" plantName="My Monstera" />);

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("should open confirmation dialog when clicked", async () => {
    const { user } = render(
      <DeletePlantButton plantId="plant-123" plantName="My Monstera" />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    // Dialog title
    expect(screen.getByRole("heading", { name: /move to trash/i })).toBeInTheDocument();
    // Plant name in dialog
    expect(screen.getByText(/my monstera/i)).toBeInTheDocument();
    // Info about auto-delete and restore
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
    expect(screen.getByText(/restore/i)).toBeInTheDocument();
  });

  it("should close dialog when cancel is clicked", async () => {
    const { user } = render(
      <DeletePlantButton plantId="plant-123" plantName="My Monstera" />
    );

    // Open dialog
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    // Click cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText(/7 days/i)).not.toBeInTheDocument();
    });
  });

  it("should call delete API when confirmed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { user } = render(
      <DeletePlantButton plantId="plant-123" plantName="My Monstera" />
    );

    // Open dialog
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    // Click "Move to Trash" button in dialog (not the trigger)
    const trashButton = screen.getByRole("button", { name: /move to trash$/i });
    await user.click(trashButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/plants/plant-123", {
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
      <DeletePlantButton plantId="plant-123" plantName="My Monstera" />
    );

    // Open dialog
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    // Click "Move to Trash" confirm button
    const trashButton = screen.getByRole("button", { name: /move to trash$/i });
    await user.click(trashButton);

    expect(screen.getByRole("button", { name: /moving to trash/i })).toBeInTheDocument();

    // Cleanup
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });
});
