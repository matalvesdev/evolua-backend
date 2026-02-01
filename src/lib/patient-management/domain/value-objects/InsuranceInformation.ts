// ============================================================================
// INSURANCE INFORMATION VALUE OBJECT
// Patient insurance details with validation
// ============================================================================

export class InsuranceInformation {
  constructor(
    public readonly provider: string | null,
    public readonly policyNumber: string | null,
    public readonly groupNumber: string | null,
    public readonly validUntil: Date | null
  ) {
    // If any insurance info is provided, provider is required
    if ((policyNumber || groupNumber || validUntil) && !provider) {
      throw new Error('Insurance provider is required when insurance information is provided')
    }

    // Validate policy number format if provided
    if (policyNumber && policyNumber.trim().length === 0) {
      throw new Error('Policy number cannot be empty if provided')
    }

    // Validate expiration date is not in the past
    if (validUntil && validUntil < new Date()) {
      throw new Error('Insurance expiration date cannot be in the past')
    }
  }

  hasInsurance(): boolean {
    return this.provider !== null
  }

  isValid(): boolean {
    if (!this.hasInsurance()) {
      return true // No insurance is valid
    }

    return !!(this.provider && this.policyNumber)
  }

  isExpired(): boolean {
    if (!this.validUntil) {
      return false // No expiration date means it doesn't expire
    }

    return this.validUntil < new Date()
  }

  daysUntilExpiration(): number | null {
    if (!this.validUntil) {
      return null
    }

    const today = new Date()
    const diffTime = this.validUntil.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  equals(other: InsuranceInformation): boolean {
    return (
      this.provider === other.provider &&
      this.policyNumber === other.policyNumber &&
      this.groupNumber === other.groupNumber &&
      this.validUntil?.getTime() === other.validUntil?.getTime()
    )
  }
}