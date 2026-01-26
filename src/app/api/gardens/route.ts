import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateGardenData } from "@/lib/garden-validation";

/**
 * GET /api/gardens
 * List all gardens the user owns or is a member of.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get gardens the user owns
  const ownedGardens = await prisma.garden.findMany({
    where: { ownerId: session.user.id },
    include: {
      _count: {
        select: {
          plants: { where: { deletedAt: null } },
          members: true,
        },
      },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get gardens the user is a member of
  const memberships = await prisma.gardenMember.findMany({
    where: { userId: session.user.id },
    include: {
      garden: {
        include: {
          _count: {
            select: {
              plants: { where: { deletedAt: null } },
              members: true,
            },
          },
          owner: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  // Combine and add role info
  const gardens = [
    ...ownedGardens.map((garden) => ({
      ...garden,
      role: "OWNER" as const,
    })),
    ...memberships.map((m) => ({
      ...m.garden,
      role: m.role,
    })),
  ];

  return NextResponse.json(gardens);
}

/**
 * POST /api/gardens
 * Create a new garden.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Create the garden
    const garden = await prisma.garden.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: session.user.id,
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

    return NextResponse.json({ ...garden, role: "OWNER" }, { status: 201 });
  } catch (error) {
    console.error("Error creating garden:", error);
    return NextResponse.json(
      { error: "Failed to create garden" },
      { status: 500 }
    );
  }
}
