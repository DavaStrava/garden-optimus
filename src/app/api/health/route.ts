import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Basic health response for unauthenticated users
    const baseResponse = {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };

    // Only expose detailed info to authenticated users
    if (session?.user) {
      const envCheck = {
        database: !!process.env.DATABASE_URL,
        auth: !!process.env.NEXTAUTH_SECRET,
        ai: !!process.env.ANTHROPIC_API_KEY,
        blob: !!process.env.BLOB_READ_WRITE_TOKEN,
      };

      const optionalEnv = {
        sentry: !!process.env.SENTRY_DSN,
        google: !!process.env.GOOGLE_CLIENT_ID,
        github: !!process.env.GITHUB_CLIENT_ID,
      };

      return NextResponse.json({
        ...baseResponse,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
        required: envCheck,
        optional: optionalEnv,
      });
    }

    return NextResponse.json(baseResponse);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
