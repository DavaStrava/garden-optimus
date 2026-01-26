import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/plants/[id]/restore
 * Restore a deleted plant from trash.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the deleted plant owned by this user
  const deletedPlant = await prisma.plant.findFirst({
    where: {
      id,
      userId: session.user.id,
      deletedAt: { not: null },
    },
  });

  if (!deletedPlant) {
    return NextResponse.json(
      { error: "Deleted plant not found" },
      { status: 404 }
    );
  }

  try {
    // Restore by clearing deletedAt
    const restoredPlant = await prisma.plant.update({
      where: { id },
      data: { deletedAt: null },
    });

    return NextResponse.json(restoredPlant);
  } catch (error) {
    console.error("Error restoring plant:", error);
    return NextResponse.json(
      { error: "Failed to restore plant" },
      { status: 500 }
    );
  }
}
