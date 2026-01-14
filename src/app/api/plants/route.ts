import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    const body = await request.json();
    const { name, nickname, speciesId, location, area, acquiredAt, notes } = body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    const plant = await prisma.plant.create({
      data: {
        name,
        nickname: nickname || null,
        speciesId: speciesId || null,
        location,
        area: area || null,
        acquiredAt: acquiredAt ? new Date(acquiredAt) : null,
        notes: notes || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(plant, { status: 201 });
  } catch (error) {
    console.error("Error creating plant:", error);
    return NextResponse.json(
      { error: "Failed to create plant" },
      { status: 500 }
    );
  }
}
