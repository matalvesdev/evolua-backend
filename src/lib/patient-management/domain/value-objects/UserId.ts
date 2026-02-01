// ============================================================================
// USER ID VALUE OBJECT
// Unique identifier for users (therapists, etc.)
// ============================================================================

export class UserId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('User ID cannot be empty')
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new Error('User ID must be a valid UUID')
    }
  }

  equals(other: UserId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  static generate(): UserId {
    return new UserId(crypto.randomUUID())
  }
}