/**
 * Property-based tests for communication timeline ordering, entry rendering,
 * and channel icon colors.
 *
 * Feature: frontend-ui-redesign
 *
 * Since @testing-library/react is not installed, these tests validate the pure
 * data transformation functions that drive the CommunicationTimelineItem component
 * (channel type config, icon mapping, color mapping), the CommunicationTimeline
 * component (timeline ordering), and status rendering (status labels and colors).
 */

import { test as fcTest } from "@fast-check/jest"
import fc from "fast-check"
import {
  getChannelConfig,
  getKnownChannelTypes,
  getCommunicationStatusInfo,
  getKnownCommunicationStatuses,
  sortTimelineGroupsByDate,
  isTimelineOrderedDescending,
  channelTypeConfig,
  communicationStatusConfig,
  channelColorFamilies,
  type ChannelType,
  type CommunicationStatus,
} from "@/components/patient-communication/patient-communication-utils"

// ─── Generators ───────────────────────────────────────────────────────────────

/** Generate a valid channel type (outbound channels only: whatsapp, sms, email) */
const outboundChannelArb = fc.constantFrom<ChannelType>("whatsapp", "sms", "email")

/** Generate any valid channel type (including received) */
const channelTypeArb = fc.constantFrom<ChannelType>("whatsapp", "sms", "email", "received")

/** Generate a valid communication status */
const communicationStatusArb = fc.constantFrom<CommunicationStatus>(
  "sent", "delivered", "read", "confirmed", "system", "received"
)

/** Generate a non-empty sender name */
const senderNameArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ]{2,10}$/),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join(" "))

/** Generate a non-empty subject/message text */
const messageTextArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ0-9]{1,12}$/),
    { minLength: 1, maxLength: 8 }
  )
  .map((parts) => parts.join(" "))

/** Generate a time string (HH:MM format) */
const timeArb = fc
  .tuple(
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 })
  )
  .map(([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)

/** Generate a valid ISO date string for timeline groups */
const isoDateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)

/** Generate a timeline group with a date */
const timelineGroupArb = isoDateArb.map((date) => ({ date }))

/** Generate a list of timeline groups */
const timelineGroupsArb = fc.array(timelineGroupArb, { minLength: 0, maxLength: 20 })

/** Generate a full communication entry object */
const communicationEntryArb = fc.record({
  channel: channelTypeArb,
  status: communicationStatusArb,
  sender: senderNameArb,
  time: timeArb,
  message: messageTextArb,
})

// ─── Property 10: Communication timeline ordering ─────────────────────────────
// Feature: frontend-ui-redesign, Property 10: Communication timeline ordering
// **Validates: Requirements 12.1**

describe("Feature: frontend-ui-redesign, Property 10: Communication timeline ordering", () => {
  fcTest.prop(
    [timelineGroupsArb],
    { numRuns: 100 }
  )(
    "sortTimelineGroupsByDate produces descending order for any list of groups",
    (groups) => {
      const sorted = sortTimelineGroupsByDate(groups)

      // The sorted result should be in descending order
      expect(isTimelineOrderedDescending(sorted)).toBe(true)
    }
  )

  fcTest.prop(
    [timelineGroupsArb],
    { numRuns: 100 }
  )(
    "sortTimelineGroupsByDate preserves all elements (same length, same dates)",
    (groups) => {
      const sorted = sortTimelineGroupsByDate(groups)

      // Same number of elements
      expect(sorted.length).toBe(groups.length)

      // Same set of dates (sorted)
      const originalDates = groups.map((g) => g.date).sort()
      const sortedDates = sorted.map((g) => g.date).sort()
      expect(sortedDates).toEqual(originalDates)
    }
  )

  fcTest.prop(
    [timelineGroupsArb],
    { numRuns: 100 }
  )(
    "sortTimelineGroupsByDate does not mutate the original array",
    (groups) => {
      const originalCopy = groups.map((g) => ({ ...g }))
      sortTimelineGroupsByDate(groups)

      // Original array should be unchanged
      expect(groups).toEqual(originalCopy)
    }
  )

  fcTest.prop(
    [timelineGroupsArb],
    { numRuns: 100 }
  )(
    "isTimelineOrderedDescending validates sorted arrays correctly",
    (groups) => {
      const sorted = sortTimelineGroupsByDate(groups)

      // A sorted array should always pass the ordering check
      expect(isTimelineOrderedDescending(sorted)).toBe(true)
    }
  )

  test("empty array is always ordered", () => {
    expect(isTimelineOrderedDescending([])).toBe(true)
  })

  test("single-element array is always ordered", () => {
    expect(isTimelineOrderedDescending([{ date: "2024-01-15" }])).toBe(true)
  })

  test("correctly ordered descending array passes check", () => {
    const groups = [
      { date: "2024-03-15" },
      { date: "2024-02-10" },
      { date: "2024-01-05" },
    ]
    expect(isTimelineOrderedDescending(groups)).toBe(true)
  })

  test("incorrectly ordered array fails check", () => {
    const groups = [
      { date: "2024-01-05" },
      { date: "2024-02-10" },
      { date: "2024-03-15" },
    ]
    expect(isTimelineOrderedDescending(groups)).toBe(false)
  })

  fcTest.prop(
    [timelineGroupsArb],
    { numRuns: 100 }
  )(
    "sorting an already sorted array produces the same result (idempotent)",
    (groups) => {
      const sorted1 = sortTimelineGroupsByDate(groups)
      const sorted2 = sortTimelineGroupsByDate(sorted1)

      expect(sorted2).toEqual(sorted1)
    }
  )
})

// ─── Property 11: Communication entry renders all required fields ─────────────
// Feature: frontend-ui-redesign, Property 11: Communication entry renders all required fields
// **Validates: Requirements 12.2**

describe("Feature: frontend-ui-redesign, Property 11: Communication entry renders all required fields", () => {
  fcTest.prop(
    [communicationEntryArb],
    { numRuns: 100 }
  )(
    "channel config returns valid icon and colors for any valid channel",
    (entry) => {
      const config = getChannelConfig(entry.channel)

      expect(config).toBeDefined()
      expect(config!.icon).toBeTruthy()
      expect(typeof config!.icon).toBe("string")
      expect(config!.icon.length).toBeGreaterThan(0)
      expect(config!.bgColor).toBeTruthy()
      expect(config!.bgColor).toMatch(/bg-/)
      expect(config!.textColor).toBeTruthy()
      expect(config!.textColor).toMatch(/text-/)
      expect(config!.colorFamily).toBeTruthy()
      expect(typeof config!.colorFamily).toBe("string")
    }
  )

  fcTest.prop(
    [communicationEntryArb],
    { numRuns: 100 }
  )(
    "status config returns valid label and color for any valid status",
    (entry) => {
      const statusInfo = getCommunicationStatusInfo(entry.status)

      expect(statusInfo).toBeDefined()
      expect(statusInfo!.label).toBeTruthy()
      expect(typeof statusInfo!.label).toBe("string")
      expect(statusInfo!.label.length).toBeGreaterThan(0)
      expect(statusInfo!.color).toBeTruthy()
      expect(typeof statusInfo!.color).toBe("string")
      expect(statusInfo!.color.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [communicationEntryArb],
    { numRuns: 100 }
  )(
    "all required communication entry fields are present and valid for any entry",
    (entry) => {
      // Sender is non-empty
      expect(entry.sender.length).toBeGreaterThan(0)

      // Time is non-empty
      expect(entry.time.length).toBeGreaterThan(0)

      // Message is non-empty
      expect(entry.message.length).toBeGreaterThan(0)

      // Channel config is valid (drives icon rendering)
      const config = getChannelConfig(entry.channel)
      expect(config).toBeDefined()
      expect(config!.icon.length).toBeGreaterThan(0)
      expect(config!.bgColor).toMatch(/bg-/)
      expect(config!.textColor).toMatch(/text-/)

      // Status config is valid (drives status badge rendering)
      const statusInfo = getCommunicationStatusInfo(entry.status)
      expect(statusInfo).toBeDefined()
      expect(statusInfo!.label.length).toBeGreaterThan(0)
      expect(statusInfo!.color.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [communicationStatusArb],
    { numRuns: 100 }
  )(
    "known statuses map to their specific Portuguese labels",
    (status) => {
      const statusInfo = getCommunicationStatusInfo(status)

      const expectedLabels: Record<CommunicationStatus, string> = {
        sent: "Enviada",
        delivered: "Entregue",
        read: "Lida",
        confirmed: "Confirmado",
        system: "Sistema",
        received: "Recebida",
      }

      expect(statusInfo).toBeDefined()
      expect(statusInfo!.label).toBe(expectedLabels[status])
    }
  )

  test("getChannelConfig returns undefined for unknown channel types", () => {
    expect(getChannelConfig("unknown")).toBeUndefined()
    expect(getChannelConfig("telegram")).toBeUndefined()
    expect(getChannelConfig("")).toBeUndefined()
  })

  test("getCommunicationStatusInfo returns undefined for unknown statuses", () => {
    expect(getCommunicationStatusInfo("unknown")).toBeUndefined()
    expect(getCommunicationStatusInfo("pending")).toBeUndefined()
    expect(getCommunicationStatusInfo("")).toBeUndefined()
  })

  test("all communication statuses have non-empty labels", () => {
    const statuses = getKnownCommunicationStatuses()
    for (const status of statuses) {
      const info = getCommunicationStatusInfo(status)
      expect(info).toBeDefined()
      expect(info!.label.length).toBeGreaterThan(0)
    }
  })
})

// ─── Property 12: Channel icon color differentiation ──────────────────────────
// Feature: frontend-ui-redesign, Property 12: Channel icon color differentiation
// **Validates: Requirements 12.3**

describe("Feature: frontend-ui-redesign, Property 12: Channel icon color differentiation", () => {
  fcTest.prop(
    [outboundChannelArb],
    { numRuns: 100 }
  )(
    "each outbound channel maps to its expected color family",
    (channel) => {
      const config = getChannelConfig(channel)
      expect(config).toBeDefined()

      const expectedColorFamily = channelColorFamilies[channel]
      expect(config!.colorFamily).toBe(expectedColorFamily)
    }
  )

  test("whatsapp has green color family with bg-green-500", () => {
    const config = getChannelConfig("whatsapp")
    expect(config).toBeDefined()
    expect(config!.colorFamily).toBe("green")
    expect(config!.bgColor).toBe("bg-green-500")
  })

  test("sms has blue color family with text-blue-600", () => {
    const config = getChannelConfig("sms")
    expect(config).toBeDefined()
    expect(config!.colorFamily).toBe("blue")
    expect(config!.textColor).toBe("text-blue-600")
  })

  test("email has purple color family with text-[#8A05BE]", () => {
    const config = getChannelConfig("email")
    expect(config).toBeDefined()
    expect(config!.colorFamily).toBe("purple")
    expect(config!.textColor).toBe("text-[#8A05BE]")
  })

  fcTest.prop(
    [
      fc.constantFrom<ChannelType>("whatsapp", "sms", "email"),
      fc.constantFrom<ChannelType>("whatsapp", "sms", "email"),
    ],
    { numRuns: 100 }
  )(
    "different outbound channels have different color families",
    (channel1, channel2) => {
      if (channel1 !== channel2) {
        const config1 = getChannelConfig(channel1)
        const config2 = getChannelConfig(channel2)
        expect(config1!.colorFamily).not.toBe(config2!.colorFamily)
      }
    }
  )

  fcTest.prop(
    [channelTypeArb],
    { numRuns: 100 }
  )(
    "every channel type has a non-empty icon name",
    (channel) => {
      const config = getChannelConfig(channel)
      expect(config).toBeDefined()
      expect(config!.icon).toBeTruthy()
      expect(config!.icon.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [outboundChannelArb],
    { numRuns: 100 }
  )(
    "each outbound channel has a unique icon",
    (channel) => {
      const config = getChannelConfig(channel)
      expect(config).toBeDefined()

      const otherChannels: ChannelType[] = (["whatsapp", "sms", "email"] as ChannelType[]).filter(
        (c) => c !== channel
      )
      for (const other of otherChannels) {
        const otherConfig = getChannelConfig(other)
        expect(otherConfig!.icon).not.toBe(config!.icon)
      }
    }
  )

  test("all known channel types have valid configurations", () => {
    const channels = getKnownChannelTypes()
    expect(channels.length).toBeGreaterThanOrEqual(3)

    for (const channel of channels) {
      const config = getChannelConfig(channel)
      expect(config).toBeDefined()
      expect(config!.icon.length).toBeGreaterThan(0)
      expect(config!.bgColor).toMatch(/bg-/)
      expect(config!.textColor).toMatch(/text-/)
      expect(config!.colorFamily.length).toBeGreaterThan(0)
    }
  })
})
