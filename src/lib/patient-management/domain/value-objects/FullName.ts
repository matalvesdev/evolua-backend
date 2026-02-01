// ============================================================================
// FULL NAME VALUE OBJECT
// Represents a person's complete name with validation
// ============================================================================

export class FullName {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Full name cannot be empty')
    }

    const trimmedName = value.trim()
    
    // Validate minimum length
    if (trimmedName.length < 2) {
      throw new Error('Full name must be at least 2 characters long')
    }

    // Validate maximum length
    if (trimmedName.length > 255) {
      throw new Error('Full name cannot exceed 255 characters')
    }

    // Validate contains at least first and last name
    const nameParts = trimmedName.split(/\s+/)
    if (nameParts.length < 2) {
      throw new Error('Full name must contain at least first and last name')
    }

    // Validate each part has minimum length
    for (const part of nameParts) {
      if (part.length < 1) {
        throw new Error('Each name part must be at least 1 character long')
      }
    }

    // Store normalized value (proper case)
    this.value = this.normalize(trimmedName)
  }

  private normalize(name: string): string {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Handle common Brazilian name particles
        const particles = ['de', 'da', 'do', 'das', 'dos', 'e']
        if (particles.includes(word)) {
          return word
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  getFirstName(): string {
    return this.value.split(' ')[0]
  }

  getLastName(): string {
    const parts = this.value.split(' ')
    return parts[parts.length - 1]
  }

  getInitials(): string {
    return this.value
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
  }

  equals(other: FullName): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}