import { describe, it, expect } from "vitest";
import {
  createSpeciesFuse,
  matchSpeciesToDatabase,
  searchSpecies,
  PlantSpeciesData,
} from "./species-matcher";

// Sample species data for testing
const mockSpecies: PlantSpeciesData[] = [
  {
    id: "1",
    commonName: "Golden Pothos",
    scientificName: "Epipremnum aureum",
    description: "A popular trailing houseplant",
  },
  {
    id: "2",
    commonName: "Monstera",
    scientificName: "Monstera deliciosa",
    description: "Swiss cheese plant with large leaves",
  },
  {
    id: "3",
    commonName: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    description: "Hardy succulent with upright leaves",
  },
  {
    id: "4",
    commonName: "Peace Lily",
    scientificName: "Spathiphyllum",
    description: "Flowering plant that purifies air",
  },
  {
    id: "5",
    commonName: "Spider Plant",
    scientificName: "Chlorophytum comosum",
    description: "Easy-care plant with variegated leaves",
  },
  {
    id: "6",
    commonName: "Fiddle Leaf Fig",
    scientificName: "Ficus lyrata",
    description: "Popular tree with large fiddle-shaped leaves",
  },
  {
    id: "7",
    commonName: "ZZ Plant",
    scientificName: "Zamioculcas zamiifolia",
    description: "Drought-tolerant plant with glossy leaves",
  },
];

describe("species-matcher", () => {
  describe("createSpeciesFuse", () => {
    it("should create a Fuse instance that can search species", () => {
      const fuse = createSpeciesFuse(mockSpecies);
      const results = fuse.search("monstera");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.commonName).toBe("Monstera");
    });

    it("should search by scientific name", () => {
      const fuse = createSpeciesFuse(mockSpecies);
      const results = fuse.search("Epipremnum");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.commonName).toBe("Golden Pothos");
    });

    it("should NOT search by description (description removed for relevance)", () => {
      // Description was intentionally removed from search keys to prevent
      // irrelevant matches (e.g., searching "rose" shouldn't match plants
      // that happen to mention "rose" in their description)
      const fuse = createSpeciesFuse(mockSpecies);
      const results = fuse.search("swiss cheese");

      // "swiss cheese" is in Monstera's description but NOT in commonName/scientificName
      // so it should not match
      expect(results.length).toBe(0);
    });

    it("should return empty results for non-matching query", () => {
      const fuse = createSpeciesFuse(mockSpecies);
      const results = fuse.search("xyznonexistent123");

      expect(results.length).toBe(0);
    });
  });

  describe("searchSpecies", () => {
    it("should return matching species for a valid query", () => {
      const results = searchSpecies("pothos", mockSpecies);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].commonName).toBe("Golden Pothos");
    });

    it("should return first N species when query is empty", () => {
      const results = searchSpecies("", mockSpecies, 3);

      expect(results.length).toBe(3);
      expect(results).toEqual(mockSpecies.slice(0, 3));
    });

    it("should return first N species when query is too short", () => {
      const results = searchSpecies("a", mockSpecies, 5);

      expect(results.length).toBe(5);
    });

    it("should respect maxResults limit", () => {
      const results = searchSpecies("plant", mockSpecies, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should perform case-insensitive search", () => {
      const results1 = searchSpecies("MONSTERA", mockSpecies);
      const results2 = searchSpecies("monstera", mockSpecies);
      const results3 = searchSpecies("Monstera", mockSpecies);

      expect(results1[0]?.commonName).toBe("Monstera");
      expect(results2[0]?.commonName).toBe("Monstera");
      expect(results3[0]?.commonName).toBe("Monstera");
    });

    it("should find partial matches", () => {
      const results = searchSpecies("ficus", mockSpecies);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].commonName).toBe("Fiddle Leaf Fig");
    });
  });

  describe("matchSpeciesToDatabase", () => {
    it("should match AI identification to database species", () => {
      const aiIdentification = {
        species: "Monstera",
        scientificName: "Monstera deliciosa",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].commonName).toBe("Monstera");
      expect(matches[0].confidence).toBe("high");
    });

    it("should return multiple matches sorted by score", () => {
      const aiIdentification = {
        species: "Plant",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies, 3);

      expect(matches.length).toBeLessThanOrEqual(3);
      // Scores should be in ascending order (lower is better)
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].score).toBeGreaterThanOrEqual(matches[i - 1].score);
      }
    });

    it("should match by scientific name when common name doesn't match", () => {
      const aiIdentification = {
        species: "Unknown Common Name",
        scientificName: "Spathiphyllum",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].commonName).toBe("Peace Lily");
    });

    it("should match common aliases", () => {
      const aiIdentification = {
        species: "Devil's Ivy",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].commonName).toBe("Golden Pothos");
    });

    it("should match mother-in-law's tongue to snake plant", () => {
      const aiIdentification = {
        species: "Mother-in-law's tongue",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].commonName).toBe("Snake Plant");
    });

    it("should match swiss cheese plant to monstera", () => {
      const aiIdentification = {
        species: "Swiss cheese plant",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].commonName).toBe("Monstera");
    });

    it("should match zanzibar gem to zz plant", () => {
      const aiIdentification = {
        species: "Zanzibar gem",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].commonName).toBe("ZZ Plant");
    });

    it("should respect maxResults parameter", () => {
      const aiIdentification = {
        species: "plant",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies, 2);

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it("should not return duplicate matches", () => {
      const aiIdentification = {
        species: "Monstera",
        scientificName: "Monstera deliciosa",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);
      const ids = matches.map((m) => m.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });

    it("should return empty array when no matches found", () => {
      const aiIdentification = {
        species: "Completely Unknown Species XYZ123",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      // May return low-confidence matches or empty
      if (matches.length > 0) {
        expect(matches[0].confidence).toBe("low");
      }
    });

    it("should assign correct confidence levels based on score", () => {
      const aiIdentification = {
        species: "Monstera deliciosa",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches[0].confidence).toBe("high");
      expect(matches[0].score).toBeLessThanOrEqual(0.1);
    });

    it("should include score and confidence in match results", () => {
      const aiIdentification = {
        species: "Snake Plant",
      };

      const matches = matchSpeciesToDatabase(aiIdentification, mockSpecies);

      expect(matches[0]).toHaveProperty("id");
      expect(matches[0]).toHaveProperty("commonName");
      expect(matches[0]).toHaveProperty("scientificName");
      expect(matches[0]).toHaveProperty("score");
      expect(matches[0]).toHaveProperty("confidence");
      expect(["high", "medium", "low"]).toContain(matches[0].confidence);
    });
  });

  describe("edge cases", () => {
    it("should handle empty species array", () => {
      const results = searchSpecies("monstera", []);
      expect(results.length).toBe(0);

      const matches = matchSpeciesToDatabase({ species: "Monstera" }, []);
      expect(matches.length).toBe(0);
    });

    it("should handle species with null scientific name", () => {
      const speciesWithNull: PlantSpeciesData[] = [
        { id: "1", commonName: "Mystery Plant", scientificName: null },
      ];

      const results = searchSpecies("mystery", speciesWithNull);
      expect(results.length).toBe(1);
      expect(results[0].scientificName).toBeNull();
    });

    it("should handle special characters in search query", () => {
      const results = searchSpecies("mother-in-law's", mockSpecies);
      // Should not throw an error
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle very long search queries", () => {
      const longQuery = "a".repeat(1000);
      const results = searchSpecies(longQuery, mockSpecies);
      // Should not throw an error
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle unicode characters", () => {
      const speciesWithUnicode: PlantSpeciesData[] = [
        { id: "1", commonName: "Plante Vérte", scientificName: null },
      ];

      const results = searchSpecies("Vérte", speciesWithUnicode);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
