import Fuse from "fuse.js";

export interface SpeciesMatch {
  id: string;
  commonName: string;
  scientificName: string | null;
  score: number;
  confidence: "high" | "medium" | "low";
}

export interface PlantSpeciesData {
  id: string;
  commonName: string;
  scientificName: string | null;
  description?: string | null;
}

const COMMON_ALIASES: Record<string, string[]> = {
  "pothos": ["devil's ivy", "golden pothos", "epipremnum aureum"],
  "monstera": ["swiss cheese plant", "monstera deliciosa", "split-leaf philodendron"],
  "snake plant": ["sansevieria", "mother-in-law's tongue", "dracaena trifasciata"],
  "zz plant": ["zamioculcas zamiifolia", "zanzibar gem"],
  "peace lily": ["spathiphyllum"],
  "spider plant": ["chlorophytum comosum", "airplane plant"],
  "rubber plant": ["ficus elastica", "rubber tree"],
  "fiddle leaf fig": ["ficus lyrata"],
  "philodendron": ["heartleaf philodendron"],
  "aloe vera": ["aloe", "medicinal aloe"],
  "jade plant": ["crassula ovata", "money plant", "lucky plant"],
  "boston fern": ["nephrolepis exaltata", "sword fern"],
  "english ivy": ["hedera helix", "common ivy"],
  "chinese evergreen": ["aglaonema"],
  "dracaena": ["corn plant", "dragon tree"],
  "calathea": ["prayer plant", "peacock plant"],
  "croton": ["codiaeum variegatum"],
  "schefflera": ["umbrella tree", "umbrella plant"],
  "dieffenbachia": ["dumb cane"],
  "anthurium": ["flamingo flower", "laceleaf"],
};

/**
 * Creates a Fuse.js instance for fuzzy searching plant species
 */
export function createSpeciesFuse(species: PlantSpeciesData[]): Fuse<PlantSpeciesData> {
  return new Fuse(species, {
    keys: [
      { name: "commonName", weight: 0.7 },
      { name: "scientificName", weight: 0.3 },
      // Description removed from search keys - too noisy and pollutes results
    ],
    threshold: 0.35, // Balanced threshold for good relevance
    includeScore: true,
    ignoreLocation: true, // Allow matches anywhere in string (e.g., "rose" matches "Nootka Rose")
    minMatchCharLength: 2,
  });
}

/**
 * Normalizes a species name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

/**
 * Checks if the AI-identified name matches any known aliases
 */
function findAliasMatch(aiName: string): string | null {
  const normalized = normalizeName(aiName);

  for (const [canonical, aliases] of Object.entries(COMMON_ALIASES)) {
    if (normalizeName(canonical) === normalized) {
      return canonical;
    }
    for (const alias of aliases) {
      if (normalizeName(alias) === normalized) {
        return canonical;
      }
    }
  }

  return null;
}

/**
 * Calculates confidence level based on match score
 */
function getConfidence(score: number): "high" | "medium" | "low" {
  if (score <= 0.1) return "high";
  if (score <= 0.3) return "medium";
  return "low";
}

/**
 * Matches an AI-identified species name to the database species
 * Returns up to 3 matches sorted by confidence
 */
export function matchSpeciesToDatabase(
  aiIdentification: { species: string; scientificName?: string },
  species: PlantSpeciesData[],
  maxResults: number = 3
): SpeciesMatch[] {
  const fuse = createSpeciesFuse(species);
  const matches: SpeciesMatch[] = [];
  const seenIds = new Set<string>();

  // First, try exact or alias match on the common name
  const aliasMatch = findAliasMatch(aiIdentification.species);
  const searchTerms = [
    aiIdentification.species,
    aiIdentification.scientificName,
    aliasMatch,
  ].filter(Boolean) as string[];

  for (const term of searchTerms) {
    const results = fuse.search(term, { limit: maxResults });

    for (const result of results) {
      if (!seenIds.has(result.item.id)) {
        seenIds.add(result.item.id);
        const score = result.score ?? 0.5;
        matches.push({
          id: result.item.id,
          commonName: result.item.commonName,
          scientificName: result.item.scientificName,
          score,
          confidence: getConfidence(score),
        });
      }
    }
  }

  // Sort by score (lower is better) and limit results
  return matches
    .sort((a, b) => a.score - b.score)
    .slice(0, maxResults);
}

/**
 * Searches species by query string for the combobox
 */
export function searchSpecies(
  query: string,
  species: PlantSpeciesData[],
  maxResults: number = 10
): PlantSpeciesData[] {
  if (!query || query.length < 2) {
    return species.slice(0, maxResults);
  }

  const fuse = createSpeciesFuse(species);
  const results = fuse.search(query, { limit: maxResults });

  return results.map((r) => r.item);
}
