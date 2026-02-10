import fc from 'fast-check'
import {
  formatPhoneForWhatsApp,
  buildWhatsAppUrl,
  applyTemplate,
  MESSAGE_TEMPLATES,
  type MessageTemplateType,
  type TemplateContext,
} from '@/lib/utils/whatsapp-utils'

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a valid Brazilian phone number with 10 or 11 digits,
 * optionally with random formatting characters (parentheses, hyphens,
 * spaces, dots) and optionally prefixed with country code 55.
 */
const validBrazilianPhoneArb = fc
  .record({
    // Area code: 2 digits, first digit 1-9
    areaCode: fc.tuple(
      fc.integer({ min: 1, max: 9 }),
      fc.integer({ min: 0, max: 9 })
    ),
    // Whether to use 9-digit mobile (11 digits total) or 8-digit landline (10 digits total)
    isMobile: fc.boolean(),
    // The remaining digits (8 or 9 digits)
    digits: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 8 }),
    // Whether to prefix with country code 55
    withCountryCode: fc.boolean(),
    // Formatting style
    formatStyle: fc.constantFrom(
      'plain',        // just digits
      'parentheses',  // (XX) XXXXX-XXXX
      'spaces',       // XX XXXXX XXXX
      'dots',         // XX.XXXXX.XXXX
      'hyphens',      // XX-XXXXX-XXXX
      'mixed'         // (XX) XXXXX.XXXX
    ),
  })
  .map(({ areaCode, isMobile, digits, withCountryCode, formatStyle }) => {
    const ac = `${areaCode[0]}${areaCode[1]}`
    const mobilePrefix = isMobile ? '9' : ''
    const phoneDigits = mobilePrefix + digits.join('')
    const totalDigits = isMobile ? 11 : 10

    let formatted: string
    switch (formatStyle) {
      case 'parentheses':
        formatted = `(${ac}) ${phoneDigits.slice(0, isMobile ? 5 : 4)}-${phoneDigits.slice(isMobile ? 5 : 4)}`
        break
      case 'spaces':
        formatted = `${ac} ${phoneDigits.slice(0, isMobile ? 5 : 4)} ${phoneDigits.slice(isMobile ? 5 : 4)}`
        break
      case 'dots':
        formatted = `${ac}.${phoneDigits.slice(0, isMobile ? 5 : 4)}.${phoneDigits.slice(isMobile ? 5 : 4)}`
        break
      case 'hyphens':
        formatted = `${ac}-${phoneDigits.slice(0, isMobile ? 5 : 4)}-${phoneDigits.slice(isMobile ? 5 : 4)}`
        break
      case 'mixed':
        formatted = `(${ac}) ${phoneDigits.slice(0, isMobile ? 5 : 4)}.${phoneDigits.slice(isMobile ? 5 : 4)}`
        break
      default: // plain
        formatted = `${ac}${phoneDigits}`
        break
    }

    if (withCountryCode) {
      formatted = `55${formatted}`
    }

    return { formatted, totalDigits }
  })

/**
 * Generates strings that, after removing non-numeric characters,
 * have fewer than 10 digits.
 */
const shortPhoneArb = fc
  .record({
    // Number of actual digits (0 to 9)
    digitCount: fc.integer({ min: 0, max: 9 }),
    digits: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 9 }),
    // Random non-digit characters to intersperse
    separators: fc.array(
      fc.constantFrom('(', ')', '-', ' ', '.', '+', '/', '#'),
      { minLength: 0, maxLength: 5 }
    ),
  })
  .map(({ digitCount, digits, separators }) => {
    const actualDigits = digits.slice(0, digitCount)
    // Intersperse separators randomly
    let result = ''
    for (let i = 0; i < actualDigits.length; i++) {
      if (separators.length > 0 && i % 2 === 0) {
        result += separators[i % separators.length]
      }
      result += actualDigits[i]
    }
    // Add trailing separators
    for (const sep of separators.slice(0, 2)) {
      result += sep
    }
    return result
  })
  .filter((s) => s.replace(/\D/g, '').length < 10)

/**
 * Generates messages with special characters, emojis, and line breaks
 * for URL round-trip testing.
 */
const messageArb = fc
  .record({
    parts: fc.array(
      fc.oneof(
        // Regular text
        fc.string({ minLength: 1, maxLength: 50 }),
        // Emojis
        fc.constantFrom('😊', '🙏', '📅', '🕐', '📍', '💜', '🎯', '📋', '⏱️', '🇧🇷', '👨‍👩‍👧‍👦'),
        // Line breaks
        fc.constantFrom('\n', '\n\n'),
        // Special characters
        fc.constantFrom('&', '=', '?', '#', '%', '+', '/', '!', '@', '*', '(', ')'),
        // Accented characters (Portuguese)
        fc.constantFrom('ã', 'é', 'í', 'ó', 'ú', 'ç', 'Ã', 'É', 'Ç')
      ),
      { minLength: 1, maxLength: 10 }
    ),
  })
  .map(({ parts }) => parts.join(''))
  .filter((s) => s.trim().length > 0)

/**
 * Generates valid formatted phone numbers (digits only, with country code)
 * for use in URL building tests.
 */
const formattedPhoneArb = fc
  .record({
    areaCode: fc.tuple(
      fc.integer({ min: 1, max: 9 }),
      fc.integer({ min: 0, max: 9 })
    ),
    isMobile: fc.boolean(),
    digits: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 8 }),
  })
  .map(({ areaCode, isMobile, digits }) => {
    const ac = `${areaCode[0]}${areaCode[1]}`
    const mobilePrefix = isMobile ? '9' : ''
    return `55${ac}${mobilePrefix}${digits.join('')}`
  })

/**
 * Generates a valid TemplateContext with random names, dates, and times.
 */
const templateContextArb = fc
  .record({
    patientName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    guardianName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    day: fc.integer({ min: 1, max: 28 }),
    month: fc.integer({ min: 1, max: 12 }),
    year: fc.integer({ min: 2024, max: 2030 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
    clinicName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  })
  .map(({ patientName, guardianName, day, month, year, hour, minute, clinicName }) => ({
    patientName,
    guardianName,
    appointmentDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    appointmentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    clinicName,
  }))

/**
 * Generates a random template type.
 */
const templateTypeArb = fc.constantFrom<MessageTemplateType>(
  'reminder',
  'activity',
  'feedback',
  'free'
)

// ============================================================================
// Property-Based Tests
// ============================================================================

// Feature: whatsapp-messaging, Property 2: Phone formatting produces valid international format
describe('Property 2: Phone formatting produces valid international format', () => {
  /**
   * **Validates: Requirements 1.5, 5.1, 5.2, 5.4**
   *
   * For any valid Brazilian phone number (10 or 11 digits, with or without
   * formatting like parentheses, hyphens, spaces, dots, or prefix 55),
   * formatPhoneForWhatsApp SHALL produce a result with valid: true and
   * formatted matching /^55\d{10,11}$/, without duplicating the country code.
   */
  it('should produce valid international format for any valid Brazilian phone number', () => {
    fc.assert(
      fc.property(validBrazilianPhoneArb, ({ formatted, totalDigits }) => {
        const result = formatPhoneForWhatsApp(formatted)

        // Must be valid
        expect(result.valid).toBe(true)

        // Must match international format: 55 + 10 or 11 digits
        expect(result.formatted).toMatch(/^55\d{10,11}$/)

        // Total length must be 12 (landline) or 13 (mobile)
        expect([12, 13]).toContain(result.formatted.length)

        // Error should be undefined for valid numbers
        expect(result.error).toBeUndefined()
      }),
      { numRuns: 200 }
    )
  })
})

// Feature: whatsapp-messaging, Property 3: Short phone numbers are rejected
describe('Property 3: Short phone numbers are rejected', () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * For any string that, after removing non-numeric characters, has less
   * than 10 digits, formatPhoneForWhatsApp SHALL return valid: false with
   * a descriptive error message.
   */
  it('should reject any phone number with fewer than 10 digits', () => {
    fc.assert(
      fc.property(shortPhoneArb, (phone) => {
        const result = formatPhoneForWhatsApp(phone)

        // Must be invalid
        expect(result.valid).toBe(false)

        // Must have a descriptive error message
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
        expect(result.error!.length).toBeGreaterThan(0)

        // Formatted should be empty for invalid numbers
        expect(result.formatted).toBe('')
      }),
      { numRuns: 200 }
    )
  })
})

// Feature: whatsapp-messaging, Property 4: WhatsApp URL round-trip preserves the message
describe('Property 4: WhatsApp URL round-trip preserves the message', () => {
  /**
   * **Validates: Requirements 1.3, 7.1, 7.2, 7.3**
   *
   * For any valid message (non-empty string) and any valid formatted phone
   * number, building the wa.me URL with buildWhatsAppUrl and then extracting
   * and decoding the text parameter SHALL produce the original message,
   * including special characters, emojis, and line breaks.
   */
  it('should preserve the message through URL encode/decode round-trip', () => {
    fc.assert(
      fc.property(formattedPhoneArb, messageArb, (phone, message) => {
        // Build the URL
        const url = buildWhatsAppUrl(phone, message)

        // Verify URL format
        expect(url).toContain(`https://wa.me/${phone}?text=`)

        // Extract and decode the text parameter
        const urlObj = new URL(url)
        const decodedText = urlObj.searchParams.get('text')

        // Round-trip must preserve the original message
        expect(decodedText).toBe(message)
      }),
      { numRuns: 200 }
    )
  })
})

// Feature: whatsapp-messaging, Property 1: Template application produces output with all context values
describe('Property 1: Template application produces output with all context values', () => {
  /**
   * **Validates: Requirements 1.2, 2.3, 4.2**
   *
   * For any template type and any valid context with patientName and
   * guardianName filled, applying the template SHALL produce a string that
   * contains the guardianName. When the template is 'reminder' and the
   * context includes appointmentDate and appointmentTime, the output SHALL
   * also contain the date and time.
   */
  it('should produce output containing guardianName for all template types', () => {
    fc.assert(
      fc.property(templateTypeArb, templateContextArb, (templateType, context) => {
        const result = applyTemplate(templateType, context)

        // Output must be a non-empty string
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)

        // Output must contain the guardianName
        expect(result).toContain(context.guardianName)
      }),
      { numRuns: 200 }
    )
  })

  it('should contain date and time when template is reminder with appointment data', () => {
    fc.assert(
      fc.property(templateContextArb, (context) => {
        const result = applyTemplate('reminder', context)

        // For reminder template with appointmentDate and appointmentTime,
        // the output must contain both
        expect(result).toContain(context.appointmentDate!)
        expect(result).toContain(context.appointmentTime!)

        // Also must contain guardianName
        expect(result).toContain(context.guardianName)
      }),
      { numRuns: 200 }
    )
  })
})
