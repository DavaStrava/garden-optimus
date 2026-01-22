import { put, del } from "@vercel/blob";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const IS_PRODUCTION = process.env.VERCEL === "1";

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

// Maximum file size: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Map MIME types to file extensions for safety
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
};

/**
 * Upload a photo to storage (Vercel Blob in production, local filesystem in development)
 * @param fileOrBuffer - The file or buffer to upload
 * @param filename - The filename to use (without path)
 * @returns The URL of the uploaded file
 */
export async function uploadPhoto(
  fileOrBuffer: File | Buffer,
  filename: string
): Promise<string> {
  // Convert to buffer once if needed
  const buffer =
    Buffer.isBuffer(fileOrBuffer)
      ? fileOrBuffer
      : Buffer.from(await fileOrBuffer.arrayBuffer());

  if (IS_PRODUCTION) {
    // Vercel: Use Blob Storage
    const blob = await put(filename, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  } else {
    // Local dev: Use filesystem
    const uploadDir = path.join(process.cwd(), "public/uploads");

    // Create directory if doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    return `/uploads/${filename}`;
  }
}

/**
 * Delete a photo from storage
 * @param url - The URL of the photo to delete
 */
export async function deletePhoto(url: string): Promise<void> {
  if (IS_PRODUCTION) {
    // Vercel: Delete from Blob Storage
    // Only delete if it's a Vercel Blob URL
    if (url.includes("blob.vercel-storage.com")) {
      await del(url);
    }
  } else {
    // Local dev: Delete from filesystem
    if (url.startsWith("/uploads/")) {
      const filepath = path.join(process.cwd(), "public", url);
      if (existsSync(filepath)) {
        await unlink(filepath);
      }
    }
  }
}

/**
 * Generate a unique filename for a plant photo
 * @param plantId - The plant ID
 * @param mimeType - The MIME type of the file
 * @param prefix - Optional prefix (e.g., "assessment-")
 * @returns The generated filename
 */
export function generatePhotoFilename(
  plantId: string,
  mimeType: string,
  prefix: string = ""
): string {
  const ext = MIME_TO_EXT[mimeType] || ".jpg";
  return `${prefix}${plantId}-${Date.now()}${ext}`;
}

/**
 * Validate a file for upload
 * @param file - The file to validate
 * @returns An error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 5MB";
  }

  return null;
}
