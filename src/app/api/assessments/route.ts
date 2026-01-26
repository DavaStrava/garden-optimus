import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { assessPlantHealth } from "@/lib/ai";
import {
  uploadPhoto,
  generatePhotoFilename,
  validateImageFile,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/storage";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const plantId = formData.get("plantId") as string;

    if (!file || !plantId) {
      return NextResponse.json(
        { error: "File and plant ID are required" },
        { status: 400 }
      );
    }

    // Validate file (exclude HEIC for Claude Vision compatibility)
    const allowedForVision = ALLOWED_IMAGE_TYPES.filter((t) => t !== "image/heic");
    if (!allowedForVision.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    const validationError = validateImageFile(file);
    if (validationError && !validationError.includes("HEIC")) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Verify plant ownership (only non-deleted plants)
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: session.user.id, deletedAt: null },
    });

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    // Read file as buffer once - reuse for both AI analysis and upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Determine mime type
    const mimeType = file.type || "image/jpeg";

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured. Please add ANTHROPIC_API_KEY to your environment." },
        { status: 503 }
      );
    }

    // Get AI assessment
    const assessment = await assessPlantHealth(base64, mimeType);

    // Upload photo using storage abstraction - pass buffer to avoid re-reading
    const filename = generatePhotoFilename(plantId, file.type, "assessment-");
    const photoUrl = await uploadPhoto(buffer, filename);

    // Save assessment to database
    const savedAssessment = await prisma.healthAssessment.create({
      data: {
        plantId,
        photoUrl,
        healthStatus: assessment.healthStatus,
        issues: assessment.issues,
        recommendations: assessment.recommendations,
        rawResponse: assessment.rawResponse,
      },
    });

    // Also save as a plant photo
    await prisma.plantPhoto.create({
      data: {
        plantId,
        url: photoUrl,
        caption: `Health assessment: ${assessment.healthStatus}`,
      },
    });

    return NextResponse.json(savedAssessment, { status: 201 });
  } catch (error) {
    console.error("Error creating assessment:", error);
    return NextResponse.json(
      { error: "Failed to analyze plant. Please try again." },
      { status: 500 }
    );
  }
}
