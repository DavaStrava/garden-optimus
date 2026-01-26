import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { SpeciesCombobox } from "./species-combobox";
import type { SpeciesData } from "@/types/species";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSpecies: SpeciesData[] = [
  {
    id: "1",
    commonName: "Golden Pothos",
    scientificName: "Epipremnum aureum",
    lightNeeds: "Bright indirect light",
    suitableFor: ["INDOOR"],
  },
  {
    id: "2",
    commonName: "Monstera",
    scientificName: "Monstera deliciosa",
    lightNeeds: "Bright indirect light",
    suitableFor: ["INDOOR", "OUTDOOR"],
  },
  {
    id: "3",
    commonName: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    lightNeeds: "Low to bright light",
    suitableFor: ["INDOOR"],
  },
];

describe("SpeciesCombobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ species: mockSpecies }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("rendering", () => {
    it("should render with placeholder text when no value selected", () => {
      render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      expect(screen.getByText("Search for a species...")).toBeInTheDocument();
    });

    it("should render with selected species name", () => {
      render(
        <SpeciesCombobox
          value="1"
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
    });

    it("should show scientific name when species is selected", () => {
      render(
        <SpeciesCombobox
          value="1"
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      expect(screen.getByText(/Epipremnum aureum/)).toBeInTheDocument();
    });

    it("should be disabled when disabled prop is true", () => {
      render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
          disabled={true}
        />
      );

      const button = screen.getByRole("combobox");
      expect(button).toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("should open popover when clicked", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      const button = screen.getByRole("combobox");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search species by name...")).toBeInTheDocument();
      });
    });

    it("should show species list when opened", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
        expect(screen.getByText("Monstera")).toBeInTheDocument();
        expect(screen.getByText("Snake Plant")).toBeInTheDocument();
      });
    });

    it("should call onValueChange when species is selected", async () => {
      const onValueChange = vi.fn();
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={onValueChange}
          initialSpecies={mockSpecies}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getByText("Monstera")).toBeInTheDocument();
      });

      // Click on Monstera option
      const monsteraOption = screen.getAllByText("Monstera")[0];
      await user.click(monsteraOption);

      expect(onValueChange).toHaveBeenCalledWith("2", expect.objectContaining({
        id: "2",
        commonName: "Monstera",
      }));
    });

    it("should clear selection when clear button is clicked", async () => {
      const onValueChange = vi.fn();
      const { user } = render(
        <SpeciesCombobox
          value="1"
          onValueChange={onValueChange}
          initialSpecies={mockSpecies}
        />
      );

      // Find and click clear button (using sr-only text)
      const clearButton = screen.getByRole("button", { name: /clear/i });
      await user.click(clearButton);

      expect(onValueChange).toHaveBeenCalledWith(null, null);
    });

    it("should deselect when clicking already selected species", async () => {
      const onValueChange = vi.fn();
      const { user } = render(
        <SpeciesCombobox
          value="1"
          onValueChange={onValueChange}
          initialSpecies={mockSpecies}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getAllByText("Golden Pothos").length).toBeGreaterThan(0);
      });

      // Click on the already selected species
      const options = screen.getAllByText("Golden Pothos");
      const optionInList = options[options.length - 1]; // Get the one in the list
      await user.click(optionInList);

      expect(onValueChange).toHaveBeenCalledWith(null, null);
    });
  });

  describe("search functionality", () => {
    it("should fetch species when popover opens with empty initial species", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={[]}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should include location filter in search request", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={[]}
          location="INDOOR"
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("location=INDOOR"),
          expect.any(Object)
        );
      });
    });

    it("should show loading state while searching", async () => {
      // Delay the fetch response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ species: mockSpecies }),
                }),
              100
            )
          )
      );

      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={[]}
        />
      );

      await user.click(screen.getByRole("combobox"));

      // Should show searching state
      await waitFor(() => {
        expect(screen.getByText("Searching...")).toBeInTheDocument();
      });
    });

    it("should show 'No species found' when search returns empty", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ species: [] }),
      });

      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={[]}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getByText("No species found.")).toBeInTheDocument();
      });
    });
  });

  describe("display elements", () => {
    it("should show Indoor/Outdoor badges for species", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        // Monstera has both INDOOR and OUTDOOR
        expect(screen.getAllByText("In").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Out").length).toBeGreaterThan(0);
      });
    });

    it("should show light needs for species in list", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      await user.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getAllByText("Bright indirect light").length).toBeGreaterThan(0);
      });
    });

    it("should show selected species in trigger button", () => {
      // Note: Testing the checkmark icon inside cmdk's virtualized list is unreliable in jsdom.
      // Instead, we verify that the selected species is displayed in the trigger button.
      render(
        <SpeciesCombobox
          value="1"
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      // The selected species should be shown in the trigger button
      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.getByText(/Epipremnum aureum/)).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("should handle fetch error gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={[]}
        />
      );

      await user.click(screen.getByRole("combobox"));

      // Should not crash and should show empty state
      await waitFor(() => {
        expect(screen.getByText("No species found.")).toBeInTheDocument();
      });
    });

    it("should handle non-ok response gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={[]}
        />
      );

      await user.click(screen.getByRole("combobox"));

      // Should not crash
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search species by name...")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      const button = screen.getByRole("combobox");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-label", "Select species");
    });

    it("should update aria-expanded when opened", async () => {
      const { user } = render(
        <SpeciesCombobox
          value={null}
          onValueChange={vi.fn()}
          initialSpecies={mockSpecies}
        />
      );

      const button = screen.getByRole("combobox");
      await user.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });
  });
});
