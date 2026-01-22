import { prisma } from "./prisma";

const MAX_USERS = 10;

/**
 * Get admin emails from environment variable
 * Cached to avoid repeated parsing
 */
function getAdminEmails(): string[] {
  return (
    process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
    []
  );
}

/**
 * Check if a given email is an admin email
 */
export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * Check if registration is open for a given email
 * - Admin emails (from ADMIN_EMAILS env var) can always register
 * - Existing users can always sign in
 * - Otherwise, registration is open if user count is below MAX_USERS
 */
export async function isRegistrationOpen(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();

  // Admin override - always allow
  if (isAdminEmail(normalizedEmail)) {
    return true;
  }

  // Check if user already exists (case-insensitive) AND get count in one query
  // This is more efficient than two separate queries
  const [existingUser, userCount] = await Promise.all([
    prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true },
    }),
    prisma.user.count(),
  ]);

  // Allow existing users to sign in
  if (existingUser) {
    return true;
  }

  // Check user count for new registrations
  return userCount < MAX_USERS;
}

/**
 * Get the current user count
 */
export async function getUserCount(): Promise<number> {
  return await prisma.user.count();
}

/**
 * Get the number of remaining registration slots
 */
export async function getRemainingSlots(): Promise<number> {
  const count = await getUserCount();
  return Math.max(0, MAX_USERS - count);
}

/**
 * Get the maximum allowed users
 */
export function getMaxUsers(): number {
  return MAX_USERS;
}
