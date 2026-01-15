import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReminderStatus } from "@/lib/care-reminders";
import type { CareType } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dueWithin = searchParams.get("dueWithin"); // number of days
  const status = searchParams.get("status"); // overdue, due-today, due-soon, upcoming

  // Build where clause
  const whereClause: {
    plant: { userId: string };
    enabled: boolean;
    nextDueDate?: { lte: Date };
  } = {
    plant: { userId: session.user.id },
    enabled: true,
  };

  // Filter by due date range
  if (dueWithin) {
    const days = parseInt(dueWithin, 10);
    if (!isNaN(days)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      whereClause.nextDueDate = { lte: futureDate };
    }
  }

  const schedules = await prisma.careSchedule.findMany({
    where: whereClause,
    include: {
      plant: {
        select: {
          id: true,
          name: true,
          nickname: true,
          location: true,
        },
      },
    },
    orderBy: { nextDueDate: "asc" },
  });

  // Add status info to each schedule
  const schedulesWithStatus = schedules.map((schedule) => {
    const statusInfo = getReminderStatus(schedule.nextDueDate);
    return {
      ...schedule,
      statusInfo,
    };
  });

  // Filter by status if specified
  let filtered = schedulesWithStatus;
  if (status) {
    filtered = schedulesWithStatus.filter((s) => s.statusInfo.status === status);
  }

  return NextResponse.json({ schedules: filtered });
}

const VALID_CARE_TYPES = [
  "WATERING",
  "FERTILIZING",
  "REPOTTING",
  "PRUNING",
  "PEST_TREATMENT",
  "OTHER",
] as const;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { plantId, careType, intervalDays, nextDueDate } = body as {
    plantId?: string;
    careType?: string;
    intervalDays?: number;
    nextDueDate?: string;
  };

  if (!plantId || !careType || intervalDays === undefined) {
    return NextResponse.json(
      { error: "plantId, careType, and intervalDays are required" },
      { status: 400 }
    );
  }

  // Validate careType is a valid enum value
  if (!VALID_CARE_TYPES.includes(careType as typeof VALID_CARE_TYPES[number])) {
    return NextResponse.json(
      { error: `Invalid careType. Must be one of: ${VALID_CARE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate intervalDays is a positive number within reasonable range
  if (typeof intervalDays !== "number" || intervalDays < 1 || intervalDays > 365) {
    return NextResponse.json(
      { error: "intervalDays must be a number between 1 and 365" },
      { status: 400 }
    );
  }

  // Verify plant ownership
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { userId: true },
  });

  if (!plant || plant.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Plant not found or access denied" },
      { status: 404 }
    );
  }

  // Calculate next due date if not provided (default to today + interval)
  const dueDate = nextDueDate
    ? new Date(nextDueDate)
    : new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  const schedule = await prisma.careSchedule.create({
    data: {
      plantId,
      careType: careType as CareType,
      intervalDays,
      nextDueDate: dueDate,
    },
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

  return NextResponse.json({ schedule }, { status: 201 });
}
