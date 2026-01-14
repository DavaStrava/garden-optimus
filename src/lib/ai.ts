import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PlantAssessment {
  healthStatus: string;
  issues: string | null;
  recommendations: string | null;
  rawResponse: string;
}

export async function assessPlantHealth(
  imageBase64: string,
  mimeType: string
): Promise<PlantAssessment> {
  const message = await anthropic.messages.create({
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
            text: `You are a plant health expert. Analyze this plant image and provide:

1. **Health Status**: One of "Healthy", "Needs attention", or "Critical"
2. **Issues Identified**: List any visible problems (yellowing leaves, pests, disease, overwatering signs, underwatering signs, nutrient deficiency, etc.). If none, say "No visible issues"
3. **Care Recommendations**: Specific actionable advice to improve or maintain the plant's health

Please be concise but thorough. Format your response exactly as:
HEALTH STATUS: [status]
ISSUES: [issues or "No visible issues"]
RECOMMENDATIONS: [your recommendations]`,
          },
        ],
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse the response
  const healthStatusMatch = responseText.match(
    /HEALTH STATUS:\s*(Healthy|Needs attention|Critical)/i
  );
  const issuesMatch = responseText.match(/ISSUES:\s*([^\n]+(?:\n(?!RECOMMENDATIONS:)[^\n]+)*)/i);
  const recommendationsMatch = responseText.match(
    /RECOMMENDATIONS:\s*([\s\S]+)/i
  );

  const healthStatus = healthStatusMatch
    ? healthStatusMatch[1]
    : "Needs attention";
  const issues = issuesMatch
    ? issuesMatch[1].trim()
    : null;
  const recommendations = recommendationsMatch
    ? recommendationsMatch[1].trim()
    : null;

  return {
    healthStatus,
    issues: issues === "No visible issues" ? null : issues,
    recommendations,
    rawResponse: responseText,
  };
}
