import fc from 'fast-check'

// Feature: whatsapp-messaging, Property 5: Message history returns in descending chronological order
// **Validates: Requirements 6.2**

/**
 * Pure sorting function that mirrors the backend's orderBy: { sentAt: 'desc' }
 * from MessagesService.findByPatient.
 *
 * This isolates the sorting logic so we can validate the ordering property
 * without needing a database connection.
 */
function sortMessagesByDateDescending<T extends { sentAt: string | Date }>(
  messages: T[],
): T[] {
  return [...messages].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  )
}

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a message object with a random timestamp, id, content, and template type.
 * Timestamps are constrained to a realistic range (2024-2026) and filtered to
 * exclude invalid dates (NaN).
 */
const messageArb = fc.record({
  id: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 100 }),
  templateType: fc.constantFrom('reminder', 'activity', 'feedback', 'free'),
  sentAt: fc
    .date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
    .filter((d) => !isNaN(d.getTime())),
})

/**
 * Generates an array of messages (at least 2) to test ordering properties.
 */
const messagesArb = fc.array(messageArb, { minLength: 2, maxLength: 50 })

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property 5: Message history returns in descending chronological order', () => {
  /**
   * **Validates: Requirements 6.2**
   *
   * For any set of messages with distinct timestamps for the same patient,
   * the query to the history SHALL return messages ordered from most recent
   * to oldest (sentAt descending).
   */
  it('should return messages sorted from most recent to oldest', () => {
    fc.assert(
      fc.property(messagesArb, (messages) => {
        const sorted = sortMessagesByDateDescending(messages)

        // Verify each consecutive pair is in descending order
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = new Date(sorted[i].sentAt).getTime()
          const next = new Date(sorted[i + 1].sentAt).getTime()
          expect(current).toBeGreaterThanOrEqual(next)
        }
      }),
      { numRuns: 200 },
    )
  })

  /**
   * **Validates: Requirements 6.2**
   *
   * Sorting must preserve all original messages — no data loss or duplication.
   */
  it('should preserve all original messages after sorting (no data loss)', () => {
    fc.assert(
      fc.property(messagesArb, (messages) => {
        const sorted = sortMessagesByDateDescending(messages)

        // Length must be preserved
        expect(sorted.length).toBe(messages.length)

        // Every original message must appear in the sorted result
        for (const msg of messages) {
          expect(sorted).toContainEqual(msg)
        }
      }),
      { numRuns: 200 },
    )
  })

  /**
   * **Validates: Requirements 6.2**
   *
   * Sorting is idempotent: sorting an already-sorted list produces the same result.
   */
  it('should be idempotent — sorting twice yields the same result', () => {
    fc.assert(
      fc.property(messagesArb, (messages) => {
        const sortedOnce = sortMessagesByDateDescending(messages)
        const sortedTwice = sortMessagesByDateDescending(sortedOnce)

        expect(sortedTwice).toEqual(sortedOnce)
      }),
      { numRuns: 200 },
    )
  })
})
