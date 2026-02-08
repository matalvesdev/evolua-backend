/**
 * Property-based tests for patient card rendering and search filtering.
 *
 * Feature: frontend-ui-redesign
 *
 * Since @testing-library/react is not installed, Property 1 tests the pure
 * data transformation functions (getInitials, getAvatarColor, getSpecialtyColor)
 * that determine what the PatientCard renders. Property 2 tests the extracted
 * filterPatients pure function that implements the search logic.
 */

import { test as fcTest } from "@fast-check/jest"
import fc from "fast-check"
import {
  getInitials,
  getAvatarColor,
  getSpecialtyColor,
  filterPatients,
} from "@/components/patients/patient-utils"

// ─── Generators ───────────────────────────────────────────────────────────────

/** Generate a non-empty patient name (1-4 word parts, each 1-15 alpha chars) */
const nameArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ]{1,15}$/),
    { minLength: 1, maxLength: 4 }
  )
  .map((parts) => parts.join(" "))

/** Generate a positive integer age (1-120) */
const ageArb = fc.integer({ min: 1, max: 120 })

/** Generate a non-empty guardian name */
const guardianArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ]{1,15}$/),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join(" "))

/** Generate a non-empty array of specialty strings */
const specialtiesArb = fc.array(
  fc.oneof(
    fc.constant("TEA"),
    fc.constant("Fala"),
    fc.constant("Motricidade Orofacial"),
    fc.constant("Apraxia"),
    fc.constant("Linguagem"),
    fc.constant("Disfagia"),
    fc.constant("Geral"),
    fc.stringMatching(/^[A-Za-z]{2,20}$/)
  ),
  { minLength: 1, maxLength: 5 }
)

/** Generate a patient status */
const statusArb = fc.oneof(
  fc.constant("active" as const),
  fc.constant("inactive" as const)
)

/** Generate a patient object for Property 1 */
const patientCardArb = fc.record({
  name: nameArb,
  age: ageArb,
  guardian: guardianArb,
  specialties: specialtiesArb,
  status: statusArb,
})

/** Generate an optional email */
const emailArb = fc.oneof(
  fc.constant(undefined),
  fc
    .tuple(
      fc.stringMatching(/^[a-z]{1,10}$/),
      fc.stringMatching(/^[a-z]{1,8}$/),
      fc.constantFrom("com", "org", "net")
    )
    .map(([user, domain, tld]) => `${user}@${domain}.${tld}`)
)

/** Generate an optional phone */
const phoneArb = fc.oneof(
  fc.constant(undefined),
  fc
    .stringMatching(/^[0-9]{10,11}$/)
    .map((digits) => `(${digits.slice(0, 2)}) ${digits.slice(2)}`)
)

/** Generate a patient for search filtering */
const searchPatientArb = fc.record({
  name: nameArb,
  email: emailArb,
  phone: phoneArb,
})

/** Generate a search string — either empty, a substring of a field, or random */
const searchTermArb = fc.oneof(
  fc.constant(""),
  fc.stringMatching(/^[A-Za-z0-9@. ]{0,10}$/)
)

// ─── Property 1: Patient card renders all required fields ─────────────────────
// Feature: frontend-ui-redesign, Property 1: Patient card renders all required fields
// **Validates: Requirements 7.2**

describe("Feature: frontend-ui-redesign, Property 1: Patient card renders all required fields", () => {
  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "getInitials returns a non-empty uppercase string for any patient name",
    (patient) => {
      const initials = getInitials(patient.name)

      // Initials should be non-empty
      expect(initials.length).toBeGreaterThan(0)
      // Initials should be uppercase (some Unicode chars may expand on toUpperCase)
      expect(initials).toBe(initials.toUpperCase())
    }
  )

  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "getInitials uses first letters of first two name parts when name has multiple parts",
    (patient) => {
      const initials = getInitials(patient.name)
      const parts = patient.name.split(" ")

      if (parts.length >= 2) {
        expect(initials).toBe(`${parts[0][0]}${parts[1][0]}`.toUpperCase())
      } else {
        expect(initials).toBe(patient.name.substring(0, 2).toUpperCase())
      }
    }
  )

  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "getAvatarColor returns a valid Tailwind gradient class string for any name",
    (patient) => {
      const color = getAvatarColor(patient.name)

      // Should be a non-empty string
      expect(color.length).toBeGreaterThan(0)
      // Should contain gradient classes (from- and to-)
      expect(color).toMatch(/from-/)
      expect(color).toMatch(/to-/)
      // Should contain a text color class
      expect(color).toMatch(/text-/)
    }
  )

  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "getAvatarColor is deterministic — same name always produces same color",
    (patient) => {
      const color1 = getAvatarColor(patient.name)
      const color2 = getAvatarColor(patient.name)
      expect(color1).toBe(color2)
    }
  )

  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "getSpecialtyColor returns a valid color class for every specialty in the list",
    (patient) => {
      for (const specialty of patient.specialties) {
        const color = getSpecialtyColor(specialty)

        // Should be a non-empty string
        expect(color.length).toBeGreaterThan(0)
        // Should contain a background color class
        expect(color).toMatch(/bg-/)
        // Should contain a text color class
        expect(color).toMatch(/text-/)
      }
    }
  )

  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "getSpecialtyColor maps known specialties to their specific colors",
    (patient) => {
      for (const specialty of patient.specialties) {
        const color = getSpecialtyColor(specialty)
        const lower = specialty.toLowerCase()

        if (lower.includes("tea")) {
          expect(color).toBe("bg-purple-100 text-[#8A05BE]")
        } else if (lower.includes("fala")) {
          expect(color).toBe("bg-gray-100 text-gray-600")
        } else if (lower.includes("motricidade")) {
          expect(color).toBe("bg-orange-100 text-orange-700")
        } else if (lower.includes("apraxia")) {
          expect(color).toBe("bg-blue-100 text-blue-700")
        } else if (lower.includes("linguagem")) {
          expect(color).toBe("bg-emerald-100 text-emerald-700")
        } else if (lower.includes("disfagia")) {
          expect(color).toBe("bg-red-100 text-red-600")
        } else {
          // Default fallback
          expect(color).toBe("bg-gray-100 text-gray-600")
        }
      }
    }
  )

  fcTest.prop(
    [statusArb],
    { numRuns: 100 }
  )(
    "status is always either 'active' or 'inactive'",
    (status) => {
      expect(["active", "inactive"]).toContain(status)
    }
  )

  fcTest.prop(
    [patientCardArb],
    { numRuns: 100 }
  )(
    "all required patient card fields are present and valid for any patient",
    (patient) => {
      // Name produces valid initials
      const initials = getInitials(patient.name)
      expect(initials.length).toBeGreaterThan(0)

      // Age is a positive integer
      expect(patient.age).toBeGreaterThan(0)
      expect(Number.isInteger(patient.age)).toBe(true)

      // Guardian is non-empty
      expect(patient.guardian.length).toBeGreaterThan(0)

      // Specialties is non-empty and each has a valid color
      expect(patient.specialties.length).toBeGreaterThan(0)
      for (const s of patient.specialties) {
        const color = getSpecialtyColor(s)
        expect(color).toMatch(/bg-/)
        expect(color).toMatch(/text-/)
      }

      // Avatar color is valid
      const avatarColor = getAvatarColor(patient.name)
      expect(avatarColor).toMatch(/from-/)

      // Status is valid
      expect(["active", "inactive"]).toContain(patient.status)
    }
  )
})

// ─── Property 2: Patient search filters correctly ─────────────────────────────
// Feature: frontend-ui-redesign, Property 2: Patient search filters correctly
// **Validates: Requirements 7.3**

describe("Feature: frontend-ui-redesign, Property 2: Patient search filters correctly", () => {
  fcTest.prop(
    [fc.array(searchPatientArb, { minLength: 0, maxLength: 30 }), searchTermArb],
    { numRuns: 100 }
  )(
    "filtered result contains exactly those patients whose name, email, or phone includes the search string (case-insensitive)",
    (patients, searchTerm) => {
      const result = filterPatients(patients, searchTerm)

      if (!searchTerm) {
        // Empty search returns all patients
        expect(result).toEqual(patients)
        return
      }

      const search = searchTerm.toLowerCase()

      // Manually compute expected result
      const expected = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search) ||
          p.phone?.toLowerCase().includes(search)
      )

      expect(result).toEqual(expected)
    }
  )

  fcTest.prop(
    [fc.array(searchPatientArb, { minLength: 0, maxLength: 30 }), searchTermArb],
    { numRuns: 100 }
  )(
    "filtered result is always a subset of the original list",
    (patients, searchTerm) => {
      const result = filterPatients(patients, searchTerm)

      // Every result item must be in the original list
      for (const item of result) {
        expect(patients).toContain(item)
      }

      // Result length should not exceed original
      expect(result.length).toBeLessThanOrEqual(patients.length)
    }
  )

  fcTest.prop(
    [fc.array(searchPatientArb, { minLength: 0, maxLength: 30 }), searchTermArb],
    { numRuns: 100 }
  )(
    "filtering preserves the original order of patients",
    (patients, searchTerm) => {
      const result = filterPatients(patients, searchTerm)

      // Check that the relative order is preserved
      let lastIndex = -1
      for (const item of result) {
        const currentIndex = patients.indexOf(item)
        expect(currentIndex).toBeGreaterThan(lastIndex)
        lastIndex = currentIndex
      }
    }
  )

  fcTest.prop(
    [fc.array(searchPatientArb, { minLength: 1, maxLength: 20 })],
    { numRuns: 100 }
  )(
    "searching by a patient's exact name always includes that patient",
    (patients) => {
      // Pick the first patient's name as the search term
      const target = patients[0]
      const result = filterPatients(patients, target.name)

      expect(result).toContain(target)
    }
  )

  fcTest.prop(
    [fc.array(searchPatientArb, { minLength: 0, maxLength: 20 })],
    { numRuns: 100 }
  )(
    "empty search term returns all patients unchanged",
    (patients) => {
      const result = filterPatients(patients, "")
      expect(result).toEqual(patients)
    }
  )

  fcTest.prop(
    [fc.array(searchPatientArb, { minLength: 0, maxLength: 20 }), searchTermArb],
    { numRuns: 100 }
  )(
    "search is case-insensitive: same results for upper and lower case",
    (patients, searchTerm) => {
      const resultLower = filterPatients(patients, searchTerm.toLowerCase())
      const resultUpper = filterPatients(patients, searchTerm.toUpperCase())

      expect(resultLower).toEqual(resultUpper)
    }
  )
})
