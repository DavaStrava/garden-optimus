import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchSpecies } from "@/lib/species-matcher";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") as "INDOOR" | "OUTDOOR" | null;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 50);

  try {
    // Build filter
    const where: {
      suitableFor?: { has: "INDOOR" | "OUTDOOR" };
    } = {};

    if (location) {
      where.suitableFor = { has: location };
    }

    // Fetch all species matching the filter
    const allSpecies = await prisma.plantSpecies.findMany({
      where,
      select: {
        id: true,
        commonName: true,
        scientificName: true,
        description: true,
        lightNeeds: true,
        waterFrequency: true,
        humidity: true,
        temperature: true,
        toxicity: true,
        suitableFor: true,
        imageUrl: true,
      },
      orderBy: { commonName: "asc" },
    });

    // If there's a search query, use fuzzy search
    let results;
    if (query.length >= 2) {
      results = searchSpecies(query, allSpecies, limit);
    } else {
      // Return first N species alphabetically
      results = allSpecies.slice(0, limit);
    }

    return NextResponse.json({ species: results });
  } catch (error) {
    console.error("Species search error:", error);
    return NextResponse.json(
      { error: "Failed to search species" },
      { status: 500 }
    );
  }
}
