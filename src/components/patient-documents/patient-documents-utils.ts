/**
 * Pure utility functions extracted from patient documents components for testability.
 *
 * These functions handle data transformation for document table row rendering
 * (file type config, icon mapping, color mapping) and documents header rendering
 * (storage percentage calculation).
 */

// ─── File Type Config ────────────────────────────────────────────────────────

export const fileTypeConfig = {
  pdf: {
    icon: "picture_as_pdf",
    bgColor: "bg-red-50",
    borderColor: "border-red-100",
    textColor: "text-red-500",
  },
  audio: {
    icon: "graphic_eq",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    textColor: "text-blue-500",
  },
  image: {
    icon: "image",
    bgColor: "bg-green-50",
    borderColor: "border-green-100",
    textColor: "text-green-500",
  },
  document: {
    icon: "article",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
    textColor: "text-orange-500",
  },
  other: {
    icon: "assignment",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-100",
    textColor: "text-gray-500",
  },
} as const;

export type FileType = keyof typeof fileTypeConfig;

/**
 * Returns the file type configuration (icon, bgColor, borderColor, textColor)
 * for a given file type string.
 * Returns undefined if the file type is not a known file type.
 */
export function getFileTypeConfig(fileType: string): {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
} | undefined {
  if (fileType in fileTypeConfig) {
    return fileTypeConfig[fileType as FileType];
  }
  return undefined;
}

/**
 * Returns whether a file type string is an audio file.
 * Audio files get a "play" action button instead of "view".
 */
export function isAudioFile(fileType: string): boolean {
  return fileType === "audio";
}

/**
 * Returns the list of known file type keys.
 */
export function getKnownFileTypes(): FileType[] {
  return Object.keys(fileTypeConfig) as FileType[];
}

// ─── Storage Percentage Calculation ──────────────────────────────────────────

/**
 * Calculates the storage usage percentage.
 * Returns 0 if total is zero or negative to avoid division by zero.
 * Result is rounded to the nearest integer.
 */
export function calculateStoragePercentage(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((used / total) * 100);
}

// ─── Expected Color Mappings ─────────────────────────────────────────────────

/**
 * Maps file types to their expected color families.
 * Used for validation that each file type has the correct color.
 */
export const fileTypeColorFamilies: Record<FileType, string> = {
  pdf: "red",
  audio: "blue",
  image: "green",
  document: "orange",
  other: "gray",
} as const;
