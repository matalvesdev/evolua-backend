// ============================================================================
// EMAIL VALUE OBJECT
// Email address with validation
// ============================================================================

export class Email {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Email cannot be empty')
    }

    const trimmedEmail = value.trim().toLowerCase()
    
    if (!this.isValidEmail(trimmedEmail)) {
      throw new Error('Invalid email format')
    }

    this.value = trimmedEmail
  }

  private isValidEmail(email: string): boolean {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      return false
    }

    // Additional validations
    if (email.length > 254) {
      return false
    }

    const [localPart, domain] = email.split('@')
    
    // Local part validations
    if (localPart.length > 64) {
      return false
    }

    // Domain validations
    if (domain.length > 253) {
      return false
    }

    return true
  }

  getDomain(): string {
    return this.value.split('@')[1]
  }

  getLocalPart(): string {
    return this.value.split('@')[0]
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}