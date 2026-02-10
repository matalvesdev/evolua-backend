/**
 * Pure utility functions extracted from patient communication components for testability.
 *
 * These functions handle data transformation for communication timeline item rendering
 * (channel type config, icon mapping, color mapping), communication status rendering
 * (status labels and colors), and timeline ordering (sorting groups by date).
 */

// ─── Channel Type Config ─────────────────────────────────────────────────────

export const channelTypeConfig = {
  whatsapp: {
    icon: "forum",
    bgColor: "bg-green-500",
    shadowColor: "shadow-green-200",
    textColor: "text-white",
    colorFamily: "green",
  },
  sms: {
    icon: "sms",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    colorFamily: "blue",
  },
  email: {
    icon: "mail",
    bgColor: "bg-purple-50",
    textColor: "text-[#8A05BE]",
    colorFamily: "purple",
  },
  received: {
    icon: "forum",
    bgColor: "bg-white",
    textColor: "text-green-600",
    borderColor: "border-green-100",
    colorFamily: "green",
  },
} as const;

export type ChannelType = keyof typeof channelTypeConfig;

/**
 * Returns the channel configuration (icon, bgColor, textColor, colorFamily)
 * for a given channel type string.
 * Returns undefined if the channel type is not a known channel type.
 */
export function getChannelConfig(channel: string): {
  icon: string;
  bgColor: string;
  textColor: string;
  colorFamily: string;
} | undefined {
  if (channel in channelTypeConfig) {
    return channelTypeConfig[channel as ChannelType];
  }
  return undefined;
}

/**
 * Returns the list of known channel type keys.
 */
export function getKnownChannelTypes(): ChannelType[] {
  return Object.keys(channelTypeConfig) as ChannelType[];
}

// ─── Communication Status Config ─────────────────────────────────────────────

export const communicationStatusConfig = {
  sent: { label: "Enviada", color: "green" },
  delivered: { label: "Entregue", color: "blue" },
  read: { label: "Lida", color: "blue" },
  confirmed: { label: "Confirmado", color: "green" },
  system: { label: "Sistema", color: "gray" },
  received: { label: "Recebida", color: "green" },
} as const;

export type CommunicationStatus = keyof typeof communicationStatusConfig;

/**
 * Returns the status info (label and color) for a communication status string.
 * Returns undefined if the status is not a known communication status.
 */
export function getCommunicationStatusInfo(status: string): {
  label: string;
  color: string;
} | undefined {
  if (status in communicationStatusConfig) {
    return communicationStatusConfig[status as CommunicationStatus];
  }
  return undefined;
}

/**
 * Returns the list of known communication status keys.
 */
export function getKnownCommunicationStatuses(): CommunicationStatus[] {
  return Object.keys(communicationStatusConfig) as CommunicationStatus[];
}

// ─── Timeline Ordering ───────────────────────────────────────────────────────

/**
 * Sorts timeline groups by date in descending order (most recent first).
 * Returns a new array without mutating the input.
 */
export function sortTimelineGroupsByDate(groups: { date: string }[]): { date: string }[] {
  return [...groups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Checks whether an array of timeline groups is ordered in descending date order
 * (most recent first). Empty and single-element arrays are always considered ordered.
 */
export function isTimelineOrderedDescending(groups: { date: string }[]): boolean {
  for (let i = 1; i < groups.length; i++) {
    if (new Date(groups[i].date).getTime() > new Date(groups[i - 1].date).getTime()) {
      return false;
    }
  }
  return true;
}

// ─── Expected Color Mappings ─────────────────────────────────────────────────

/**
 * Maps communication channels to their expected color families.
 * Used for validation that each channel has the correct color.
 * Note: Only the three primary outbound channels are mapped here (whatsapp, sms, email).
 */
export const channelColorFamilies: Record<string, string> = {
  whatsapp: "green",
  sms: "blue",
  email: "purple",
} as const;
