import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const plant = await prisma.plant.findFirst({
    where: { id, userId: session.user.id },
    include: {
      species: true,
      photos: { orderBy: { createdAt: "desc" } },
      careLogs: { orderBy: { loggedAt: "desc" }, take: 10 },
      assessments: { orderBy: { assessedAt: "desc" }, take: 5 },
    },
  });

  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  return NextResponse.json(plant);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existingPlant = await prisma.plant.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existingPlant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, nickname, speciesId, location, area, acquiredAt, notes } = body;

    const plant = await prisma.plant.update({
      where: { id },
      data: {
        name,
        nickname: nickname || null,
        speciesId: speciesId || null,
        location,
        area: area || null,
        acquiredAt: acquiredAt ? new Date(acquiredAt) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(plant);
  } catch (error) {
    console.error("Error updating plant:", error);
    return NextResponse.json(
      { error: "Failed to update plant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existingPlant = await prisma.plant.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existingPlant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  try {
    await prisma.plant.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plant:", error);
    return NextResponse.json(
      { error: "Failed to delete plant" },
      { status: 500 }
    );
  }
}
