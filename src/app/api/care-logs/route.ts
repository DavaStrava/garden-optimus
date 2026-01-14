import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { plantId, type, amount, notes } = body;

    if (!plantId || !type) {
      return NextResponse.json(
        { error: "Plant ID and care type are required" },
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

    const careLog = await prisma.careLog.create({
      data: {
        plantId,
        type,
        amount: amount || null,
        notes: notes || null,
      },
    });

    // Update plant's updatedAt
    await prisma.plant.update({
      where: { id: plantId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(careLog, { status: 201 });
  } catch (error) {
    console.error("Error creating care log:", error);
    return NextResponse.json(
      { error: "Failed to create care log" },
      { status: 500 }
    );
  }
}
