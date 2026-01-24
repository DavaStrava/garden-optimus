/**
 * Shared species type definitions used across the application
 */

export interface SpeciesData {
  id: string;
  commonName: string;
  scientificName: string | null;
  description?: string | null;
  lightNeeds?: string;
  waterFrequency?: string;
  humidity?: string | null;
  temperature?: string | null;
  toxicity?: string | null;
  careNotes?: string | null;
  suitableFor?: ("INDOOR" | "OUTDOOR")[];
  imageUrl?: string | null;
}

export interface SpeciesMatch extends SpeciesData {
  matchScore?: number;
  matchConfidence?: "high" | "medium" | "low";
}

export interface AIIdentification {
  species: string;
  scientificName: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  careHints?: {
    lightNeeds?: string;
    waterFrequency?: string;
    humidity?: string;
  };
}

export interface IdentificationResult {
  identification: AIIdentification;
  matches: SpeciesMatch[];
  alternativeIdentifications?: Array<{
    species: string;
    scientificName: string | null;
  }>;
}
