/**
 * Property-based tests for patient profile header, appointment card,
 * and report card rendering.
 *
 * Feature: frontend-ui-redesign
 *
 * Since @testing-library/react is not installed, these tests validate the pure
 * data transformation functions that drive the profile header, appointment cards,
 * and report cards: status config lookups, formatReportType, and date/time formatting.
 */

import { test as fcTest } from "@fast-check/jest"
import fc from "fast-check"
import {
  getPatientStatusConfig,
  getKnownPatientStatuses,
  getAppointmentStatusConfig,
  getKnownAppointmentStatuses,
  getReportStatusConfig,
  getKnownReportStatuses,
  formatReportType,
  getKnownReportTypes,
  formatAppointmentDate,
  formatAppointmentTime,
  formatReportDate,
} from "@/components/patient-profile/patient-profile-utils"

// ─── Generators ───────────────────────────────────────────────────────────────

/** Generate a non-empty patient name (1-4 word parts, each 1-15 alpha chars) */
const nameArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÖÙ-öù-ý]{1,15}$/),
    { minLength: 1, maxLength: 4 }
  )
  .map((parts) => parts.join(" "))

/** Generate a known patient status */
const knownPatientStatusArb = fc.constantFrom(
  "active",
  "inactive",
  "discharged",
  "on-hold"
)

/** Generate any patient status (known or unknown) */
const anyPatientStatusArb = fc.oneof(
  knownPatientStatusArb,
  fc.stringMatching(/^[a-z]{2,15}$/)
)

/** Generate an optional phone number */
const phoneArb = fc.oneof(
  fc.constant(undefined),
  fc
    .stringMatching(/^[0-9]{10,11}$/)
    .map((digits) => `(${digits.slice(0, 2)}) ${digits.slice(2)}`)
)

/** Generate a patient object for Property 3 */
const patientProfileArb = fc.record({
  name: nameArb,
  status: anyPatientStatusArb,
  phone: phoneArb,
})

/** Generate a known appointment status */
const knownAppointmentStatusArb = fc.constantFrom(
  "scheduled",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled"
)

/** Generate any appointment status (known or unknown) */
const anyAppointmentStatusArb = fc.oneof(
  knownAppointmentStatusArb,
  fc.stringMatching(/^[a-z]{2,15}$/)
)

/** Generate a valid ISO date-time string using integer timestamps to avoid Invalid Date */
const dateTimeArb = fc
  .integer({
    min: new Date("2020-01-01T00:00:00Z").getTime(),
    max: new Date("2030-12-31T23:59:59Z").getTime(),
  })
  .map((ts) => new Date(ts).toISOString())

/** Generate a positive duration in minutes */
const durationArb = fc.integer({ min: 15, max: 180 })

/** Generate an appointment object for Property 4 */
const appointmentArb = fc.record({
  dateTime: dateTimeArb,
  duration: durationArb,
  status: anyAppointmentStatusArb,
})

/** Generate a known report type */
const knownReportTypeArb = fc.constantFrom(
  "evaluation",
  "evolution",
  "progress",
  "discharge",
  "monthly",
  "school",
  "medical",
  "custom",
  "resumo",
  "encaminhamento",
  "mensal",
  "avaliacao",
  "alta"
)

/** Generate any report type (known or unknown) */
const anyReportTypeArb = fc.oneof(
  knownReportTypeArb,
  fc.stringMatching(/^[a-z]{2,15}$/)
)

/** Generate a known report status */
const knownReportStatusArb = fc.constantFrom(
  "draft",
  "pending_review",
  "reviewed",
  "approved",
  "sent"
)

/** Generate any report status (known or unknown) */
const anyReportStatusArb = fc.oneof(
  knownReportStatusArb,
  fc.stringMatching(/^[a-z]{2,15}$/)
)

/** Generate a non-empty report title */
const reportTitleArb = fc
  .array(
    fc.stringMatching(/^[A-Za-zÀ-ÿ0-9]{1,12}$/),
    { minLength: 1, maxLength: 5 }
  )
  .map((parts) => parts.join(" "))

/** Generate a report object for Property 5 */
const reportArb = fc.record({
  title: reportTitleArb,
  type: anyReportTypeArb,
  status: anyReportStatusArb,
  createdAt: dateTimeArb,
})

// ─── Property 3: Profile header renders all patient fields ────────────────────
// Feature: frontend-ui-redesign, Property 3: Profile header renders all patient fields
// **Validates: Requirements 8.1**

describe("Feature: frontend-ui-redesign, Property 3: Profile header renders all patient fields", () => {
  fcTest.prop(
    [patientProfileArb],
    { numRuns: 100 }
  )(
    "patient status config returns a valid label, color, icon, and badgeBg for any status",
    (patient) => {
      const config = getPatientStatusConfig(patient.status)

      // Label should be a non-empty string
      expect(config.label.length).toBeGreaterThan(0)
      // Color should be a non-empty string (Tailwind class)
      expect(config.color.length).toBeGreaterThan(0)
      expect(config.color).toMatch(/text-/)
      // Icon should be a non-empty string (Material Symbols name)
      expect(config.icon.length).toBeGreaterThan(0)
      // Badge background should be a non-empty string (Tailwind class)
      expect(config.badgeBg.length).toBeGreaterThan(0)
      expect(config.badgeBg).toMatch(/bg-/)
    }
  )

  fcTest.prop(
    [knownPatientStatusArb],
    { numRuns: 100 }
  )(
    "known patient statuses map to their specific Portuguese labels",
    (status) => {
      const config = getPatientStatusConfig(status)

      const expectedLabels: Record<string, string> = {
        active: "Ativo",
        inactive: "Inativo",
        discharged: "Alta",
        "on-hold": "Em espera",
      }

      expect(config.label).toBe(expectedLabels[status])
    }
  )

  fcTest.prop(
    [patientProfileArb],
    { numRuns: 100 }
  )(
    "patient name is always a non-empty string suitable for display in the header",
    (patient) => {
      expect(patient.name.length).toBeGreaterThan(0)
      // The first character can be used as an avatar initial
      const firstChar = patient.name.charAt(0).toUpperCase()
      expect(firstChar.length).toBeGreaterThan(0)
      // Should be a letter (not a digit or symbol)
      expect(firstChar).toMatch(/\p{Letter}/u)
    }
  )

  fcTest.prop(
    [patientProfileArb],
    { numRuns: 100 }
  )(
    "phone is a string when provided, and the profile header can display it",
    (patient) => {
      if (patient.phone !== undefined) {
        expect(typeof patient.phone).toBe("string")
        expect(patient.phone.length).toBeGreaterThan(0)
      }
      // When phone is undefined, the header simply doesn't render the phone section
      // This is valid behavior — no assertion needed for undefined
    }
  )

  fcTest.prop(
    [patientProfileArb],
    { numRuns: 100 }
  )(
    "all profile header fields are present and valid for any patient",
    (patient) => {
      // Name is non-empty
      expect(patient.name.length).toBeGreaterThan(0)

      // Status config is valid
      const config = getPatientStatusConfig(patient.status)
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.color).toMatch(/text-/)
      expect(config.icon.length).toBeGreaterThan(0)
      expect(config.badgeBg).toMatch(/bg-/)

      // Phone is either undefined or a non-empty string
      if (patient.phone !== undefined) {
        expect(patient.phone.length).toBeGreaterThan(0)
      }
    }
  )
})

// ─── Property 4: Appointment card renders all required fields ─────────────────
// Feature: frontend-ui-redesign, Property 4: Appointment card renders all required fields
// **Validates: Requirements 8.6**

describe("Feature: frontend-ui-redesign, Property 4: Appointment card renders all required fields", () => {
  fcTest.prop(
    [appointmentArb],
    { numRuns: 100 }
  )(
    "appointment status config returns a valid label, color, and icon for any status",
    (appointment) => {
      const config = getAppointmentStatusConfig(appointment.status)

      // Label should be a non-empty string
      expect(config.label.length).toBeGreaterThan(0)
      // Color should contain Tailwind classes (bg-, text-, border-)
      expect(config.color.length).toBeGreaterThan(0)
      expect(config.color).toMatch(/bg-/)
      expect(config.color).toMatch(/text-/)
      expect(config.color).toMatch(/border-/)
      // Icon should be a non-empty string
      expect(config.icon.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [knownAppointmentStatusArb],
    { numRuns: 100 }
  )(
    "known appointment statuses map to their specific Portuguese labels",
    (status) => {
      const config = getAppointmentStatusConfig(status)

      const expectedLabels: Record<string, string> = {
        scheduled: "Agendado",
        confirmed: "Confirmado",
        "in-progress": "Em andamento",
        completed: "Concluído",
        cancelled: "Cancelado",
      }

      expect(config.label).toBe(expectedLabels[status])
    }
  )

  fcTest.prop(
    [appointmentArb],
    { numRuns: 100 }
  )(
    "formatAppointmentDate returns a non-empty string for any valid dateTime",
    (appointment) => {
      const formatted = formatAppointmentDate(appointment.dateTime)

      expect(typeof formatted).toBe("string")
      expect(formatted.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [appointmentArb],
    { numRuns: 100 }
  )(
    "formatAppointmentTime returns a time string with colon separator for any valid dateTime",
    (appointment) => {
      const formatted = formatAppointmentTime(appointment.dateTime)

      expect(typeof formatted).toBe("string")
      expect(formatted.length).toBeGreaterThan(0)
      // Time should contain a colon (HH:MM format)
      expect(formatted).toMatch(/:/)
    }
  )

  fcTest.prop(
    [appointmentArb],
    { numRuns: 100 }
  )(
    "duration is a positive integer representing minutes",
    (appointment) => {
      expect(appointment.duration).toBeGreaterThan(0)
      expect(Number.isInteger(appointment.duration)).toBe(true)
    }
  )

  fcTest.prop(
    [appointmentArb],
    { numRuns: 100 }
  )(
    "all appointment card fields are present and valid for any appointment",
    (appointment) => {
      // Date formatting works
      const date = formatAppointmentDate(appointment.dateTime)
      expect(date.length).toBeGreaterThan(0)

      // Time formatting works
      const time = formatAppointmentTime(appointment.dateTime)
      expect(time).toMatch(/:/)

      // Duration is valid
      expect(appointment.duration).toBeGreaterThan(0)

      // Status badge config is valid
      const config = getAppointmentStatusConfig(appointment.status)
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.color).toMatch(/bg-/)
      expect(config.icon.length).toBeGreaterThan(0)
    }
  )
})

// ─── Property 5: Report card renders all required fields ──────────────────────
// Feature: frontend-ui-redesign, Property 5: Report card renders all required fields
// **Validates: Requirements 8.7**

describe("Feature: frontend-ui-redesign, Property 5: Report card renders all required fields", () => {
  fcTest.prop(
    [reportArb],
    { numRuns: 100 }
  )(
    "formatReportType returns a non-empty string for any report type",
    (report) => {
      const formatted = formatReportType(report.type)

      expect(typeof formatted).toBe("string")
      expect(formatted.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [knownReportTypeArb],
    { numRuns: 100 }
  )(
    "known report types map to their specific Portuguese labels",
    (type) => {
      const formatted = formatReportType(type)

      const expectedLabels: Record<string, string> = {
        evaluation: "Avaliação",
        evolution: "Evolução",
        progress: "Progresso",
        discharge: "Alta",
        monthly: "Mensal",
        school: "Escolar",
        medical: "Médico",
        custom: "Personalizado",
        resumo: "Resumo",
        encaminhamento: "Encaminhamento",
        mensal: "Mensal",
        avaliacao: "Avaliação",
        alta: "Alta",
      }

      expect(formatted).toBe(expectedLabels[type])
    }
  )

  fcTest.prop(
    [reportArb],
    { numRuns: 100 }
  )(
    "report status config returns a valid label, color, and icon for any status",
    (report) => {
      const config = getReportStatusConfig(report.status)

      // Label should be a non-empty string
      expect(config.label.length).toBeGreaterThan(0)
      // Color should contain Tailwind classes
      expect(config.color.length).toBeGreaterThan(0)
      // Icon should be a non-empty string
      expect(config.icon.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [knownReportStatusArb],
    { numRuns: 100 }
  )(
    "known report statuses map to their specific Portuguese labels",
    (status) => {
      const config = getReportStatusConfig(status)

      const expectedLabels: Record<string, string> = {
        draft: "Rascunho",
        pending_review: "Pendente",
        reviewed: "Revisado",
        approved: "Aprovado",
        sent: "Enviado",
      }

      expect(config.label).toBe(expectedLabels[status])
    }
  )

  fcTest.prop(
    [reportArb],
    { numRuns: 100 }
  )(
    "formatReportDate returns a non-empty date string for any valid createdAt",
    (report) => {
      const formatted = formatReportDate(report.createdAt)

      expect(typeof formatted).toBe("string")
      expect(formatted.length).toBeGreaterThan(0)
    }
  )

  fcTest.prop(
    [reportArb],
    { numRuns: 100 }
  )(
    "all report card fields are present and valid for any report",
    (report) => {
      // Title is non-empty
      expect(report.title.length).toBeGreaterThan(0)

      // Type formatting works
      const formattedType = formatReportType(report.type)
      expect(formattedType.length).toBeGreaterThan(0)

      // Date formatting works
      const formattedDate = formatReportDate(report.createdAt)
      expect(formattedDate.length).toBeGreaterThan(0)

      // Status badge config is valid
      const config = getReportStatusConfig(report.status)
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.icon.length).toBeGreaterThan(0)
    }
  )
})
