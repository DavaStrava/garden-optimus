import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWeather } from "@/lib/weather";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: session.user.id },
  });

  if (!location) {
    return NextResponse.json(
      { error: "Location not set. Please enable location to get weather data." },
      { status: 404 }
    );
  }

  try {
    const weather = await fetchWeather(location.latitude, location.longitude);
    return NextResponse.json({
      weather,
      location: {
        city: location.city,
        country: location.country,
        timezone: location.timezone,
      },
    });
  } catch (error) {
    console.error("Weather fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
