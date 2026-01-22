import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  uploadPhoto,
  generatePhotoFilename,
  validateImageFile,
} from "@/lib/storage";
import { NextResponse } from "next/server";

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

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Verify plant ownership
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: session.user.id },
    });

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    // Generate filename and upload
    const filename = generatePhotoFilename(plantId, file.type);
    const url = await uploadPhoto(file, filename);

    // Save to database
    const photo = await prisma.plantPhoto.create({
      data: {
        plantId,
        url,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
