/**
 * Garden validation utilities.
 */

// Garden name constraints
export const GARDEN_NAME_MAX_LENGTH = 40;
export const GARDEN_NAME_MIN_LENGTH = 1;
export const GARDEN_NAME_PATTERN = /^[a-zA-Z0-9\s]+$/;

// Garden description constraints
export const GARDEN_DESCRIPTION_MAX_LENGTH = 500;

export interface GardenValidationError {
  field: "name" | "description";
  message: string;
}

/**
 * Validate a garden name.
 * @param name - The garden name to validate
 * @returns Error message if invalid, null if valid
 */
export function validateGardenName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length < GARDEN_NAME_MIN_LENGTH) {
    return "Garden name is required";
  }

  if (trimmed.length > GARDEN_NAME_MAX_LENGTH) {
    return `Garden name must be ${GARDEN_NAME_MAX_LENGTH} characters or less`;
  }

  if (!GARDEN_NAME_PATTERN.test(trimmed)) {
    return "Garden name can only contain letters, numbers, and spaces";
  }

  return null;
}

/**
 * Validate a garden description.
 * @param description - The garden description to validate
 * @returns Error message if invalid, null if valid
 */
export function validateGardenDescription(description: string | null | undefined): string | null {
  if (!description) {
    return null; // Description is optional
  }

  if (description.length > GARDEN_DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${GARDEN_DESCRIPTION_MAX_LENGTH} characters or less`;
  }

  return null;
}

/**
 * Validate garden data for creation or update.
 * @param data - The garden data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateGardenData(data: {
  name?: string;
  description?: string | null;
}): GardenValidationError[] {
  const errors: GardenValidationError[] = [];

  if (data.name !== undefined) {
    const nameError = validateGardenName(data.name);
    if (nameError) {
      errors.push({ field: "name", message: nameError });
    }
  }

  if (data.description !== undefined) {
    const descError = validateGardenDescription(data.description);
    if (descError) {
      errors.push({ field: "description", message: descError });
    }
  }

  return errors;
}
