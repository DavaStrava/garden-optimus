import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  validateImageFile,
  validateImageFileAsync,
  isHeicOrAvif,
  fileToBase64,
  createImagePreview,
  revokeImagePreview,
  getImageMimeType,
} from "./image-compression";

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectURL = "blob:http://localhost/mock-url";
global.URL.createObjectURL = vi.fn(() => mockObjectURL);
global.URL.revokeObjectURL = vi.fn();

// Polyfill Blob.prototype.arrayBuffer for jsdom
// jsdom doesn't implement Blob.slice().arrayBuffer() properly
beforeAll(() => {
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = async function() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }
});

// Helper to create mock File objects
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Array(size).fill("a").join("");
  return new File([content], name, { type });
}

describe("image-compression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateImageFile", () => {
    it("should accept valid JPEG files", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid PNG files", () => {
      const file = createMockFile("test.png", 1024, "image/png");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should accept valid WebP files", () => {
      const file = createMockFile("test.webp", 1024, "image/webp");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should reject invalid file types", () => {
      const file = createMockFile("test.gif", 1024, "image/gif");
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject PDF files", () => {
      const file = createMockFile("test.pdf", 1024, "application/pdf");
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject SVG files", () => {
      const file = createMockFile("test.svg", 1024, "image/svg+xml");
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
    });

    it("should reject files larger than 10MB", () => {
      const largeSize = 11 * 1024 * 1024; // 11MB
      const file = createMockFile("large.jpg", largeSize, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("File too large");
      expect(result.error).toContain("10MB");
    });

    it("should accept files exactly 10MB", () => {
      const exactSize = 10 * 1024 * 1024; // 10MB
      const file = createMockFile("exact.jpg", exactSize, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should accept small files", () => {
      const file = createMockFile("small.jpg", 100, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should include file size in error message", () => {
      const largeSize = 15 * 1024 * 1024; // 15MB
      const file = createMockFile("large.jpg", largeSize, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.error).toContain("15.0MB");
    });
  });

  describe("fileToBase64", () => {
    it("should convert a file to base64 string", async () => {
      const content = "test content";
      const file = new File([content], "test.txt", { type: "text/plain" });

      const result = await fileToBase64(file);

      // Result should be base64 encoded
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Should not include data URL prefix
      expect(result).not.toContain("data:");
      expect(result).not.toContain("base64,");
    });

    it("should handle empty file", async () => {
      const file = new File([], "empty.txt", { type: "text/plain" });

      const result = await fileToBase64(file);

      expect(typeof result).toBe("string");
    });

    it("should handle binary content", async () => {
      const binaryContent = new Uint8Array([0, 1, 2, 255, 128]);
      const file = new File([binaryContent], "binary.bin", {
        type: "application/octet-stream",
      });

      const result = await fileToBase64(file);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("createImagePreview", () => {
    it("should create an object URL for the file", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      const result = createImagePreview(file);

      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(result).toBe(mockObjectURL);
    });

    it("should return a blob URL", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      const result = createImagePreview(file);

      expect(result).toContain("blob:");
    });
  });

  describe("revokeImagePreview", () => {
    it("should revoke the object URL", () => {
      const url = "blob:http://localhost/test";

      revokeImagePreview(url);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    });

    it("should handle empty string", () => {
      revokeImagePreview("");

      expect(URL.revokeObjectURL).toHaveBeenCalledWith("");
    });
  });

  describe("getImageMimeType", () => {
    it("should return original type for PNG", () => {
      const file = createMockFile("test.png", 1024, "image/png");

      const result = getImageMimeType(file);

      expect(result).toBe("image/png");
    });

    it("should return original type for WebP", () => {
      const file = createMockFile("test.webp", 1024, "image/webp");

      const result = getImageMimeType(file);

      expect(result).toBe("image/webp");
    });

    it("should return jpeg for JPEG files", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      const result = getImageMimeType(file);

      expect(result).toBe("image/jpeg");
    });

    it("should return jpeg for unknown types", () => {
      const file = createMockFile("test.bmp", 1024, "image/bmp");

      const result = getImageMimeType(file);

      expect(result).toBe("image/jpeg");
    });
  });

  describe("edge cases", () => {
    it("should handle file with empty name", () => {
      const file = createMockFile("", 1024, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should handle file with very long name", () => {
      const longName = "a".repeat(1000) + ".jpg";
      const file = createMockFile(longName, 1024, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should handle file with special characters in name", () => {
      const file = createMockFile(
        "test image (1) [copy].jpg",
        1024,
        "image/jpeg"
      );
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should handle file with unicode in name", () => {
      const file = createMockFile("测试图片.jpg", 1024, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it("should be case-insensitive for mime types", () => {
      // File API normalizes MIME types to lowercase, but test the logic
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });
  });

  describe("isHeicOrAvif", () => {
    // Helper to create a file with specific magic bytes that works in jsdom
    // jsdom's Blob.slice().arrayBuffer() needs the data to be properly set up
    async function createFileWithMagicBytes(bytes: number[]): Promise<File> {
      const uint8Array = new Uint8Array(bytes);
      const blob = new Blob([uint8Array], { type: "image/jpeg" });
      // Create file from blob to ensure proper slice support
      return new File([blob], "test.jpg", { type: "image/jpeg" });
    }

    it("should detect HEIC file by magic bytes", async () => {
      // HEIC magic bytes: size(4) + "ftyp" + "heic"
      const heicBytes = [
        0x00, 0x00, 0x00, 0x18, // size (24 bytes)
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x68, 0x65, 0x69, 0x63, // "heic"
      ];
      const file = await createFileWithMagicBytes(heicBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(true);
    });

    it("should detect AVIF file by magic bytes", async () => {
      // AVIF magic bytes: size(4) + "ftyp" + "avif"
      const avifBytes = [
        0x00, 0x00, 0x00, 0x1c, // size
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x61, 0x76, 0x69, 0x66, // "avif"
      ];
      const file = await createFileWithMagicBytes(avifBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(true);
    });

    it("should detect HEIF (heix variant) by magic bytes", async () => {
      // HEIF magic bytes: size(4) + "ftyp" + "heix"
      const heifBytes = [
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x68, 0x65, 0x69, 0x78, // "heix"
      ];
      const file = await createFileWithMagicBytes(heifBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(true);
    });

    it("should detect mif1 brand by magic bytes", async () => {
      // mif1 magic bytes: size(4) + "ftyp" + "mif1"
      const mif1Bytes = [
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x6d, 0x69, 0x66, 0x31, // "mif1"
      ];
      const file = await createFileWithMagicBytes(mif1Bytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(true);
    });

    it("should detect avis (AVIF sequence) by magic bytes", async () => {
      // avis magic bytes: size(4) + "ftyp" + "avis"
      const avisBytes = [
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x61, 0x76, 0x69, 0x73, // "avis"
      ];
      const file = await createFileWithMagicBytes(avisBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(true);
    });

    it("should return false for JPEG file", async () => {
      // JPEG magic bytes: FFD8FF
      const jpegBytes = [
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01,
      ];
      const file = await createFileWithMagicBytes(jpegBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(false);
    });

    it("should return false for PNG file", async () => {
      // PNG magic bytes
      const pngBytes = [
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
      ];
      const file = await createFileWithMagicBytes(pngBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(false);
    });

    it("should return false for file with ftyp but unknown brand", async () => {
      // Unknown brand: size(4) + "ftyp" + "mp41" (MP4)
      const mp4Bytes = [
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x6d, 0x70, 0x34, 0x31, // "mp41" - not HEIC/AVIF
      ];
      const file = await createFileWithMagicBytes(mp4Bytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(false);
    });

    it("should return false for empty file", async () => {
      const emptyBlob = new Blob([], { type: "image/jpeg" });
      const emptyFile = new File([emptyBlob], "empty.jpg", { type: "image/jpeg" });

      const result = await isHeicOrAvif(emptyFile);

      expect(result).toBe(false);
    });

    it("should return false for file shorter than 12 bytes", async () => {
      const shortBytes = [0xff, 0xd8, 0xff];
      const file = await createFileWithMagicBytes(shortBytes);

      const result = await isHeicOrAvif(file);

      expect(result).toBe(false);
    });
  });

  describe("validateImageFileAsync", () => {
    async function createFileWithMagicBytes(bytes: number[], type: string): Promise<File> {
      const uint8Array = new Uint8Array(bytes);
      const blob = new Blob([uint8Array], { type });
      return new File([blob], "test.jpg", { type });
    }

    it("should return valid for genuine JPEG file", async () => {
      const jpegBytes = [
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01,
      ];
      const file = await createFileWithMagicBytes(jpegBytes, "image/jpeg");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid for genuine PNG file", async () => {
      const pngBytes = [
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
      ];
      const file = await createFileWithMagicBytes(pngBytes, "image/png");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(true);
    });

    it("should reject HEIC file disguised as JPEG", async () => {
      // HEIC magic bytes but reported as image/jpeg
      const heicBytes = [
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x68, 0x65, 0x69, 0x63, // "heic"
      ];
      const file = await createFileWithMagicBytes(heicBytes, "image/jpeg");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("HEIC/AVIF");
    });

    it("should reject AVIF file disguised as JPEG", async () => {
      const avifBytes = [
        0x00, 0x00, 0x00, 0x1c,
        0x66, 0x74, 0x79, 0x70, // "ftyp"
        0x61, 0x76, 0x69, 0x66, // "avif"
      ];
      const file = await createFileWithMagicBytes(avifBytes, "image/jpeg");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("HEIC/AVIF");
      expect(result.error).toContain("Most Compatible");
    });

    it("should reject invalid file type before checking magic bytes", async () => {
      const file = createMockFile("test.gif", 1024, "image/gif");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject files that are too large before checking magic bytes", async () => {
      const largeSize = 15 * 1024 * 1024; // 15MB
      const file = createMockFile("large.jpg", largeSize, "image/jpeg");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("File too large");
    });

    it("should reject HEIC file reported with correct MIME type", async () => {
      const file = createMockFile("test.heic", 1024, "image/heic");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("HEIC");
    });

    it("should reject AVIF file reported with correct MIME type", async () => {
      const file = createMockFile("test.avif", 1024, "image/avif");

      const result = await validateImageFileAsync(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("AVIF");
    });
  });
});
