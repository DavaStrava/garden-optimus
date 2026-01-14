import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { assessPlantHealth } from "@/lib/ai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Allowed image MIME types (must match Claude Vision supported types)
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Map MIME types to file extensions for safety
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Verify plant ownership
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: session.user.id },
    });

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    // Read file as buffer
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

    // Save the photo
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Use safe extension from MIME type
    const ext = MIME_TO_EXT[file.type] || ".jpg";
    const filename = `assessment-${plantId}-${Date.now()}${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    const photoUrl = `/uploads/${filename}`;

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
