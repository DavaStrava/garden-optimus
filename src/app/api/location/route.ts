import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: session.user.id },
  });

  if (!location) {
    return NextResponse.json({ location: null });
  }

  return NextResponse.json({ location });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { latitude, longitude, city, country, timezone } = body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90) {
    return NextResponse.json(
      { error: "Invalid latitude (must be between -90 and 90)" },
      { status: 400 }
    );
  }

  if (longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { error: "Invalid longitude (must be between -180 and 180)" },
      { status: 400 }
    );
  }

  const location = await prisma.userLocation.upsert({
    where: { userId: session.user.id },
    update: {
      latitude,
      longitude,
      city: city || null,
      country: country || null,
      timezone: timezone || null,
    },
    create: {
      userId: session.user.id,
      latitude,
      longitude,
      city: city || null,
      country: country || null,
      timezone: timezone || null,
    },
  });

  return NextResponse.json({ location });
}

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.userLocation.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
