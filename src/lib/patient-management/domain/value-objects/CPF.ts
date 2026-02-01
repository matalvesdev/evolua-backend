// ============================================================================
// CPF VALUE OBJECT
// Brazilian individual taxpayer registry with validation
// ============================================================================

export class CPF {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('CPF cannot be empty')
    }

    const cleanCpf = this.cleanCpf(value)
    
    if (!this.isValidCpf(cleanCpf)) {
      throw new Error('Invalid CPF format or checksum')
    }

    // Store formatted value
    this.value = this.formatCpf(cleanCpf)
  }

  private cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, '')
  }

  private formatCpf(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  private isValidCpf(cpf: string): boolean {
    // Check if CPF has 11 digits
    if (cpf.length !== 11) {
      return false
    }

    // Check if all digits are the same (invalid CPFs)
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false
    }

    // Validate first check digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let remainder = sum % 11
    let firstCheckDigit = remainder < 2 ? 0 : 11 - remainder

    if (parseInt(cpf.charAt(9)) !== firstCheckDigit) {
      return false
    }

    // Validate second check digit
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i)
    }
    remainder = sum % 11
    let secondCheckDigit = remainder < 2 ? 0 : 11 - remainder

    return parseInt(cpf.charAt(10)) === secondCheckDigit
  }

  getCleanValue(): string {
    return this.cleanCpf(this.value)
  }

  equals(other: CPF): boolean {
    return this.getCleanValue() === other.getCleanValue()
  }

  toString(): string {
    return this.value
  }
}