import Anthropic from "@anthropic-ai/sdk";

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

/**
 * Identifies a plant from an image using Claude Vision API
 */
export async function identifyPlantFromImage(
  imageBase64: string,
  mimeType: string
): Promise<IdentificationResult> {
  try {
    const message = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `You are a plant identification expert. Analyze this plant photo and identify the species.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "species": "Common Name",
  "scientificName": "Scientific name or null if unknown",
  "confidence": "high" or "medium" or "low",
  "alternativeMatches": [
    {"species": "Alternative 1", "scientificName": "Scientific name 1"},
    {"species": "Alternative 2", "scientificName": "Scientific name 2"}
  ],
  "reasoning": "Brief explanation of how you identified this plant (key features observed)",
  "careHints": {
    "lightNeeds": "e.g., Bright indirect light",
    "waterFrequency": "e.g., Weekly, when top inch is dry",
    "humidity": "e.g., Average to high"
  }
}

Focus on common houseplants, garden plants, herbs, and vegetables.
If you cannot identify the plant with any confidence, return:
{
  "species": "Unknown",
  "scientificName": null,
  "confidence": "low",
  "alternativeMatches": [],
  "reasoning": "Unable to identify - explain why (blurry image, unusual angle, etc.)"
}`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

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
