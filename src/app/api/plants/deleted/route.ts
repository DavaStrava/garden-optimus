import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getDaysUntilPermanentDelete } from "@/lib/soft-delete";

/**
 * GET /api/plants/deleted
 * List all deleted (trashed) plants for the current user.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedPlants = await prisma.plant.findMany({
    where: {
      userId: session.user.id,
      deletedAt: { not: null },
    },
    include: {
      species: true,
      photos: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { deletedAt: "desc" },
  });

  // Add days until permanent deletion info
  const plantsWithExpiration = deletedPlants.map((plant) => ({
    ...plant,
    daysUntilPermanentDelete: getDaysUntilPermanentDelete(plant.deletedAt!),
  }));

  return NextResponse.json(plantsWithExpiration);
}
