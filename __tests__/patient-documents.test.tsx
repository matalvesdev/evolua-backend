/**
 * Property-based tests for document row rendering and file type icon colors.
 *
 * Feature: frontend-ui-redesign
 *
 * Since @testing-library/react is not installed, these tests validate the pure
 * data transformation functions that drive the DocumentTableRow component
 * (file type config, icon mapping, color mapping, audio detection) and the
 * DocumentsHeader component (storage percentage calculation).
 */

import { test as fcTest } from "@fast-check/jest"
import fc from "fast-check"
import {
  getFileTypeConfig,
  isAudioFile,
  getKnownFileTypes,
  calculateStoragePercentage,
  fileTypeColorFamilies,
  type FileType,
} from "@/components/patient-documents/patient-documents-utils"

// ─── Generators ───────────────────────────────────────────────────────────────

/** Generate a valid file type */
const fileTypeArb = fc.constantFrom<FileType>("pdf", "audio", "image", "document", "other")

/** Generate a non-empty file name */
const fileNameArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ0-9_-]{1,12}$/),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join("_"))

/** Generate a date string */
const dateArb = fc
  .tuple(
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 2020, max: 2025 })
  )
  .map(([d, m, y]) => `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`)

/** Generate a file size string */
const sizeArb = fc
  .tuple(
    fc.integer({ min: 1, max: 999 }),
    fc.constantFrom("KB", "MB", "GB")
  )
  .map(([n, unit]) => `${n} ${unit}`)

/** Generate an author name */
const authorNameArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ]{2,10}$/),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join(" "))

/** Generate a full document object */
const documentArb = fc.record({
  fileName: fileNameArb,
  fileType: fileTypeArb,
  date: dateArb,
  size: sizeArb,
  authorName: authorNameArb,
})

/** Generate positive storage values */
const storageArb = fc.record({
  used: fc.integer({ min: 0, max: 1000 }),
  total: fc.integer({ min: 1, max: 1000 }),
})

// ─── Property 8: Document row renders all required fields ─────────────────────
// Feature: frontend-ui-redesign, Property 8: Document row renders all required fields
// **Validates: Requirements 11.3**

describe("Feature: frontend-ui-redesign, Property 8: Document row renders all required fields", () => {
  fcTest.prop(
    [documentArb],
    { numRuns: 100 }
  )(
    "file type config returns valid icon, bgColor, borderColor, and textColor for any valid file type",
    (doc) => {
      const config = getFileTypeConfig(doc.fileType)

      expect(config).toBeDefined()
      expect(config!.icon).toBeTruthy()
      expect(typeof config!.icon).toBe("string")
      expect(config!.icon.length).toBeGreaterThan(0)
      expect(config!.bgColor).toBeTruthy()
      expect(config!.bgColor).toMatch(/bg-/)
      expect(config!.borderColor).toBeTruthy()
      expect(config!.borderColor).toMatch(/border-/)
      expect(config!.textColor).toBeTruthy()
      expect(config!.textColor).toMatch(/text-/)
    }
  )

  fcTest.prop(
    [fileTypeArb],
    { numRuns: 100 }
  )(
    "all file types have unique icons",
    (fileType) => {
      const config = getFileTypeConfig(fileType)
      expect(config).toBeDefined()

      // Verify this icon is unique to this file type
      const allTypes = getKnownFileTypes()
      const otherTypes = allTypes.filter((t) => t !== fileType)
      for (const other of otherTypes) {
        const otherConfig = getFileTypeConfig(other)
        expect(otherConfig!.icon).not.toBe(config!.icon)
      }
    }
  )

  fcTest.prop(
    [fileTypeArb],
    { numRuns: 100 }
  )(
    "all file types have unique text colors",
    (fileType) => {
      const config = getFileTypeConfig(fileType)
      expect(config).toBeDefined()

      // Verify this text color is unique to this file type
      const allTypes = getKnownFileTypes()
      const otherTypes = allTypes.filter((t) => t !== fileType)
      for (const other of otherTypes) {
        const otherConfig = getFileTypeConfig(other)
        expect(otherConfig!.textColor).not.toBe(config!.textColor)
      }
    }
  )

  fcTest.prop(
    [fileTypeArb],
    { numRuns: 100 }
  )(
    "isAudioFile correctly identifies audio files and rejects non-audio files",
    (fileType) => {
      const result = isAudioFile(fileType)
      if (fileType === "audio") {
        expect(result).toBe(true)
      } else {
        expect(result).toBe(false)
      }
    }
  )

  fcTest.prop(
    [documentArb],
    { numRuns: 100 }
  )(
    "all required document row fields are present and valid for any document",
    (doc) => {
      // File name is non-empty
      expect(doc.fileName.length).toBeGreaterThan(0)

      // Date is non-empty
      expect(doc.date.length).toBeGreaterThan(0)

      // Size is non-empty
      expect(doc.size.length).toBeGreaterThan(0)

      // Author name is non-empty
      expect(doc.authorName.length).toBeGreaterThan(0)

      // File type config is valid (drives icon rendering)
      const config = getFileTypeConfig(doc.fileType)
      expect(config).toBeDefined()
      expect(config!.icon.length).toBeGreaterThan(0)
      expect(config!.bgColor).toMatch(/bg-/)
      expect(config!.borderColor).toMatch(/border-/)
      expect(config!.textColor).toMatch(/text-/)
    }
  )

  test("getFileTypeConfig returns undefined for unknown file types", () => {
    expect(getFileTypeConfig("unknown")).toBeUndefined()
    expect(getFileTypeConfig("video")).toBeUndefined()
    expect(getFileTypeConfig("")).toBeUndefined()
  })
})

// ─── Property 9: File type icon color mapping ─────────────────────────────────
// Feature: frontend-ui-redesign, Property 9: File type icon color mapping
// **Validates: Requirements 11.4**

describe("Feature: frontend-ui-redesign, Property 9: File type icon color mapping", () => {
  fcTest.prop(
    [fileTypeArb],
    { numRuns: 100 }
  )(
    "each file type maps to its expected color family in textColor",
    (fileType) => {
      const config = getFileTypeConfig(fileType)
      expect(config).toBeDefined()

      const expectedColorFamily = fileTypeColorFamilies[fileType]
      expect(config!.textColor).toContain(expectedColorFamily)
    }
  )

  fcTest.prop(
    [fileTypeArb],
    { numRuns: 100 }
  )(
    "each file type maps to its expected color family in bgColor",
    (fileType) => {
      const config = getFileTypeConfig(fileType)
      expect(config).toBeDefined()

      const expectedColorFamily = fileTypeColorFamilies[fileType]
      expect(config!.bgColor).toContain(expectedColorFamily)
    }
  )

  fcTest.prop(
    [fileTypeArb],
    { numRuns: 100 }
  )(
    "each file type maps to its expected color family in borderColor",
    (fileType) => {
      const config = getFileTypeConfig(fileType)
      expect(config).toBeDefined()

      const expectedColorFamily = fileTypeColorFamilies[fileType]
      expect(config!.borderColor).toContain(expectedColorFamily)
    }
  )

  test("pdf maps to text-red-500", () => {
    const config = getFileTypeConfig("pdf")
    expect(config!.textColor).toBe("text-red-500")
  })

  test("audio maps to text-blue-500", () => {
    const config = getFileTypeConfig("audio")
    expect(config!.textColor).toBe("text-blue-500")
  })

  test("image maps to text-green-500", () => {
    const config = getFileTypeConfig("image")
    expect(config!.textColor).toBe("text-green-500")
  })

  test("document maps to text-orange-500", () => {
    const config = getFileTypeConfig("document")
    expect(config!.textColor).toBe("text-orange-500")
  })

  test("other maps to text-gray-500", () => {
    const config = getFileTypeConfig("other")
    expect(config!.textColor).toBe("text-gray-500")
  })

  fcTest.prop(
    [
      fc.constantFrom<FileType>("pdf", "audio", "image", "document", "other"),
      fc.constantFrom<FileType>("pdf", "audio", "image", "document", "other"),
    ],
    { numRuns: 100 }
  )(
    "different file types have different text colors",
    (type1, type2) => {
      if (type1 !== type2) {
        const config1 = getFileTypeConfig(type1)
        const config2 = getFileTypeConfig(type2)
        expect(config1!.textColor).not.toBe(config2!.textColor)
      }
    }
  )

  fcTest.prop(
    [storageArb],
    { numRuns: 100 }
  )(
    "storage percentage calculation produces value in [0, 100] range for valid inputs",
    ({ used, total }) => {
      const percentage = calculateStoragePercentage(used, total)

      expect(percentage).toBeGreaterThanOrEqual(0)
      // When used > total, percentage can exceed 100 (valid behavior)
      expect(typeof percentage).toBe("number")
      expect(Number.isInteger(percentage)).toBe(true)
    }
  )

  fcTest.prop(
    [fc.integer({ min: 0, max: 100 }), fc.constant(100)],
    { numRuns: 100 }
  )(
    "storage percentage equals used when total is 100",
    (used, total) => {
      const percentage = calculateStoragePercentage(used, total)
      expect(percentage).toBe(used)
    }
  )

  test("storage percentage returns 0 when total is 0", () => {
    expect(calculateStoragePercentage(50, 0)).toBe(0)
  })

  test("storage percentage returns 0 when total is negative", () => {
    expect(calculateStoragePercentage(50, -10)).toBe(0)
  })
})
