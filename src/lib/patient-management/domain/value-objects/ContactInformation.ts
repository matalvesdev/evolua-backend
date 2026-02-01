// ============================================================================
// CONTACT INFORMATION VALUE OBJECT
// Contains patient's contact details with validation
// ============================================================================

import { PhoneNumber } from './PhoneNumber'
import { Email } from './Email'
import { Address } from './Address'

export class ContactInformation {
  constructor(
    public readonly primaryPhone: PhoneNumber,
    public readonly secondaryPhone: PhoneNumber | null,
    public readonly email: Email | null,
    public readonly address: Address
  ) {}

  getPrimaryContact(): string {
    if (this.email) {
      return this.email.value
    }
    return this.primaryPhone.value
  }

  isContactInfoComplete(): boolean {
    return !!(this.primaryPhone && this.address && this.address.isComplete())
  }

  hasSecondaryPhone(): boolean {
    return this.secondaryPhone !== null
  }

  hasEmail(): boolean {
    return this.email !== null
  }

  equals(other: ContactInformation): boolean {
    return (
      this.primaryPhone.equals(other.primaryPhone) &&
      (this.secondaryPhone === null ? other.secondaryPhone === null : this.secondaryPhone?.equals(other.secondaryPhone) === true) &&
      (this.email === null ? other.email === null : this.email?.equals(other.email) === true) &&
      this.address.equals(other.address)
    )
  }
}