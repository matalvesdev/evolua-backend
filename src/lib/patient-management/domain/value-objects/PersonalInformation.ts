// ============================================================================
// PERSONAL INFORMATION VALUE OBJECT
// Contains patient's personal data with validation
// ============================================================================

import { FullName } from './FullName'
import { CPF } from './CPF'
import { RG } from './RG'
import { Gender } from './Gender'

export class PersonalInformation {
  constructor(
    public readonly fullName: FullName,
    public readonly dateOfBirth: Date,
    public readonly gender: Gender,
    public readonly cpf: CPF,
    public readonly rg: RG
  ) {
    // Validate date of birth is not in the future
    if (dateOfBirth > new Date()) {
      throw new Error('Date of birth cannot be in the future')
    }

    // Validate minimum age (newborn)
    const maxAge = new Date()
    maxAge.setFullYear(maxAge.getFullYear() - 150)
    if (dateOfBirth < maxAge) {
      throw new Error('Date of birth is too far in the past')
    }
  }

  getAge(): number {
    const today = new Date()
    const birthDate = new Date(this.dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  isMinor(): boolean {
    return this.getAge() < 18
  }

  equals(other: PersonalInformation): boolean {
    return (
      this.fullName.equals(other.fullName) &&
      this.dateOfBirth.getTime() === other.dateOfBirth.getTime() &&
      this.gender.equals(other.gender) &&
      this.cpf.equals(other.cpf) &&
      this.rg.equals(other.rg)
    )
  }
}