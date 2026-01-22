import { NextResponse } from "next/server";
import {
  isRegistrationOpen,
  getRemainingSlots,
  getMaxUsers,
} from "@/lib/user-limit";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(request: Request) {
  // Check rate limit
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    `check-registration:${clientId}`,
    RATE_LIMIT,
    RATE_WINDOW_MS
  );

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetIn),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetIn),
        },
      }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const open = await isRegistrationOpen(email);
    const remaining = await getRemainingSlots();

    return NextResponse.json(
      {
        open,
        remaining,
        maxUsers: getMaxUsers(),
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetIn),
        },
      }
    );
  } catch (error) {
    console.error("Error checking registration:", error);
    return NextResponse.json(
      { error: "Failed to check registration status" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // Check rate limit
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    `check-registration:${clientId}`,
    RATE_LIMIT,
    RATE_WINDOW_MS
  );

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetIn),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetIn),
        },
      }
    );
  }

  try {
    const remaining = await getRemainingSlots();

    return NextResponse.json(
      {
        open: remaining > 0,
        remaining,
        maxUsers: getMaxUsers(),
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetIn),
        },
      }
    );
  } catch (error) {
    console.error("Error checking registration:", error);
    return NextResponse.json(
      { error: "Failed to check registration status" },
      { status: 500 }
    );
  }
}
