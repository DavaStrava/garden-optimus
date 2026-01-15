import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReminderStatus } from "@/lib/care-reminders";
import type { CareType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_CARE_TYPES = [
  "WATERING",
  "FERTILIZING",
  "REPOTTING",
  "PRUNING",
  "PEST_TREATMENT",
  "OTHER",
] as const;

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: plantId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const schedules = await prisma.careSchedule.findMany({
    where: { plantId },
    orderBy: { nextDueDate: "asc" },
  });

  // Add status info to each schedule
  const schedulesWithStatus = schedules.map((schedule) => ({
    ...schedule,
    statusInfo: getReminderStatus(schedule.nextDueDate),
  }));

  return NextResponse.json({ schedules: schedulesWithStatus });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  const { id: plantId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { careType, intervalDays, nextDueDate } = body as {
    careType?: string;
    intervalDays?: number;
    nextDueDate?: string;
  };

  if (!careType || intervalDays === undefined) {
    return NextResponse.json(
      { error: "careType and intervalDays are required" },
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

  // Calculate next due date if not provided
  const dueDate = nextDueDate
    ? new Date(nextDueDate)
    : new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  // Upsert - update if exists, create if not
  const validatedCareType = careType as CareType;
  const schedule = await prisma.careSchedule.upsert({
    where: {
      plantId_careType: {
        plantId,
        careType: validatedCareType,
      },
    },
    update: {
      intervalDays,
      nextDueDate: dueDate,
      enabled: true,
    },
    create: {
      plantId,
      careType: validatedCareType,
      intervalDays,
      nextDueDate: dueDate,
    },
  });

  return NextResponse.json({
    schedule: {
      ...schedule,
      statusInfo: getReminderStatus(schedule.nextDueDate),
    },
  });
}
