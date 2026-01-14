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
    expect(screen.getByRole("heading", { name: /delete plant/i })).toBeInTheDocument();
    // Plant name in dialog
    expect(screen.getByText(/my monstera/i)).toBeInTheDocument();
    // Warning text
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
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
      expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
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

    // Click "Delete Plant" button in dialog (not the trigger)
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    const deleteConfirmButton = deleteButtons.find(btn => btn.textContent === "Delete Plant");
    await user.click(deleteConfirmButton!);

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

    // Click delete confirm button
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    const deleteConfirmButton = deleteButtons.find(btn => btn.textContent === "Delete Plant");
    await user.click(deleteConfirmButton!);

    expect(screen.getByRole("button", { name: /deleting/i })).toBeInTheDocument();

    // Cleanup
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });
});
