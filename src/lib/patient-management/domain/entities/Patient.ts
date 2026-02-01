// ============================================================================
// PATIENT ENTITY
// Core domain entity representing a patient in the speech therapy CRM
// ============================================================================

import { PatientId } from '../value-objects/PatientId'
import { PersonalInformation } from '../value-objects/PersonalInformation'
import { ContactInformation } from '../value-objects/ContactInformation'
import { EmergencyContact } from '../value-objects/EmergencyContact'
import { InsuranceInformation } from '../value-objects/InsuranceInformation'
import { PatientStatus } from '../value-objects/PatientStatus'
import { UserId } from '../value-objects/UserId'

export class Patient {
  constructor(
    public readonly id: PatientId,
    public readonly personalInfo: PersonalInformation,
    public readonly contactInfo: ContactInformation,
    public readonly emergencyContact: EmergencyContact,
    public readonly insuranceInfo: InsuranceInformation,
    private _status: PatientStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly createdBy: UserId
  ) {}

  get status(): PatientStatus {
    return this._status
  }

  // Domain methods
  updatePersonalInfo(info: PersonalInformation): Patient {
    return new Patient(
      this.id,
      info,
      this.contactInfo,
      this.emergencyContact,
      this.insuranceInfo,
      this._status,
      this.createdAt,
      new Date(),
      this.createdBy
    )
  }

  changeStatus(newStatus: PatientStatus, reason?: string): Patient {
    // Business rule: validate status transitions
    if (!this.isValidStatusTransition(this._status, newStatus)) {
      throw new Error(`Invalid status transition from ${this._status.value} to ${newStatus.value}`)
    }

    return new Patient(
      this.id,
      this.personalInfo,
      this.contactInfo,
      this.emergencyContact,
      this.insuranceInfo,
      newStatus,
      this.createdAt,
      new Date(),
      this.createdBy
    )
  }

  addEmergencyContact(contact: EmergencyContact): Patient {
    return new Patient(
      this.id,
      this.personalInfo,
      this.contactInfo,
      contact,
      this.insuranceInfo,
      this._status,
      this.createdAt,
      new Date(),
      this.createdBy
    )
  }

  isActive(): boolean {
    return this._status.isActive()
  }

  canScheduleAppointment(): boolean {
    return this._status.canScheduleAppointment()
  }

  private isValidStatusTransition(currentStatus: PatientStatus, newStatus: PatientStatus): boolean {
    // Business rules for status transitions
    const validTransitions: Record<string, string[]> = {
      'new': ['active', 'inactive'],
      'active': ['on_hold', 'discharged', 'inactive'],
      'on_hold': ['active', 'discharged', 'inactive'],
      'discharged': ['active'], // Can be reactivated
      'inactive': ['active']
    }

    return validTransitions[currentStatus.value]?.includes(newStatus.value) ?? false
  }
}