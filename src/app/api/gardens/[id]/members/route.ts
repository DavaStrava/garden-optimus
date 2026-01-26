import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserGardenRole, hasPermission } from "@/lib/garden-permissions";

/**
 * GET /api/gardens/[id]/members
 * List all members of a garden.
 * Requires VIEWER role or higher.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gardenId } = await params;

  // Check user has access to this garden
  const role = await getUserGardenRole(session.user.id, gardenId);

  if (!role) {
    return NextResponse.json({ error: "Garden not found" }, { status: 404 });
  }

  const members = await prisma.gardenMember.findMany({
    where: { gardenId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { invitedAt: "asc" },
  });

  // Also include the owner
  const garden = await prisma.garden.findUnique({
    where: { id: gardenId },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({
    owner: garden?.owner,
    members,
  });
}

/**
 * POST /api/gardens/[id]/members
 * Invite a new member to the garden by email.
 * Requires OWNER role.
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

  // Check user has permission to manage members (only owner)
  const role = await getUserGardenRole(session.user.id, gardenId);

  if (!role || !hasPermission(role, "manage_members")) {
    return NextResponse.json(
      { error: "Only the garden owner can invite members" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, memberRole = "VIEWER" } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["VIEWER", "ADMIN"].includes(memberRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be VIEWER or ADMIN" },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No user found with this email address" },
        { status: 404 }
      );
    }

    // Check if user is already the owner
    const garden = await prisma.garden.findUnique({
      where: { id: gardenId },
      select: { ownerId: true },
    });

    if (garden?.ownerId === user.id) {
      return NextResponse.json(
        { error: "This user is already the owner of this garden" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.gardenMember.findUnique({
      where: {
        gardenId_userId: {
          gardenId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already a member of this garden" },
        { status: 400 }
      );
    }

    // Add the member
    const member = await prisma.gardenMember.create({
      data: {
        gardenId,
        userId: user.id,
        role: memberRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error inviting member:", error);
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}
