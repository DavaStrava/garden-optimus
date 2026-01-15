import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWeather, getWeatherAlerts, getCurrentSeason, getSeasonalTips } from "@/lib/weather";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: session.user.id },
  });

  if (!location) {
    return NextResponse.json({
      alerts: [],
      season: null,
      seasonalTips: [],
      message: "Enable location for weather alerts",
    });
  }

  // Check if user has any outdoor plants
  const outdoorPlantCount = await prisma.plant.count({
    where: {
      userId: session.user.id,
      location: "OUTDOOR",
    },
  });

  const hasOutdoorPlants = outdoorPlantCount > 0;

  try {
    const weather = await fetchWeather(location.latitude, location.longitude);
    const alerts = getWeatherAlerts(weather, hasOutdoorPlants);
    const season = getCurrentSeason(location.latitude);
    const seasonalTips = getSeasonalTips(season);

    return NextResponse.json({
      alerts,
      season,
      seasonalTips,
      hasOutdoorPlants,
    });
  } catch (error) {
    console.error("Weather alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather alerts" },
      { status: 500 }
    );
  }
}
