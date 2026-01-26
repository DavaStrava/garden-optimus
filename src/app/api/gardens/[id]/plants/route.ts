import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserGardenRole, hasPermission } from "@/lib/garden-permissions";

/**
 * POST /api/gardens/[id]/plants
 * Add a plant to a garden.
 * Requires ADMIN or OWNER role.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gardenId } = await params;

  // Check user has permission to add plants
  const role = await getUserGardenRole(session.user.id, gardenId);

  if (!role || !hasPermission(role, "add_plants")) {
    return NextResponse.json(
      { error: "You don't have permission to add plants to this garden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { plantId } = body;

    if (!plantId) {
      return NextResponse.json(
        { error: "Plant ID is required" },
        { status: 400 }
      );
    }

    // Verify the plant exists and belongs to the current user
    const plant = await prisma.plant.findFirst({
      where: {
        id: plantId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!plant) {
      return NextResponse.json(
        { error: "Plant not found or you don't own it" },
        { status: 404 }
      );
    }

    // Add plant to garden
    const updatedPlant = await prisma.plant.update({
      where: { id: plantId },
      data: { gardenId },
      include: {
        species: true,
        photos: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(updatedPlant);
  } catch (error) {
    console.error("Error adding plant to garden:", error);
    return NextResponse.json(
      { error: "Failed to add plant to garden" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gardens/[id]/plants
 * Remove a plant from a garden.
 * Requires ADMIN or OWNER role.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gardenId } = await params;

  // Check user has permission to remove plants
  const role = await getUserGardenRole(session.user.id, gardenId);

  if (!role || !hasPermission(role, "remove_plants")) {
    return NextResponse.json(
      { error: "You don't have permission to remove plants from this garden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { plantId } = body;

    if (!plantId) {
      return NextResponse.json(
        { error: "Plant ID is required" },
        { status: 400 }
      );
    }

    // Verify the plant is in this garden
    const plant = await prisma.plant.findFirst({
      where: {
        id: plantId,
        gardenId,
        deletedAt: null,
      },
    });

    if (!plant) {
      return NextResponse.json(
        { error: "Plant not found in this garden" },
        { status: 404 }
      );
    }

    // Remove plant from garden (set gardenId to null)
    await prisma.plant.update({
      where: { id: plantId },
      data: { gardenId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing plant from garden:", error);
    return NextResponse.json(
      { error: "Failed to remove plant from garden" },
      { status: 500 }
    );
  }
}
