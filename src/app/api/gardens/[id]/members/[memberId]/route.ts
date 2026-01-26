import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserGardenRole, hasPermission } from "@/lib/garden-permissions";

/**
 * PUT /api/gardens/[id]/members/[memberId]
 * Update a member's role.
 * Requires OWNER role.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gardenId, memberId } = await params;

  // Check user has permission to manage members (only owner)
  const role = await getUserGardenRole(session.user.id, gardenId);

  if (!role || !hasPermission(role, "manage_members")) {
    return NextResponse.json(
      { error: "Only the garden owner can manage members" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { role: newRole } = body;

    // Validate role
    if (!["VIEWER", "ADMIN"].includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be VIEWER or ADMIN" },
        { status: 400 }
      );
    }

    // Find the member
    const member = await prisma.gardenMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.gardenId !== gardenId) {
      return NextResponse.json(
        { error: "Member not found in this garden" },
        { status: 404 }
      );
    }

    // Update the member's role
    const updatedMember = await prisma.gardenMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gardens/[id]/members/[memberId]
 * Remove a member from the garden.
 * Requires OWNER role.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gardenId, memberId } = await params;

  // Check user has permission to manage members (only owner)
  const role = await getUserGardenRole(session.user.id, gardenId);

  if (!role || !hasPermission(role, "manage_members")) {
    return NextResponse.json(
      { error: "Only the garden owner can remove members" },
      { status: 403 }
    );
  }

  try {
    // Find the member
    const member = await prisma.gardenMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.gardenId !== gardenId) {
      return NextResponse.json(
        { error: "Member not found in this garden" },
        { status: 404 }
      );
    }

    // Remove the member
    await prisma.gardenMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
