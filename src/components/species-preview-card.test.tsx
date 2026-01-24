import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import { SpeciesPreviewCard } from "./species-preview-card";
import type { SpeciesData } from "@/types/species";

const mockSpecies: SpeciesData = {
  id: "1",
  commonName: "Golden Pothos",
  scientificName: "Epipremnum aureum",
  description: "A popular trailing houseplant known for its hardiness.",
  lightNeeds: "Bright indirect light",
  waterFrequency: "Weekly, when top inch is dry",
  humidity: "Average to High",
  temperature: "65-80°F",
  toxicity: "Toxic to pets",
  suitableFor: ["INDOOR"],
};

describe("SpeciesPreviewCard", () => {
  describe("full card (default)", () => {
    it("should render common name", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
    });

    it("should render scientific name in italics", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      const scientificName = screen.getByText("Epipremnum aureum");
      expect(scientificName).toBeInTheDocument();
      expect(scientificName).toHaveClass("italic");
    });

    it("should render description", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(
        screen.getByText("A popular trailing houseplant known for its hardiness.")
      ).toBeInTheDocument();
    });

    it("should render light needs", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Bright indirect light")).toBeInTheDocument();
    });

    it("should render water frequency", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Water")).toBeInTheDocument();
      expect(screen.getByText("Weekly, when top inch is dry")).toBeInTheDocument();
    });

    it("should render humidity", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Humidity")).toBeInTheDocument();
      expect(screen.getByText("Average to High")).toBeInTheDocument();
    });

    it("should render temperature", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Temperature")).toBeInTheDocument();
      expect(screen.getByText("65-80°F")).toBeInTheDocument();
    });

    it("should render toxicity warning", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Toxic to pets")).toBeInTheDocument();
    });

    it("should render Indoor badge", () => {
      render(<SpeciesPreviewCard species={mockSpecies} />);

      expect(screen.getByText("Indoor")).toBeInTheDocument();
    });

    it("should render both Indoor and Outdoor badges when applicable", () => {
      const speciesWithBoth: SpeciesData = {
        ...mockSpecies,
        suitableFor: ["INDOOR", "OUTDOOR"],
      };

      render(<SpeciesPreviewCard species={speciesWithBoth} />);

      expect(screen.getByText("Indoor")).toBeInTheDocument();
      expect(screen.getByText("Outdoor")).toBeInTheDocument();
    });
  });

  describe("compact card", () => {
    it("should render compact layout", () => {
      const { container } = render(
        <SpeciesPreviewCard species={mockSpecies} compact />
      );

      // Compact card doesn't use Card component, uses a div with bg-muted/50
      expect(container.querySelector(".bg-muted\\/50")).toBeInTheDocument();
    });

    it("should render common name in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
    });

    it("should render scientific name in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.getByText("Epipremnum aureum")).toBeInTheDocument();
    });

    it("should render light needs in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.getByText("Bright indirect light")).toBeInTheDocument();
    });

    it("should render water frequency in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.getByText("Weekly, when top inch is dry")).toBeInTheDocument();
    });

    it("should render Indoor badge in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.getByText("Indoor")).toBeInTheDocument();
    });

    it("should NOT render description in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      // Full card shows description, compact does not
      expect(
        screen.queryByText("A popular trailing houseplant known for its hardiness.")
      ).not.toBeInTheDocument();
    });

    it("should NOT render humidity label in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.queryByText("Humidity")).not.toBeInTheDocument();
    });

    it("should NOT render temperature label in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.queryByText("Temperature")).not.toBeInTheDocument();
    });

    it("should NOT render toxicity warning in compact mode", () => {
      render(<SpeciesPreviewCard species={mockSpecies} compact />);

      expect(screen.queryByText("Toxic to pets")).not.toBeInTheDocument();
    });
  });

  describe("optional fields", () => {
    it("should render without scientific name", () => {
      const speciesWithoutScientific: SpeciesData = {
        ...mockSpecies,
        scientificName: null,
      };

      render(<SpeciesPreviewCard species={speciesWithoutScientific} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Epipremnum aureum")).not.toBeInTheDocument();
    });

    it("should render without description", () => {
      const speciesWithoutDescription: SpeciesData = {
        ...mockSpecies,
        description: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutDescription} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(
        screen.queryByText("A popular trailing houseplant known for its hardiness.")
      ).not.toBeInTheDocument();
    });

    it("should render without light needs", () => {
      const speciesWithoutLight: SpeciesData = {
        ...mockSpecies,
        lightNeeds: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutLight} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Light")).not.toBeInTheDocument();
    });

    it("should render without water frequency", () => {
      const speciesWithoutWater: SpeciesData = {
        ...mockSpecies,
        waterFrequency: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutWater} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Water")).not.toBeInTheDocument();
    });

    it("should render without humidity", () => {
      const speciesWithoutHumidity: SpeciesData = {
        ...mockSpecies,
        humidity: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutHumidity} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Humidity")).not.toBeInTheDocument();
    });

    it("should render without temperature", () => {
      const speciesWithoutTemp: SpeciesData = {
        ...mockSpecies,
        temperature: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutTemp} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Temperature")).not.toBeInTheDocument();
    });

    it("should render without toxicity", () => {
      const speciesWithoutToxicity: SpeciesData = {
        ...mockSpecies,
        toxicity: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutToxicity} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Toxic to pets")).not.toBeInTheDocument();
    });

    it("should render without suitableFor", () => {
      const speciesWithoutSuitable: SpeciesData = {
        ...mockSpecies,
        suitableFor: undefined,
      };

      render(<SpeciesPreviewCard species={speciesWithoutSuitable} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Indoor")).not.toBeInTheDocument();
      expect(screen.queryByText("Outdoor")).not.toBeInTheDocument();
    });
  });

  describe("minimal species data", () => {
    it("should render with only required fields", () => {
      const minimalSpecies: SpeciesData = {
        id: "1",
        commonName: "Unknown Plant",
        scientificName: null,
      };

      render(<SpeciesPreviewCard species={minimalSpecies} />);

      expect(screen.getByText("Unknown Plant")).toBeInTheDocument();
    });

    it("should render compact mode with only required fields", () => {
      const minimalSpecies: SpeciesData = {
        id: "1",
        commonName: "Unknown Plant",
        scientificName: null,
      };

      render(<SpeciesPreviewCard species={minimalSpecies} compact />);

      expect(screen.getByText("Unknown Plant")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty suitableFor array", () => {
      const speciesWithEmptyArray: SpeciesData = {
        ...mockSpecies,
        suitableFor: [],
      };

      render(<SpeciesPreviewCard species={speciesWithEmptyArray} />);

      expect(screen.getByText("Golden Pothos")).toBeInTheDocument();
      expect(screen.queryByText("Indoor")).not.toBeInTheDocument();
      expect(screen.queryByText("Outdoor")).not.toBeInTheDocument();
    });

    it("should handle very long text values", () => {
      const speciesWithLongText: SpeciesData = {
        ...mockSpecies,
        description: "A".repeat(500),
        lightNeeds: "B".repeat(100),
      };

      render(<SpeciesPreviewCard species={speciesWithLongText} />);

      expect(screen.getByText("A".repeat(500))).toBeInTheDocument();
      expect(screen.getByText("B".repeat(100))).toBeInTheDocument();
    });

    it("should handle special characters in text", () => {
      const speciesWithSpecialChars: SpeciesData = {
        ...mockSpecies,
        commonName: "Plant & Succulent <Test>",
        toxicity: "Toxic to pets & children (be careful!)",
      };

      render(<SpeciesPreviewCard species={speciesWithSpecialChars} />);

      expect(screen.getByText("Plant & Succulent <Test>")).toBeInTheDocument();
      expect(
        screen.getByText("Toxic to pets & children (be careful!)")
      ).toBeInTheDocument();
    });

    it("should handle unicode characters", () => {
      const speciesWithUnicode: SpeciesData = {
        ...mockSpecies,
        commonName: "Plante Vérte 植物",
        description: "Une plante très jolie 🌿",
      };

      render(<SpeciesPreviewCard species={speciesWithUnicode} />);

      expect(screen.getByText("Plante Vérte 植物")).toBeInTheDocument();
      expect(screen.getByText("Une plante très jolie 🌿")).toBeInTheDocument();
    });
  });
});
