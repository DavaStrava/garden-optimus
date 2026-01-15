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

    // Use transaction to ensure all updates succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Create care log
      const careLog = await tx.careLog.create({
        data: {
          plantId,
          type,
          amount: amount || null,
          notes: notes || null,
        },
      });

      // Update plant's updatedAt
      await tx.plant.update({
        where: { id: plantId },
        data: { updatedAt: new Date() },
      });

      // Update care schedule if one exists for this care type
      const existingSchedule = await tx.careSchedule.findUnique({
        where: {
          plantId_careType: {
            plantId,
            careType: type,
          },
        },
      });

      if (existingSchedule) {
        const now = new Date();
        const nextDueDate = new Date(
          now.getTime() + existingSchedule.intervalDays * 24 * 60 * 60 * 1000
        );
        nextDueDate.setHours(0, 0, 0, 0); // Reset to start of day

        await tx.careSchedule.update({
          where: { id: existingSchedule.id },
          data: {
            lastCaredAt: now,
            nextDueDate,
          },
        });
      }

      return careLog;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating care log:", error);
    return NextResponse.json(
      { error: "Failed to create care log" },
      { status: 500 }
    );
  }
}
