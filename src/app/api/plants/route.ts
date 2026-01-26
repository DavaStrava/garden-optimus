import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadPhoto, generatePhotoFilename } from "@/lib/storage";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plants = await prisma.plant.findMany({
    where: { userId: session.user.id },
    include: {
      species: true,
      photos: { take: 1, orderBy: { createdAt: "desc" } },
      _count: { select: { careLogs: true, assessments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(plants);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let name: string;
    let nickname: string | null;
    let speciesId: string | null;
    let location: string;
    let area: string | null;
    let acquiredAt: string | null;
    let notes: string | null;
    let identificationPhoto: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (with potential photo)
      const formData = await request.formData();
      const dataString = formData.get("data") as string;
      let body;
      try {
        body = JSON.parse(dataString);
      } catch {
        return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
      }
      name = body.name;
      nickname = body.nickname;
      speciesId = body.speciesId;
      location = body.location;
      area = body.area;
      acquiredAt = body.acquiredAt;
      notes = body.notes;
      identificationPhoto = formData.get("identificationPhoto") as File | null;
    } else {
      // Handle JSON (no photo)
      const body = await request.json();
      name = body.name;
      nickname = body.nickname;
      speciesId = body.speciesId;
      location = body.location;
      area = body.area;
      acquiredAt = body.acquiredAt;
      notes = body.notes;
    }

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    if (!["INDOOR", "OUTDOOR"].includes(location)) {
      return NextResponse.json(
        { error: "Invalid location. Must be INDOOR or OUTDOOR" },
        { status: 400 }
      );
    }

    const plant = await prisma.plant.create({
      data: {
        name,
        nickname: nickname || null,
        speciesId: speciesId || null,
        location: location as "INDOOR" | "OUTDOOR",
        area: area || null,
        acquiredAt: acquiredAt ? new Date(acquiredAt) : null,
        notes: notes || null,
        userId: session.user.id,
      },
    });

    // Save identification photo if provided
    if (identificationPhoto && identificationPhoto.size > 0) {
      try {
        const buffer = Buffer.from(await identificationPhoto.arrayBuffer());
        const filename = generatePhotoFilename(plant.id, identificationPhoto.type, "id-");
        const url = await uploadPhoto(buffer, filename);

        await prisma.plantPhoto.create({
          data: {
            plantId: plant.id,
            url,
            caption: "Identification photo",
          },
        });
      } catch (photoError) {
        // Log error but don't fail the plant creation
        console.error("Error saving identification photo:", photoError);
      }
    }

    return NextResponse.json(plant, { status: 201 });
  } catch (error) {
    console.error("Error creating plant:", error);
    return NextResponse.json(
      { error: "Failed to create plant" },
      { status: 500 }
    );
  }
}
