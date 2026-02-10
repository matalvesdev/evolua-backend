/**
 * Pure utility functions extracted from patient goals components for testability.
 *
 * These functions handle data transformation for goal card rendering
 * (status config, color schemes, progress clamping) and activity checklist
 * item rendering (location config, location icons).
 */

// ─── Goal Status Config ──────────────────────────────────────────────────────

export const goalStatusConfig = {
  "in-progress": { label: "Em Andamento", color: "green" },
  "attention": { label: "Atenção", color: "yellow" },
  "started": { label: "Iniciado", color: "gray" },
} as const;

export type GoalStatus = keyof typeof goalStatusConfig;

/**
 * Returns the status info (label and color) for a goal status string.
 * Returns undefined if the status is not a known goal status.
 */
export function getGoalStatusInfo(status: string): { label: string; color: string } | undefined {
  if (status in goalStatusConfig) {
    return goalStatusConfig[status as GoalStatus];
  }
  return undefined;
}

/**
 * Returns the list of known goal status keys.
 */
export function getKnownGoalStatuses(): GoalStatus[] {
  return Object.keys(goalStatusConfig) as GoalStatus[];
}

// ─── Goal Color Scheme Config ────────────────────────────────────────────────

export const goalColorSchemes = {
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-[#8A05BE]",
    progressBar: "bg-[#8A05BE]",
    progressText: "text-[#8A05BE]",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-500",
    progressBar: "bg-blue-500",
    progressText: "text-blue-500",
  },
  pink: {
    iconBg: "bg-pink-50",
    iconText: "text-pink-500",
    progressBar: "bg-pink-500",
    progressText: "text-pink-500",
  },
} as const;

export type GoalColorScheme = keyof typeof goalColorSchemes;

/**
 * Returns the color scheme styling classes for a given scheme name.
 * Returns undefined if the scheme is not a known color scheme.
 */
export function getGoalColorScheme(scheme: string): {
  iconBg: string;
  iconText: string;
  progressBar: string;
  progressText: string;
} | undefined {
  if (scheme in goalColorSchemes) {
    return goalColorSchemes[scheme as GoalColorScheme];
  }
  return undefined;
}

/**
 * Returns the list of known color scheme keys.
 */
export function getKnownGoalColorSchemes(): GoalColorScheme[] {
  return Object.keys(goalColorSchemes) as GoalColorScheme[];
}

// ─── Progress Clamping ───────────────────────────────────────────────────────

/**
 * Clamps a progress value to the valid range [0, 100].
 * Values below 0 are clamped to 0, values above 100 are clamped to 100.
 */
export function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, progress));
}

// ─── Activity Location Config ────────────────────────────────────────────────

export const activityLocationConfig = {
  home: {
    label: "Casa",
    bgColor: "bg-purple-50",
    textColor: "text-[#8A05BE]",
  },
  office: {
    label: "Consultório",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
  },
  completed: {
    label: "Concluído",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
} as const;

export type ActivityLocation = keyof typeof activityLocationConfig;

/**
 * Returns the location info (label, bgColor, textColor) for an activity location string.
 * Returns undefined if the location is not a known activity location.
 */
export function getActivityLocationInfo(location: string): {
  label: string;
  bgColor: string;
  textColor: string;
} | undefined {
  if (location in activityLocationConfig) {
    return activityLocationConfig[location as ActivityLocation];
  }
  return undefined;
}

/**
 * Returns the Material Symbols icon name for a given activity location.
 */
export function getActivityLocationIcon(location: ActivityLocation): string {
  switch (location) {
    case "home":
      return "home";
    case "office":
      return "medical_services";
    case "completed":
      return "check_circle";
  }
}

/**
 * Returns the list of known activity location keys.
 */
export function getKnownActivityLocations(): ActivityLocation[] {
  return Object.keys(activityLocationConfig) as ActivityLocation[];
}
