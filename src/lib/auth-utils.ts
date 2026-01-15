/**
 * Auth utilities - extracted for testability
 */

/**
 * Checks if running on a known production platform
 */
export function isProductionPlatform(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.RAILWAY ||
    process.env.RENDER ||
    process.env.HEROKU ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  );
}

/**
 * Checks if dev authentication should be enabled
 * Requires ALL conditions:
 * 1. NODE_ENV is development
 * 2. Not running on known production platforms
 * 3. Explicit ENABLE_DEV_AUTH flag is set
 */
export function isDevAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !isProductionPlatform() &&
    process.env.ENABLE_DEV_AUTH === "true"
  );
}

/**
 * Validates email for dev authentication
 * Only allows @garden-optimus.local domain with a valid user part
 */
export function isValidDevEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;

  // Must have format: user@garden-optimus.local
  const parts = email.split("@");
  if (parts.length !== 2) return false;

  const [user, domain] = parts;
  if (!user || user.length === 0) return false;

  return domain === "garden-optimus.local";
}

/**
 * Sanitizes email input for dev auth
 * Only accepts string input to prevent type coercion attacks
 */
export function sanitizeDevEmail(email: unknown): string | null {
  if (!email || typeof email !== "string") return null;
  if (!isValidDevEmail(email)) return null;
  return email;
}
