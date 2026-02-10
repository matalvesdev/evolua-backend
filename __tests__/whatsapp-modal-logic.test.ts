import {
  formatPhoneForWhatsApp,
  buildWhatsAppUrl,
  applyTemplate,
  type TemplateContext,
} from '@/lib/utils/whatsapp-utils'

// ============================================================================
// Unit Tests: WhatsApp Message Modal Logic
//
// These tests validate the internal logic used by WhatsAppMessageModal
// without rendering the component. They exercise the utility functions
// with concrete examples that mirror the modal's real use cases.
//
// Requirements validated: 1.1, 1.4, 2.2
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers — mirror the modal's buildContext logic
// ---------------------------------------------------------------------------

/**
 * Builds a TemplateContext the same way the modal does, given patient data
 * and an optional next appointment ISO string.
 */
function buildContextLikeModal(
  patientName: string,
  guardianName: string | undefined,
  nextAppointmentISO?: string,
): TemplateContext {
  const ctx: TemplateContext = {
    patientName,
    guardianName: guardianName || 'Responsável',
    clinicName: 'Clínica',
  }
  if (nextAppointmentISO) {
    const dt = new Date(nextAppointmentISO)
    ctx.appointmentDate = dt.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    ctx.appointmentTime = dt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return ctx
}

// ---------------------------------------------------------------------------
// 1. Template selection with patient data
// ---------------------------------------------------------------------------

describe('Template selection with patient data', () => {
  /**
   * **Validates: Requirements 1.1, 1.4, 2.2**
   *
   * Given a patient with guardianName "Maria Silva" and a next appointment,
   * when applying the 'reminder' template, the output should contain
   * "Maria Silva", the appointment date, and time.
   */
  it('should produce a reminder message containing guardian name, date, and time', () => {
    const appointmentISO = '2025-03-15T14:30:00.000Z'
    const ctx = buildContextLikeModal('João Pedro', 'Maria Silva', appointmentISO)

    const result = applyTemplate('reminder', ctx)

    // Must contain the guardian name
    expect(result).toContain('Maria Silva')

    // Must contain the formatted date and time from the context
    expect(result).toContain(ctx.appointmentDate!)
    expect(result).toContain(ctx.appointmentTime!)

    // Must also contain the patient name
    expect(result).toContain('João Pedro')
  })
})

// ---------------------------------------------------------------------------
// 2. Template selection without guardian phone
// ---------------------------------------------------------------------------

describe('Template selection without guardian phone', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * Given a patient without guardianPhone, when calling
   * formatPhoneForWhatsApp with an empty string, it should return
   * valid: false — the modal uses this to disable the send button.
   */
  it('should return valid: false when phone is empty', () => {
    const result = formatPhoneForWhatsApp('')

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.formatted).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 3. Template selection without appointment (reminder)
// ---------------------------------------------------------------------------

describe('Template selection without appointment (reminder)', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * Given no next appointment, when applying the 'reminder' template,
   * the output should contain "undefined" for date/time fields, showing
   * that the modal needs to display a warning.
   */
  it('should contain "undefined" for date/time when no appointment is provided', () => {
    // Build context without appointment — appointmentDate and appointmentTime
    // will be undefined, so the template will interpolate them as "undefined".
    const ctx = buildContextLikeModal('Lucas', 'Ana Costa')

    const result = applyTemplate('reminder', ctx)

    // The template interpolates undefined values as the string "undefined"
    expect(result).toContain('undefined')

    // Guardian name should still be present
    expect(result).toContain('Ana Costa')
  })
})

// ---------------------------------------------------------------------------
// 4. Free template with minimal context
// ---------------------------------------------------------------------------

describe('Free template with minimal context', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * Given a patient with only guardianName, when applying the 'free'
   * template, the output should start with "Olá {guardianName}!".
   */
  it('should start with greeting containing guardian name', () => {
    const ctx = buildContextLikeModal('Paciente Teste', 'Carlos Souza')

    const result = applyTemplate('free', ctx)

    expect(result).toMatch(/^Olá Carlos Souza! 😊/)
  })

  it('should use "Responsável" when guardianName is undefined', () => {
    const ctx = buildContextLikeModal('Paciente Teste', undefined)

    const result = applyTemplate('free', ctx)

    expect(result).toMatch(/^Olá Responsável! 😊/)
  })
})

// ---------------------------------------------------------------------------
// 5. Phone validation for various formats
// ---------------------------------------------------------------------------

describe('Phone validation for various formats', () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * Test specific phone number examples that a therapist might enter.
   */
  it('should accept "(11) 99999-8888" as valid', () => {
    const result = formatPhoneForWhatsApp('(11) 99999-8888')

    expect(result.valid).toBe(true)
    expect(result.formatted).toBe('5511999998888')
    expect(result.error).toBeUndefined()
  })

  it('should accept "5511999998888" as valid (already has country code)', () => {
    const result = formatPhoneForWhatsApp('5511999998888')

    expect(result.valid).toBe(true)
    expect(result.formatted).toBe('5511999998888')
    // Must not duplicate the country code
    expect(result.formatted).not.toMatch(/^5555/)
  })

  it('should accept "11999998888" as valid (no country code)', () => {
    const result = formatPhoneForWhatsApp('11999998888')

    expect(result.valid).toBe(true)
    expect(result.formatted).toBe('5511999998888')
  })

  it('should reject "123" as invalid (too short)', () => {
    const result = formatPhoneForWhatsApp('123')

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.formatted).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 6. URL building with real message content
// ---------------------------------------------------------------------------

describe('URL building with real message content', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * Given a formatted phone and a template-generated message, when
   * building the URL, it should be valid and decodable.
   */
  it('should build a valid, decodable wa.me URL from a template message', () => {
    // Simulate the full flow the modal performs
    const phoneResult = formatPhoneForWhatsApp('(11) 99999-8888')
    expect(phoneResult.valid).toBe(true)

    const ctx = buildContextLikeModal(
      'João Pedro',
      'Maria Silva',
      '2025-03-15T14:30:00.000Z',
    )
    const message = applyTemplate('reminder', ctx)

    const url = buildWhatsAppUrl(phoneResult.formatted, message)

    // URL must start with the correct base
    expect(url).toMatch(/^https:\/\/wa\.me\/5511999998888\?text=/)

    // Must be parseable
    const parsed = new URL(url)
    expect(parsed.hostname).toBe('wa.me')
    expect(parsed.pathname).toBe('/5511999998888')

    // Decoded text must equal the original message (round-trip)
    const decoded = parsed.searchParams.get('text')
    expect(decoded).toBe(message)
  })

  it('should preserve emojis and line breaks through URL encoding', () => {
    const message = 'Olá Maria! 😊\n\nSessão amanhã às 14:00 📅\nLocal: Clínica 📍'
    const url = buildWhatsAppUrl('5511999998888', message)

    const parsed = new URL(url)
    const decoded = parsed.searchParams.get('text')

    expect(decoded).toBe(message)
    expect(decoded).toContain('😊')
    expect(decoded).toContain('\n')
    expect(decoded).toContain('📅')
  })
})
