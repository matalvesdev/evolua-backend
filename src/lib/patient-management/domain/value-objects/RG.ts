// ============================================================================
// RG VALUE OBJECT
// Brazilian identity document with validation
// ============================================================================

export class RG {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('RG cannot be empty')
    }

    const cleanRg = this.cleanRg(value)
    
    if (!this.isValidRg(cleanRg)) {
      throw new Error('Invalid RG format')
    }

    // Store original formatted value
    this.value = value.trim()
  }

  private cleanRg(rg: string): string {
    return rg.replace(/\D/g, '')
  }

  private isValidRg(rg: string): boolean {
    // RG can have 7 to 9 digits (varies by state)
    if (rg.length < 7 || rg.length > 9) {
      return false
    }

    // Check if all digits are the same (invalid RGs)
    if (/^(\d)\1+$/.test(rg)) {
      return false
    }

    return true
  }

  getCleanValue(): string {
    return this.cleanRg(this.value)
  }

  equals(other: RG): boolean {
    return this.getCleanValue() === other.getCleanValue()
  }

  toString(): string {
    return this.value
  }
}