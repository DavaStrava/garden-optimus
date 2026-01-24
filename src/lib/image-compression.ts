import imageCompression from "browser-image-compression";

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 10;
const DEFAULT_MAX_SIZE_MB = 1;
const DEFAULT_MAX_DIMENSION = 1920;

/**
 * Detects if a file is HEIC/AVIF by checking magic bytes
 * (Browsers often misreport these as image/jpeg)
 */
export async function isHeicOrAvif(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check for "ftyp" at offset 4 (HEIF/AVIF container)
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return ["avif", "avis", "heic", "heix", "mif1"].includes(brand);
  }
  return false;
}

/**
 * Async validation that checks magic bytes for misreported HEIC/AVIF
 */
export async function validateImageFileAsync(file: File): Promise<ImageValidationResult> {
  // First do basic sync validation
  const basicResult = validateImageFile(file);
  if (!basicResult.valid) {
    return basicResult;
  }

  // Check magic bytes for HEIC/AVIF that browser misreports as JPEG
  if (await isHeicOrAvif(file)) {
    return {
      valid: false,
      error: `This image appears to be HEIC/AVIF format (common on iPhones). Please use JPEG, PNG, or WebP. On iPhone, go to Settings > Camera > Formats and select "Most Compatible".`,
    };
  }

  return { valid: true };
}

/**
 * Validates an image file before processing
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check file type - browsers often misreport HEIC/AVIF as jpeg
  if (!ALLOWED_TYPES.includes(file.type)) {
    // Check for HEIC/AVIF which iPhones use
    if (file.type === "image/heic" || file.type === "image/heif" || file.type === "image/avif") {
      return {
        valid: false,
        error: `${file.type.split('/')[1].toUpperCase()} format is not supported. Please use JPEG, PNG, or WebP. On iPhone, go to Settings > Camera > Formats and select "Most Compatible".`,
      };
    }
    return {
      valid: false,
      error: `Invalid file type. Please use JPEG, PNG, or WebP images.`,
    };
  }

  // Check file size (raw, before compression)
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Compresses an image file for upload
 * Target: Max 1MB, 1920px max dimension
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    maxWidthOrHeight = DEFAULT_MAX_DIMENSION,
  } = options;

  // If file is already small enough and dimensions are likely fine, return as-is
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= maxSizeMB) {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: "image/jpeg",
    });

    return compressedFile;
  } catch (error) {
    console.error("Image compression failed:", error);
    throw new Error("Failed to compress image. Please try a smaller file.");
  }
}

/**
 * Converts a File to base64 string for API submission
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a preview URL for an image file
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a preview URL to free memory
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Gets the MIME type for the compressed image
 */
export function getImageMimeType(file: File): string {
  // After compression, we convert to JPEG
  if (file.type === "image/png" || file.type === "image/webp") {
    return file.type;
  }
  return "image/jpeg";
}
