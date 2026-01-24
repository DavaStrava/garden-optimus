import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { identifyPlantFromImage } from "@/lib/ai-identify";
import { matchSpeciesToDatabase } from "@/lib/species-matcher";
import { checkRateLimit } from "@/lib/rate-limit";

// Rate limit: 10 identifications per hour per user
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Species cache to avoid repeated database queries
let speciesCache: Awaited<ReturnType<typeof fetchAllSpecies>> | null = null;
let speciesCacheTime = 0;
const SPECIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAllSpecies() {
  return prisma.plantSpecies.findMany({
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
      careNotes: true,
      suitableFor: true,
      imageUrl: true,
    },
  });
}

async function getCachedSpecies() {
  const now = Date.now();
  if (!speciesCache || now - speciesCacheTime > SPECIES_CACHE_TTL) {
    speciesCache = await fetchAllSpecies();
    speciesCacheTime = now;
  }
  return speciesCache;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting by user ID
  const rateLimitKey = `identify:${session.user.id}`;
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT, RATE_LIMIT_WINDOW);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. You can identify ${RATE_LIMIT} plants per hour. Try again in ${rateLimit.resetIn} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetIn),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate file size (server-side check)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Please use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Detect actual image type from magic bytes (compression may change format)
    const bytes = new Uint8Array(buffer);
    let mimeType = file.type;

    // Check magic bytes to detect actual format
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      mimeType = "image/jpeg";
    } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      mimeType = "image/png";
    } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      mimeType = "image/webp";
    } else if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      // "ftyp" at offset 4 indicates HEIF/AVIF/HEIC container format
      // Check for specific brand
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand === "avif" || brand === "avis") {
        return NextResponse.json(
          { error: "AVIF images are not supported. Please use JPEG, PNG, or WebP format. On iPhone, go to Settings > Camera > Formats and select 'Most Compatible'." },
          { status: 400 }
        );
      } else if (brand === "heic" || brand === "heix" || brand === "mif1") {
        return NextResponse.json(
          { error: "HEIC images are not supported. Please use JPEG, PNG, or WebP format. On iPhone, go to Settings > Camera > Formats and select 'Most Compatible'." },
          { status: 400 }
        );
      }
    }

    // Identify the plant using Claude Vision
    const identificationResult = await identifyPlantFromImage(base64, mimeType);

    if (!identificationResult.success || !identificationResult.identification) {
      return NextResponse.json(
        { error: identificationResult.error || "Failed to identify plant" },
        { status: 422 }
      );
    }

    const identification = identificationResult.identification;

    // Get cached species data
    const allSpecies = await getCachedSpecies();

    // Match AI identification to database species
    const matches = matchSpeciesToDatabase(
      {
        species: identification.species,
        scientificName: identification.scientificName || undefined,
      },
      allSpecies,
      3
    );

    // Get full species data for matches
    const matchedSpecies = matches.map((match) => {
      const species = allSpecies.find((s) => s.id === match.id);
      return {
        ...species,
        matchScore: match.score,
        matchConfidence: match.confidence,
      };
    });

    return NextResponse.json({
      identification: {
        species: identification.species,
        scientificName: identification.scientificName,
        confidence: identification.confidence,
        reasoning: identification.reasoning,
        careHints: identification.careHints,
      },
      matches: matchedSpecies,
      alternativeIdentifications: identification.alternativeMatches,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      },
    });
  } catch (error) {
    console.error("Plant identification error:", error);
    return NextResponse.json(
      { error: "Failed to identify plant. Please try again." },
      { status: 500 }
    );
  }
}
