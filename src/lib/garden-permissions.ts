/**
 * Garden permission utilities.
 *
 * Permission Matrix:
 * | Action                          | VIEWER | ADMIN | OWNER |
 * |---------------------------------|--------|-------|-------|
 * | View garden & plants            | Yes    | Yes   | Yes   |
 * | Add/remove plants               | No     | Yes   | Yes   |
 * | Edit garden name/description    | No     | Yes   | Yes   |
 * | Manage members (invite/remove)  | No     | No    | Yes   |
 * | Delete garden                   | No     | No    | Yes   |
 */

import { prisma } from "@/lib/prisma";
import type { GardenRole } from "@prisma/client";

// Define permission types
export type GardenPermission =
  | "view"
  | "add_plants"
  | "remove_plants"
  | "edit_garden"
  | "manage_members"
  | "delete_garden";

// Permission mapping by role
const ROLE_PERMISSIONS: Record<GardenRole, GardenPermission[]> = {
  VIEWER: ["view"],
  ADMIN: ["view", "add_plants", "remove_plants", "edit_garden"],
  OWNER: ["view", "add_plants", "remove_plants", "edit_garden", "manage_members", "delete_garden"],
};

/**
 * Check if a role has a specific permission.
 * @param role - The garden role
 * @param permission - The permission to check
 * @returns True if the role has the permission
 */
export function hasPermission(role: GardenRole, permission: GardenPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role.
 * @param role - The garden role
 * @returns Array of permissions
 */
export function getPermissions(role: GardenRole): GardenPermission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Get a user's role in a garden.
 * Returns OWNER if the user is the garden owner, or their member role if they're a member.
 * Uses a single database query for efficiency.
 * @param userId - The user ID
 * @param gardenId - The garden ID
 * @returns The user's role, or null if they have no access
 */
export async function getUserGardenRole(
  userId: string,
  gardenId: string
): Promise<GardenRole | null> {
  // Single query to get garden owner and check membership
  const garden = await prisma.garden.findUnique({
    where: { id: gardenId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!garden) {
    return null;
  }

  if (garden.ownerId === userId) {
    return "OWNER";
  }

  return garden.members[0]?.role ?? null;
}

/**
 * Check if a user has a specific permission in a garden.
 * @param userId - The user ID
 * @param gardenId - The garden ID
 * @param permission - The permission to check
 * @returns True if the user has the permission
 */
export async function userHasGardenPermission(
  userId: string,
  gardenId: string,
  permission: GardenPermission
): Promise<boolean> {
  const role = await getUserGardenRole(userId, gardenId);

  if (!role) {
    return false;
  }

  return hasPermission(role, permission);
}

/**
 * Check if a user can view a garden (has any access).
 * @param userId - The user ID
 * @param gardenId - The garden ID
 * @returns True if the user can view the garden
 */
export async function canViewGarden(userId: string, gardenId: string): Promise<boolean> {
  return userHasGardenPermission(userId, gardenId, "view");
}

/**
 * Check if a user can edit plants in a garden.
 * @param userId - The user ID
 * @param gardenId - The garden ID
 * @returns True if the user can add/remove plants
 */
export async function canEditPlants(userId: string, gardenId: string): Promise<boolean> {
  return userHasGardenPermission(userId, gardenId, "add_plants");
}

/**
 * Check if a user can manage a garden's members.
 * @param userId - The user ID
 * @param gardenId - The garden ID
 * @returns True if the user can manage members
 */
export async function canManageMembers(userId: string, gardenId: string): Promise<boolean> {
  return userHasGardenPermission(userId, gardenId, "manage_members");
}

/**
 * Check if a user can delete a garden.
 * @param userId - The user ID
 * @param gardenId - The garden ID
 * @returns True if the user can delete the garden
 */
export async function canDeleteGarden(userId: string, gardenId: string): Promise<boolean> {
  return userHasGardenPermission(userId, gardenId, "delete_garden");
}
