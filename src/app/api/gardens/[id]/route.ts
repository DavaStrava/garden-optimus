import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateGardenData } from "@/lib/garden-validation";
import {
  getUserGardenRole,
  hasPermission,
} from "@/lib/garden-permissions";

/**
 * GET /api/gardens/[id]
 * Get a garden with its plants and members.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check user has access to this garden
  const role = await getUserGardenRole(session.user.id, id);

  if (!role) {
    return NextResponse.json({ error: "Garden not found" }, { status: 404 });
  }

  const garden = await prisma.garden.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { invitedAt: "asc" },
      },
      plants: {
        where: { deletedAt: null },
        include: {
          species: true,
          photos: { take: 1, orderBy: { createdAt: "desc" } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          plants: { where: { deletedAt: null } },
          members: true,
        },
      },
    },
  });

  if (!garden) {
    return NextResponse.json({ error: "Garden not found" }, { status: 404 });
  }

  return NextResponse.json({ ...garden, role });
}

/**
 * PUT /api/gardens/[id]
 * Update a garden's name or description.
 * Requires ADMIN or OWNER role.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check user has edit permission
  const role = await getUserGardenRole(session.user.id, id);

  if (!role || !hasPermission(role, "edit_garden")) {
    return NextResponse.json(
      { error: "You don't have permission to edit this garden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    // Validate input
    const errors = validateGardenData({ name, description });
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors[0].message, errors },
        { status: 400 }
      );
    }

    const garden = await prisma.garden.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: {
            plants: { where: { deletedAt: null } },
            members: true,
          },
        },
        owner: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ ...garden, role });
  } catch (error) {
    console.error("Error updating garden:", error);
    return NextResponse.json(
      { error: "Failed to update garden" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gardens/[id]
 * Delete a garden.
 * Requires OWNER role.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check user has delete permission (only owner)
  const role = await getUserGardenRole(session.user.id, id);

  if (!role || !hasPermission(role, "delete_garden")) {
    return NextResponse.json(
      { error: "Only the garden owner can delete the garden" },
      { status: 403 }
    );
  }

  try {
    // Delete the garden (plants will have gardenId set to null via onDelete: SetNull)
    await prisma.garden.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting garden:", error);
    return NextResponse.json(
      { error: "Failed to delete garden" },
      { status: 500 }
    );
  }
}
