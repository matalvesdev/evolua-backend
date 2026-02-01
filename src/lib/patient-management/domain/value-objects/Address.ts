// ============================================================================
// ADDRESS VALUE OBJECT
// Brazilian address with validation
// ============================================================================

export class Address {
  constructor(
    public readonly street: string,
    public readonly number: string,
    public readonly complement: string | null,
    public readonly neighborhood: string,
    public readonly city: string,
    public readonly state: string,
    public readonly zipCode: string
  ) {
    this.validateRequired(street, 'Street')
    this.validateRequired(number, 'Number')
    this.validateRequired(neighborhood, 'Neighborhood')
    this.validateRequired(city, 'City')
    this.validateRequired(state, 'State')
    this.validateRequired(zipCode, 'ZIP Code')
    
    if (!this.isValidBrazilianZipCode(zipCode)) {
      throw new Error('Invalid Brazilian ZIP code format')
    }

    if (!this.isValidBrazilianState(state)) {
      throw new Error('Invalid Brazilian state')
    }
  }

  private validateRequired(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${fieldName} cannot be empty`)
    }
  }

  private isValidBrazilianZipCode(zipCode: string): boolean {
    // Brazilian ZIP code format: 12345-678 or 12345678
    const cleanZip = zipCode.replace(/\D/g, '')
    return cleanZip.length === 8 && /^\d{8}$/.test(cleanZip)
  }

  private isValidBrazilianState(state: string): boolean {
    const brazilianStates = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ]
    return brazilianStates.includes(state.toUpperCase())
  }

  getFormattedZipCode(): string {
    const clean = this.zipCode.replace(/\D/g, '')
    return clean.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  getFullAddress(): string {
    const parts = [
      `${this.street}, ${this.number}`,
      this.complement,
      this.neighborhood,
      `${this.city} - ${this.state}`,
      this.getFormattedZipCode()
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  isComplete(): boolean {
    return !!(
      this.street &&
      this.number &&
      this.neighborhood &&
      this.city &&
      this.state &&
      this.zipCode
    )
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.number === other.number &&
      this.complement === other.complement &&
      this.neighborhood === other.neighborhood &&
      this.city === other.city &&
      this.state === other.state &&
      this.zipCode === other.zipCode
    )
  }
}