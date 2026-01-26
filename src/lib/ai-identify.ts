import Anthropic from "@anthropic-ai/sdk";

/**
 * AI Plant Identification Module
 *
 * This module uses Claude Opus 4.5 with Extended Thinking to identify plants from images.
 *
 * ## Why Extended Thinking?
 *
 * Without extended thinking, the model must immediately output structured JSON,
 * which forces quick (often incorrect) classifications. For example, a Baby Rubber
 * Plant (Peperomia) was consistently misidentified as various Pothos varieties
 * because the model couldn't deliberate before answering.
 *
 * With extended thinking enabled, the model gets an internal "thinking budget"
 * to reason through the identification:
 * - Examine leaf shape, thickness, and texture
 * - Consider growth habit (compact vs vining)
 * - Note presence/absence of aerial roots
 * - Compare against similar species
 * - Rule out incorrect matches
 *
 * This deliberation significantly improves accuracy for visually similar plants.
 *
 * ## Model Choice
 *
 * Claude Opus 4.5 is used instead of Sonnet for better visual analysis accuracy.
 * The cost increase (~5x) is acceptable given the rate limit of 10 identifications
 * per hour per user and the significant accuracy improvement.
 */

// Lazily initialize the Anthropic client to ensure env vars are loaded
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export interface PlantIdentification {
  species: string;
  scientificName: string | null;
  confidence: "high" | "medium" | "low";
  alternativeMatches: Array<{
    species: string;
    scientificName: string | null;
  }>;
  reasoning: string;
  careHints?: {
    lightNeeds?: string;
    waterFrequency?: string;
    humidity?: string;
  };
}

export interface IdentificationResult {
  success: boolean;
  identification?: PlantIdentification;
  error?: string;
}

interface ImageInput {
  base64: string;
  mimeType: string;
}

/**
 * Identifies a plant from one or more images using Claude Vision API
 */
export async function identifyPlantFromImage(
  imageBase64: string,
  mimeType: string
): Promise<IdentificationResult> {
  return identifyPlantFromImages([{ base64: imageBase64, mimeType }]);
}

/**
 * Identifies a plant from multiple images using Claude Vision API
 */
export async function identifyPlantFromImages(
  images: ImageInput[]
): Promise<IdentificationResult> {
  if (images.length === 0) {
    return { success: false, error: "No images provided" };
  }

  try {
    type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Build content array with images followed by text prompt
    const content: Array<
      | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
      | { type: "text"; text: string }
    > = [];

    // Add all images
    for (const image of images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mimeType as ImageMediaType,
          data: image.base64,
        },
      });
    }

    // Add the prompt text
    const jsonFormat = `Return ONLY valid JSON (no markdown):
{
  "species": "Common Name",
  "scientificName": "Scientific name or null",
  "confidence": "high" or "medium" or "low",
  "alternativeMatches": [{"species": "Name", "scientificName": "Name or null"}],
  "reasoning": "Why you identified it this way",
  "careHints": {"lightNeeds": "...", "waterFrequency": "...", "humidity": "..."}
}`;

    const promptText = images.length > 1
      ? `Identify this plant. Here are ${images.length} photos of it.\n\n${jsonFormat}`
      : `Identify this plant.\n\n${jsonFormat}`;

    content.push({ type: "text", text: promptText });

    // Use Opus 4.5 with extended thinking for accurate plant identification.
    // The thinking budget allows the model to reason through visual features
    // before outputting the JSON response. Without this, the model often
    // misidentifies similar-looking plants (e.g., Peperomia vs Pothos).
    const message = await getAnthropicClient().messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 6000, // Must be > budget_tokens when using extended thinking
      thinking: {
        type: "enabled",
        budget_tokens: 5000,
      },
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Extended thinking returns multiple content blocks: thinking blocks (internal)
    // and text blocks (the actual response). We only need the text block with JSON.
    const textBlock = message.content.find((block) => block.type === "text");
    const responseText = textBlock?.type === "text" ? textBlock.text : "";

    if (!responseText) {
      return {
        success: false,
        error: "AI returned no response. Please try again.",
      };
    }

    // Parse JSON response
    try {
      // Clean up response - remove any markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      const parsed = JSON.parse(jsonText);

      const identification: PlantIdentification = {
        species: parsed.species || "Unknown",
        scientificName: parsed.scientificName || null,
        confidence: parsed.confidence || "low",
        alternativeMatches: Array.isArray(parsed.alternativeMatches)
          ? parsed.alternativeMatches.slice(0, 3).map((m: { species?: string; scientificName?: string }) => ({
              species: m.species || "Unknown",
              scientificName: m.scientificName || null,
            }))
          : [],
        reasoning: parsed.reasoning || "No reasoning provided",
        careHints: parsed.careHints,
      };

      return {
        success: true,
        identification,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", responseText);

      return {
        success: false,
        error: "Failed to parse plant identification. Please try again with a clearer photo.",
      };
    }
  } catch (error) {
    console.error("Plant identification error:", error);

    if (error instanceof Error) {
      if (error.message.includes("ANTHROPIC_API_KEY")) {
        return {
          success: false,
          error: "AI service is not configured. Please contact support.",
        };
      }
      if (error.message.includes("rate_limit")) {
        return {
          success: false,
          error: "Too many identification requests. Please wait a moment and try again.",
        };
      }
      if (error.message.includes("invalid_api_key") || error.message.includes("authentication")) {
        return {
          success: false,
          error: "AI service configuration error. Please contact support.",
        };
      }
    }

    return {
      success: false,
      error: "Failed to identify plant. Please try again.",
    };
  }
}
