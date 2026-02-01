// ============================================================================
// PHONE NUMBER VALUE OBJECT
// Brazilian phone number with validation
// ============================================================================

export class PhoneNumber {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Phone number cannot be empty')
    }

    const cleanPhone = this.cleanPhone(value)
    
    if (!this.isValidBrazilianPhone(cleanPhone)) {
      throw new Error('Invalid Brazilian phone number format')
    }

    // Store formatted value
    this.value = this.formatPhone(cleanPhone)
  }

  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  private formatPhone(phone: string): string {
    // Format based on length
    if (phone.length === 10) {
      // Landline: (11) 1234-5678
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    } else if (phone.length === 11) {
      // Mobile: (11) 91234-5678
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }

  private isValidBrazilianPhone(phone: string): boolean {
    // Brazilian phone numbers can be:
    // - 10 digits: landline (11) 1234-5678
    // - 11 digits: mobile (11) 91234-5678
    
    if (phone.length !== 10 && phone.length !== 11) {
      return false
    }

    // First two digits are area code (11-99)
    const areaCode = parseInt(phone.substring(0, 2))
    if (areaCode < 11 || areaCode > 99) {
      return false
    }

    // For 11-digit numbers, third digit should be 9 (mobile)
    if (phone.length === 11 && phone.charAt(2) !== '9') {
      return false
    }

    return true
  }

  getCleanValue(): string {
    return this.cleanPhone(this.value)
  }

  getAreaCode(): string {
    const clean = this.getCleanValue()
    return clean.substring(0, 2)
  }

  isMobile(): boolean {
    return this.getCleanValue().length === 11
  }

  equals(other: PhoneNumber): boolean {
    return this.getCleanValue() === other.getCleanValue()
  }

  toString(): string {
    return this.value
  }
}