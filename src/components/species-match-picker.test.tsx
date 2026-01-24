import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import { SpeciesMatchPicker } from "./species-match-picker";
import type { SpeciesMatch, AIIdentification } from "@/types/species";

const mockIdentification: AIIdentification = {
  species: "Golden Pothos",
  scientificName: "Epipremnum aureum",
  confidence: "high",
  reasoning: "Identified by heart-shaped leaves with golden variegation",
};

const mockMatches: SpeciesMatch[] = [
  {
    id: "1",
    commonName: "Golden Pothos",
    scientificName: "Epipremnum aureum",
    lightNeeds: "Bright indirect light",
    waterFrequency: "Weekly",
    suitableFor: ["INDOOR"],
    matchConfidence: "high",
  },
  {
    id: "2",
    commonName: "Neon Pothos",
    scientificName: "Epipremnum aureum 'Neon'",
    lightNeeds: "Bright indirect light",
    waterFrequency: "Weekly",
    suitableFor: ["INDOOR"],
    matchConfidence: "medium",
  },
  {
    id: "3",
    commonName: "Marble Queen Pothos",
    scientificName: "Epipremnum aureum 'Marble Queen'",
    lightNeeds: "Bright indirect light",
    waterFrequency: "Weekly",
    suitableFor: ["INDOOR"],
    matchConfidence: "low",
  },
];

describe("SpeciesMatchPicker", () => {
  describe("with matches", () => {
    it("should render AI identification info", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      // Multiple elements with "Golden Pothos" - header and first match
      expect(screen.getAllByText(/Golden Pothos/).length).toBeGreaterThan(0);
      expect(screen.getByText(/heart-shaped leaves/)).toBeInTheDocument();
    });

    it("should display confidence badge", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("High Confidence")).toBeInTheDocument();
    });

    it("should render all match options", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Neon Pothos")).toBeInTheDocument();
      expect(screen.getByText("Marble Queen Pothos")).toBeInTheDocument();
    });

    it("should show 'Best Match' badge for first high-confidence match", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Best Match")).toBeInTheDocument();
    });

    it("should show scientific names for matches", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Epipremnum aureum 'Neon'")).toBeInTheDocument();
    });

    it("should show light needs for matches", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      // All matches have same light needs
      const lightElements = screen.getAllByText("Bright indirect light");
      expect(lightElements.length).toBeGreaterThan(0);
    });

    it("should show water frequency for matches", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      const waterElements = screen.getAllByText("Weekly");
      expect(waterElements.length).toBeGreaterThan(0);
    });

    it("should show Indoor/Outdoor badges", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      const indoorBadges = screen.getAllByText("Indoor");
      expect(indoorBadges.length).toBeGreaterThan(0);
    });

    it("should call onSelect when match is clicked", async () => {
      const onSelect = vi.fn();
      const { user } = render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={onSelect}
          onSkip={vi.fn()}
        />
      );

      // Click on Neon Pothos
      await user.click(screen.getByText("Neon Pothos"));

      expect(onSelect).toHaveBeenCalledWith("2", expect.objectContaining({
        id: "2",
        commonName: "Neon Pothos",
      }));
    });

    it("should call onSkip when skip button is clicked", async () => {
      const onSkip = vi.fn();
      const { user } = render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={onSkip}
        />
      );

      await user.click(screen.getByText("Skip - Select species manually"));

      expect(onSkip).toHaveBeenCalled();
    });

    it("should render skip button", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Skip - Select species manually")).toBeInTheDocument();
    });
  });

  describe("with no matches", () => {
    it("should show 'Species Not Found in Library' message", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={[]}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Species Not Found in Library")).toBeInTheDocument();
    });

    it("should show AI identification even without matches", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={[]}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText(/Golden Pothos/)).toBeInTheDocument();
      expect(screen.getByText(/Epipremnum aureum/)).toBeInTheDocument();
    });

    it("should show continue button when no matches", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={[]}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Continue without selecting a species")).toBeInTheDocument();
    });

    it("should call onSkip when continue button is clicked", async () => {
      const onSkip = vi.fn();
      const { user } = render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={[]}
          onSelect={vi.fn()}
          onSkip={onSkip}
        />
      );

      await user.click(screen.getByText("Continue without selecting a species"));

      expect(onSkip).toHaveBeenCalled();
    });

    it("should show reasoning when no matches", () => {
      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={[]}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText(/heart-shaped leaves/)).toBeInTheDocument();
    });
  });

  describe("confidence levels", () => {
    it("should show medium confidence badge", () => {
      const mediumConfidenceId: AIIdentification = {
        ...mockIdentification,
        confidence: "medium",
      };

      render(
        <SpeciesMatchPicker
          identification={mediumConfidenceId}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Medium Confidence")).toBeInTheDocument();
    });

    it("should show low confidence badge", () => {
      const lowConfidenceId: AIIdentification = {
        ...mockIdentification,
        confidence: "low",
      };

      render(
        <SpeciesMatchPicker
          identification={lowConfidenceId}
          matches={mockMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Low Confidence")).toBeInTheDocument();
    });

    it("should not show 'Best Match' when first match is not high confidence", () => {
      const lowConfidenceMatches: SpeciesMatch[] = [
        {
          ...mockMatches[0],
          matchConfidence: "medium",
        },
        ...mockMatches.slice(1),
      ];

      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={lowConfidenceMatches}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.queryByText("Best Match")).not.toBeInTheDocument();
    });
  });

  describe("without scientific name", () => {
    it("should render without scientific name in identification", () => {
      const idWithoutScientific: AIIdentification = {
        ...mockIdentification,
        scientificName: null,
      };

      render(
        <SpeciesMatchPicker
          identification={idWithoutScientific}
          matches={[]}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText(/Golden Pothos/)).toBeInTheDocument();
      expect(screen.queryByText(/Epipremnum aureum/)).not.toBeInTheDocument();
    });

    it("should handle matches without scientific names", () => {
      const matchesWithoutScientific: SpeciesMatch[] = [
        {
          ...mockMatches[0],
          scientificName: null,
        },
      ];

      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={matchesWithoutScientific}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getAllByText("Golden Pothos").length).toBeGreaterThan(0);
    });
  });

  describe("suitableFor variations", () => {
    it("should show both Indoor and Outdoor badges when applicable", () => {
      const matchWithBoth: SpeciesMatch[] = [
        {
          ...mockMatches[0],
          suitableFor: ["INDOOR", "OUTDOOR"],
        },
      ];

      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={matchWithBoth}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Indoor")).toBeInTheDocument();
      expect(screen.getByText("Outdoor")).toBeInTheDocument();
    });

    it("should handle matches without suitableFor", () => {
      const matchWithoutSuitable: SpeciesMatch[] = [
        {
          ...mockMatches[0],
          suitableFor: undefined,
        },
      ];

      render(
        <SpeciesMatchPicker
          identification={mockIdentification}
          matches={matchWithoutSuitable}
          onSelect={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      // Should render without crashing
      expect(screen.getAllByText("Golden Pothos").length).toBeGreaterThan(0);
    });
  });
});
