import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isProductionPlatform,
  isDevAuthEnabled,
  isValidDevEmail,
  sanitizeDevEmail,
} from "./auth-utils";

describe("auth-utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isProductionPlatform", () => {
    it("should return false when no platform env vars are set", () => {
      delete process.env.VERCEL;
      delete process.env.RAILWAY;
      delete process.env.RENDER;
      delete process.env.HEROKU;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      delete process.env.NETLIFY;

      expect(isProductionPlatform()).toBe(false);
    });

    it("should return true when VERCEL is set", () => {
      process.env.VERCEL = "1";
      expect(isProductionPlatform()).toBe(true);
    });

    it("should return true when RAILWAY is set", () => {
      process.env.RAILWAY = "1";
      expect(isProductionPlatform()).toBe(true);
    });

    it("should return true when RENDER is set", () => {
      process.env.RENDER = "1";
      expect(isProductionPlatform()).toBe(true);
    });

    it("should return true when HEROKU is set", () => {
      process.env.HEROKU = "1";
      expect(isProductionPlatform()).toBe(true);
    });

    it("should return true when AWS_LAMBDA_FUNCTION_NAME is set", () => {
      process.env.AWS_LAMBDA_FUNCTION_NAME = "my-function";
      expect(isProductionPlatform()).toBe(true);
    });

    it("should return true when NETLIFY is set", () => {
      process.env.NETLIFY = "1";
      expect(isProductionPlatform()).toBe(true);
    });
  });

  describe("isDevAuthEnabled", () => {
    beforeEach(() => {
      // Clear all platform env vars
      delete process.env.VERCEL;
      delete process.env.RAILWAY;
      delete process.env.RENDER;
      delete process.env.HEROKU;
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      delete process.env.NETLIFY;
    });

    it("should return true when all conditions are met", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_DEV_AUTH = "true";

      expect(isDevAuthEnabled()).toBe(true);
    });

    it("should return false when NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      process.env.ENABLE_DEV_AUTH = "true";

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when NODE_ENV is test", () => {
      process.env.NODE_ENV = "test";
      process.env.ENABLE_DEV_AUTH = "true";

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when ENABLE_DEV_AUTH is not set", () => {
      process.env.NODE_ENV = "development";
      delete process.env.ENABLE_DEV_AUTH;

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when ENABLE_DEV_AUTH is not 'true'", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_DEV_AUTH = "false";

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when ENABLE_DEV_AUTH is '1' (must be exactly 'true')", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_DEV_AUTH = "1";

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when on Vercel even with dev settings", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_DEV_AUTH = "true";
      process.env.VERCEL = "1";

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when on Railway even with dev settings", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_DEV_AUTH = "true";
      process.env.RAILWAY = "1";

      expect(isDevAuthEnabled()).toBe(false);
    });

    it("should return false when on AWS Lambda even with dev settings", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_DEV_AUTH = "true";
      process.env.AWS_LAMBDA_FUNCTION_NAME = "my-function";

      expect(isDevAuthEnabled()).toBe(false);
    });
  });

  describe("isValidDevEmail", () => {
    it("should return true for valid dev domain email", () => {
      expect(isValidDevEmail("dev@garden-optimus.local")).toBe(true);
    });

    it("should return true for any user at dev domain", () => {
      expect(isValidDevEmail("test@garden-optimus.local")).toBe(true);
      expect(isValidDevEmail("admin@garden-optimus.local")).toBe(true);
      expect(isValidDevEmail("user123@garden-optimus.local")).toBe(true);
    });

    it("should return false for regular email domains", () => {
      expect(isValidDevEmail("user@gmail.com")).toBe(false);
      expect(isValidDevEmail("user@example.com")).toBe(false);
      expect(isValidDevEmail("user@company.org")).toBe(false);
    });

    it("should return false for similar but different domains", () => {
      expect(isValidDevEmail("user@garden-optimus.com")).toBe(false);
      expect(isValidDevEmail("user@garden-optimus.dev")).toBe(false);
      expect(isValidDevEmail("user@fake-garden-optimus.local")).toBe(false);
    });

    it("should return false for null input", () => {
      expect(isValidDevEmail(null)).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(isValidDevEmail(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidDevEmail("")).toBe(false);
    });

    it("should return false for domain-only input (no user)", () => {
      expect(isValidDevEmail("@garden-optimus.local")).toBe(false);
    });
  });

  describe("sanitizeDevEmail", () => {
    it("should return email string for valid dev email", () => {
      expect(sanitizeDevEmail("dev@garden-optimus.local")).toBe(
        "dev@garden-optimus.local"
      );
    });

    it("should convert number to string and validate", () => {
      // Edge case: if someone passes a number, it should be stringified
      expect(sanitizeDevEmail(12345)).toBe(null);
    });

    it("should return null for invalid email domain", () => {
      expect(sanitizeDevEmail("user@gmail.com")).toBe(null);
    });

    it("should return null for null input", () => {
      expect(sanitizeDevEmail(null)).toBe(null);
    });

    it("should return null for undefined input", () => {
      expect(sanitizeDevEmail(undefined)).toBe(null);
    });

    it("should return null for empty string", () => {
      expect(sanitizeDevEmail("")).toBe(null);
    });

    it("should return null for object input", () => {
      expect(sanitizeDevEmail({ email: "test" })).toBe(null);
    });

    it("should return null for array input", () => {
      expect(sanitizeDevEmail(["dev@garden-optimus.local"])).toBe(null);
    });
  });
});
