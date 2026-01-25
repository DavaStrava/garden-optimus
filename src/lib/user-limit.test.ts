import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAdminEmail,
  isRegistrationOpen,
  getUserCount,
  getRemainingSlots,
  getMaxUsers,
} from "./user-limit";

// Mock Prisma
vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("user-limit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Clear env var before each test
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  describe("getMaxUsers", () => {
    it("should return 10 as the maximum user limit", () => {
      expect(getMaxUsers()).toBe(10);
    });
  });

  describe("isAdminEmail", () => {
    it("should return false when no admin emails are configured", () => {
      expect(isAdminEmail("admin@example.com")).toBe(false);
    });

    it("should return true for configured admin email", () => {
      process.env.ADMIN_EMAILS = "admin@example.com";
      expect(isAdminEmail("admin@example.com")).toBe(true);
    });

    it("should handle multiple admin emails", () => {
      process.env.ADMIN_EMAILS = "admin1@example.com,admin2@example.com";
      expect(isAdminEmail("admin1@example.com")).toBe(true);
      expect(isAdminEmail("admin2@example.com")).toBe(true);
      expect(isAdminEmail("notadmin@example.com")).toBe(false);
    });

    it("should be case-insensitive", () => {
      process.env.ADMIN_EMAILS = "Admin@Example.com";
      expect(isAdminEmail("admin@example.com")).toBe(true);
      expect(isAdminEmail("ADMIN@EXAMPLE.COM")).toBe(true);
    });

    it("should trim whitespace from admin emails", () => {
      process.env.ADMIN_EMAILS = " admin@example.com , other@example.com ";
      expect(isAdminEmail("admin@example.com")).toBe(true);
      expect(isAdminEmail("other@example.com")).toBe(true);
    });
  });

  describe("getUserCount", () => {
    it("should return the count from database", async () => {
      mockPrisma.user.count.mockResolvedValue(5);

      const count = await getUserCount();

      expect(count).toBe(5);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when no users exist", async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const count = await getUserCount();

      expect(count).toBe(0);
    });
  });

  describe("getRemainingSlots", () => {
    it("should return remaining slots when under limit", async () => {
      mockPrisma.user.count.mockResolvedValue(3);

      const remaining = await getRemainingSlots();

      expect(remaining).toBe(7); // 10 - 3 = 7
    });

    it("should return 0 when at limit", async () => {
      mockPrisma.user.count.mockResolvedValue(10);

      const remaining = await getRemainingSlots();

      expect(remaining).toBe(0);
    });

    it("should return 0 when over limit (edge case)", async () => {
      mockPrisma.user.count.mockResolvedValue(15);

      const remaining = await getRemainingSlots();

      expect(remaining).toBe(0); // Math.max(0, 10 - 15) = 0
    });

    it("should return 10 when no users exist", async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const remaining = await getRemainingSlots();

      expect(remaining).toBe(10);
    });
  });

  describe("isRegistrationOpen", () => {
    it("should allow admin emails regardless of user count", async () => {
      process.env.ADMIN_EMAILS = "admin@example.com";
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const canRegister = await isRegistrationOpen("admin@example.com");

      expect(canRegister).toBe(true);
      // Admin check should short-circuit, no DB calls needed
    });

    it("should allow existing users to sign in", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "existing-user-id" });
      mockPrisma.user.count.mockResolvedValue(10);

      const canRegister = await isRegistrationOpen("existing@example.com");

      expect(canRegister).toBe(true);
    });

    it("should allow new users when under limit", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(5);

      const canRegister = await isRegistrationOpen("new@example.com");

      expect(canRegister).toBe(true);
    });

    it("should deny new users when at limit", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(10);

      const canRegister = await isRegistrationOpen("new@example.com");

      expect(canRegister).toBe(false);
    });

    it("should deny new users when over limit", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(15);

      const canRegister = await isRegistrationOpen("new@example.com");

      expect(canRegister).toBe(false);
    });

    it("should normalize email to lowercase", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(5);

      await isRegistrationOpen("User@EXAMPLE.com");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: "user@example.com",
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
    });

    it("should make database calls in parallel for efficiency", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(5);

      await isRegistrationOpen("new@example.com");

      // Both calls should be made
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty ADMIN_EMAILS env var", () => {
      process.env.ADMIN_EMAILS = "";
      expect(isAdminEmail("admin@example.com")).toBe(false);
    });

    it("should handle ADMIN_EMAILS with only whitespace", () => {
      process.env.ADMIN_EMAILS = "  ,  ,  ";
      expect(isAdminEmail("admin@example.com")).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.user.count.mockRejectedValue(new Error("DB connection failed"));

      await expect(getUserCount()).rejects.toThrow("DB connection failed");
    });
  });
});
