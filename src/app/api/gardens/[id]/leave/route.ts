import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/gardens/[id]/leave
 * Leave a garden (for members only, not owners).
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

  try {
    // Check if user is the owner
    const garden = await prisma.garden.findUnique({
      where: { id: gardenId },
      select: { ownerId: true },
    });

    if (!garden) {
      return NextResponse.json(
        { error: "Garden not found" },
        { status: 404 }
      );
    }

    if (garden.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "As the owner, you cannot leave the garden. Transfer ownership or delete it instead." },
        { status: 400 }
      );
    }

    // Find and delete the membership
    const membership = await prisma.gardenMember.findUnique({
      where: {
        gardenId_userId: {
          gardenId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this garden" },
        { status: 404 }
      );
    }

    await prisma.gardenMember.delete({
      where: { id: membership.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving garden:", error);
    return NextResponse.json(
      { error: "Failed to leave garden" },
      { status: 500 }
    );
  }
}
