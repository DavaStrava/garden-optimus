/**
 * Soft delete utility functions for plant trash management.
 *
 * Plants are moved to trash (soft deleted) when the user deletes them.
 * They remain in trash for 7 days before being permanently deleted.
 */

// Number of days a plant stays in trash before permanent deletion
export const TRASH_RETENTION_DAYS = 7;

/**
 * Calculate the number of days until a deleted plant is permanently deleted.
 * @param deletedAt - The timestamp when the plant was deleted
 * @returns Number of days remaining (0 if already expired)
 */
export function getDaysUntilPermanentDelete(deletedAt: Date): number {
  const now = new Date();
  const deleteDate = new Date(deletedAt);
  const expirationDate = new Date(
    deleteDate.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const remainingMs = expirationDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  return Math.max(0, remainingDays);
}

/**
 * Check if a deleted plant has exceeded the retention period.
 * @param deletedAt - The timestamp when the plant was deleted
 * @returns True if the plant should be permanently deleted
 */
export function isExpired(deletedAt: Date): boolean {
  return getDaysUntilPermanentDelete(deletedAt) === 0;
}

/**
 * Get the expiration date for a deleted plant.
 * @param deletedAt - The timestamp when the plant was deleted
 * @returns The date when the plant will be permanently deleted
 */
export function getExpirationDate(deletedAt: Date): Date {
  const deleteDate = new Date(deletedAt);
  return new Date(
    deleteDate.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
}

/**
 * Format the remaining time until permanent deletion for display.
 * @param deletedAt - The timestamp when the plant was deleted
 * @returns Human-readable string like "3 days" or "Today"
 */
export function formatTimeUntilDelete(deletedAt: Date): string {
  const days = getDaysUntilPermanentDelete(deletedAt);

  if (days === 0) {
    return "Today";
  } else if (days === 1) {
    return "1 day";
  } else {
    return `${days} days`;
  }
}
