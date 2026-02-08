/**
 * Property-based tests for goal card rendering and activity item rendering.
 *
 * Feature: frontend-ui-redesign
 *
 * Since @testing-library/react is not installed, these tests validate the pure
 * data transformation functions that drive the GoalCard component (status config,
 * color schemes, progress clamping) and the ActivityChecklistItem component
 * (location config, location icons).
 */

import { test as fcTest } from "@fast-check/jest"
import fc from "fast-check"
import {
  getGoalStatusInfo,
  getGoalColorScheme,
  clampProgress,
  goalStatusConfig,
  goalColorSchemes,
  getActivityLocationInfo,
  getActivityLocationIcon,
  activityLocationConfig,
  type GoalStatus,
  type GoalColorScheme,
  type ActivityLocation,
} from "@/components/patient-goals/patient-goals-utils"

// ─── Generators ───────────────────────────────────────────────────────────────

/** Generate a valid goal status */
const goalStatusArb = fc.constantFrom<GoalStatus>("in-progress", "attention", "started")

/** Generate a valid color scheme */
const colorSchemeArb = fc.constantFrom<GoalColorScheme>("purple", "blue", "pink")

/** Generate a progress value in valid range [0, 100] */
const progressArb = fc.integer({ min: 0, max: 100 })

/** Generate a progress value that may be out of range [-1000, 1000] */
const wideProgressArb = fc.integer({ min: -1000, max: 1000 })

/** Generate a valid activity location */
const activityLocationArb = fc.constantFrom<ActivityLocation>("home", "office", "completed")

/** Generate a non-empty goal title */
const goalTitleArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ]{1,15}$/),
    { minLength: 1, maxLength: 5 }
  )
  .map((parts) => parts.join(" "))

/** Generate a non-empty goal description */
const goalDescriptionArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ]{1,12}$/),
    { minLength: 1, maxLength: 8 }
  )
  .map((parts) => parts.join(" "))

/** Generate a non-empty activity title */
const activityTitleArb = goalTitleArb

/** Generate a non-empty activity description */
const activityDescriptionArb = goalDescriptionArb

/** Generate a full goal object */
const goalArb = fc.record({
  title: goalTitleArb,
  description: goalDescriptionArb,
  progress: progressArb,
  status: goalStatusArb,
  colorScheme: colorSchemeArb,
})

/** Generate a full activity object */
const activityArb = fc.record({
  title: activityTitleArb,
  description: activityDescriptionArb,
  location: activityLocationArb,
})

// ─── Property 6: Goal card renders all required fields ────────────────────────
// Feature: frontend-ui-redesign, Property 6: Goal card renders all required fields
// **Validates: Requirements 10.3**

describe("Feature: frontend-ui-redesign, Property 6: Goal card renders all required fields", () => {
  fcTest.prop(
    [goalArb],
    { numRuns: 100 }
  )(
    "goal status config returns valid label and color for any valid status",
    (goal) => {
      const statusInfo = getGoalStatusInfo(goal.status)

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
    [goalArb],
    { numRuns: 100 }
  )(
    "color scheme returns valid styling classes for any valid scheme",
    (goal) => {
      const colors = getGoalColorScheme(goal.colorScheme)

      expect(colors).toBeDefined()
      expect(colors!.iconBg).toBeTruthy()
      expect(colors!.iconBg).toMatch(/bg-/)
      expect(colors!.iconText).toBeTruthy()
      expect(colors!.iconText).toMatch(/text-/)
      expect(colors!.progressBar).toBeTruthy()
      expect(colors!.progressBar).toMatch(/bg-/)
      expect(colors!.progressText).toBeTruthy()
      expect(colors!.progressText).toMatch(/text-/)
    }
  )

  fcTest.prop(
    [progressArb],
    { numRuns: 100 }
  )(
    "progress clamping preserves values already in [0, 100] range",
    (progress) => {
      const clamped = clampProgress(progress)

      expect(clamped).toBe(progress)
      expect(clamped).toBeGreaterThanOrEqual(0)
      expect(clamped).toBeLessThanOrEqual(100)
    }
  )

  fcTest.prop(
    [wideProgressArb],
    { numRuns: 100 }
  )(
    "progress clamping always produces a value in [0, 100] for any input",
    (progress) => {
      const clamped = clampProgress(progress)

      expect(clamped).toBeGreaterThanOrEqual(0)
      expect(clamped).toBeLessThanOrEqual(100)

      if (progress >= 0 && progress <= 100) {
        expect(clamped).toBe(progress)
      } else if (progress < 0) {
        expect(clamped).toBe(0)
      } else {
        expect(clamped).toBe(100)
      }
    }
  )

  fcTest.prop(
    [goalStatusArb],
    { numRuns: 100 }
  )(
    "known goal statuses map to their specific Portuguese labels",
    (status) => {
      const statusInfo = getGoalStatusInfo(status)

      const expectedLabels: Record<GoalStatus, string> = {
        "in-progress": "Em Andamento",
        "attention": "Atenção",
        "started": "Iniciado",
      }

      expect(statusInfo).toBeDefined()
      expect(statusInfo!.label).toBe(expectedLabels[status])
    }
  )

  fcTest.prop(
    [goalArb],
    { numRuns: 100 }
  )(
    "all required goal card fields are present and valid for any goal",
    (goal) => {
      // Title is non-empty
      expect(goal.title.length).toBeGreaterThan(0)

      // Description is non-empty
      expect(goal.description.length).toBeGreaterThan(0)

      // Progress is in valid range
      expect(goal.progress).toBeGreaterThanOrEqual(0)
      expect(goal.progress).toBeLessThanOrEqual(100)

      // Status config is valid
      const statusInfo = getGoalStatusInfo(goal.status)
      expect(statusInfo).toBeDefined()
      expect(statusInfo!.label.length).toBeGreaterThan(0)
      expect(statusInfo!.color.length).toBeGreaterThan(0)

      // Color scheme is valid (drives progress bar rendering)
      const colors = getGoalColorScheme(goal.colorScheme)
      expect(colors).toBeDefined()
      expect(colors!.progressBar).toMatch(/bg-/)
      expect(colors!.progressText).toMatch(/text-/)
    }
  )

  test("all goal statuses have unique labels", () => {
    const labels = Object.values(goalStatusConfig).map((s) => s.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  test("all color schemes have unique progress bar classes", () => {
    const progressBars = Object.values(goalColorSchemes).map((s) => s.progressBar)
    expect(new Set(progressBars).size).toBe(progressBars.length)
  })
})

// ─── Property 7: Activity item renders all required fields ────────────────────
// Feature: frontend-ui-redesign, Property 7: Activity item renders all required fields
// **Validates: Requirements 10.4**

describe("Feature: frontend-ui-redesign, Property 7: Activity item renders all required fields", () => {
  fcTest.prop(
    [activityArb],
    { numRuns: 100 }
  )(
    "activity location config returns valid label and colors for any valid location",
    (activity) => {
      const info = getActivityLocationInfo(activity.location)

      expect(info).toBeDefined()
      expect(info!.label).toBeTruthy()
      expect(typeof info!.label).toBe("string")
      expect(info!.label.length).toBeGreaterThan(0)
      expect(info!.bgColor).toBeTruthy()
      expect(info!.bgColor).toMatch(/bg-/)
      expect(info!.textColor).toBeTruthy()
      expect(info!.textColor).toMatch(/text-/)
    }
  )

  fcTest.prop(
    [activityLocationArb],
    { numRuns: 100 }
  )(
    "activity location icon returns a valid icon name for any valid location",
    (location) => {
      const icon = getActivityLocationIcon(location)

      expect(icon).toBeTruthy()
      expect(typeof icon).toBe("string")
      expect(icon.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [activityLocationArb],
    { numRuns: 100 }
  )(
    "known activity locations map to their specific Portuguese labels",
    (location) => {
      const info = getActivityLocationInfo(location)

      const expectedLabels: Record<ActivityLocation, string> = {
        home: "Casa",
        office: "Consultório",
        completed: "Concluído",
      }

      expect(info).toBeDefined()
      expect(info!.label).toBe(expectedLabels[location])
    }
  )

  fcTest.prop(
    [activityLocationArb],
    { numRuns: 100 }
  )(
    "known activity locations map to their specific icon names",
    (location) => {
      const icon = getActivityLocationIcon(location)

      const expectedIcons: Record<ActivityLocation, string> = {
        home: "home",
        office: "medical_services",
        completed: "check_circle",
      }

      expect(icon).toBe(expectedIcons[location])
    }
  )

  fcTest.prop(
    [activityArb],
    { numRuns: 100 }
  )(
    "all required activity item fields are present and valid for any activity",
    (activity) => {
      // Title is non-empty
      expect(activity.title.length).toBeGreaterThan(0)

      // Description is non-empty
      expect(activity.description.length).toBeGreaterThan(0)

      // Location tag config is valid
      const locationInfo = getActivityLocationInfo(activity.location)
      expect(locationInfo).toBeDefined()
      expect(locationInfo!.label.length).toBeGreaterThan(0)
      expect(locationInfo!.bgColor).toMatch(/bg-/)
      expect(locationInfo!.textColor).toMatch(/text-/)

      // Location icon is valid
      const icon = getActivityLocationIcon(activity.location)
      expect(icon.length).toBeGreaterThan(0)
    }
  )

  test("all activity locations have unique labels", () => {
    const labels = Object.values(activityLocationConfig).map((l) => l.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  test("all activity locations have unique text colors", () => {
    const textColors = Object.values(activityLocationConfig).map((l) => l.textColor)
    expect(new Set(textColors).size).toBe(textColors.length)
  })

  fcTest.prop(
    [
      fc.constantFrom<ActivityLocation>("home", "office", "completed"),
      fc.constantFrom<ActivityLocation>("home", "office", "completed"),
    ],
    { numRuns: 100 }
  )(
    "different locations have different text colors",
    (loc1, loc2) => {
      if (loc1 !== loc2) {
        const info1 = getActivityLocationInfo(loc1)
        const info2 = getActivityLocationInfo(loc2)
        expect(info1!.textColor).not.toBe(info2!.textColor)
      }
    }
  )
})
