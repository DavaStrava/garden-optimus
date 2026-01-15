import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = await prisma.careSchedule.findUnique({
    where: { id },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
          nickname: true,
          userId: true,
        },
      },
    },
  });

  if (!schedule || schedule.plant.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Schedule not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json({ schedule });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const existing = await prisma.careSchedule.findUnique({
    where: { id },
    include: { plant: { select: { userId: true } } },
  });

  if (!existing || existing.plant.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Schedule not found or access denied" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { intervalDays, nextDueDate, enabled } = body as {
    intervalDays?: number;
    nextDueDate?: string;
    enabled?: boolean;
  };

  const updateData: {
    intervalDays?: number;
    nextDueDate?: Date;
    enabled?: boolean;
  } = {};

  if (typeof intervalDays === "number") {
    // Validate intervalDays range
    if (intervalDays < 1 || intervalDays > 365) {
      return NextResponse.json(
        { error: "intervalDays must be between 1 and 365" },
        { status: 400 }
      );
    }
    updateData.intervalDays = intervalDays;
  }

  if (nextDueDate) {
    const parsedDate = new Date(nextDueDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid nextDueDate format" },
        { status: 400 }
      );
    }
    updateData.nextDueDate = parsedDate;
  }

  if (typeof enabled === "boolean") {
    updateData.enabled = enabled;
  }

  const schedule = await prisma.careSchedule.update({
    where: { id },
    data: updateData,
    include: {
      plant: {
        select: {
          id: true,
          name: true,
          nickname: true,
        },
      },
    },
  });

  return NextResponse.json({ schedule });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const existing = await prisma.careSchedule.findUnique({
    where: { id },
    include: { plant: { select: { userId: true } } },
  });

  if (!existing || existing.plant.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Schedule not found or access denied" },
      { status: 404 }
    );
  }

  await prisma.careSchedule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
