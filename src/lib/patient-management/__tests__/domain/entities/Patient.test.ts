// ============================================================================
// PATIENT ENTITY TESTS
// Unit tests for the Patient domain entity
// ============================================================================

import { Patient } from '../../../domain/entities/Patient'
import {
  PatientId,
  PersonalInformation,
  ContactInformation,
  EmergencyContact,
  InsuranceInformation,
  PatientStatus,
  UserId,
  FullName,
  Gender,
  CPF,
  RG,
  PhoneNumber,
  Address
} from '../../../domain/value-objects'

describe('Patient Entity', () => {
  let validPatient: Patient

  beforeEach(() => {
    const patientId = new PatientId('123e4567-e89b-12d3-a456-426614174000')
    const personalInfo = new PersonalInformation(
      new FullName('João Silva'),
      new Date('1990-01-01'),
      new Gender('male'),
      new CPF('11144477735'),
      new RG('123456789')
    )
    const contactInfo = new ContactInformation(
      new PhoneNumber('11987654321'),
      null,
      null,
      new Address('Rua das Flores', '123', null, 'Centro', 'São Paulo', 'SP', '01234567')
    )
    const emergencyContact = new EmergencyContact(
      new FullName('Maria Silva'),
      new PhoneNumber('11987654322'),
      'Mãe'
    )
    const insuranceInfo = new InsuranceInformation(null, null, null, null)
    const status = new PatientStatus('new')
    const userId = new UserId('123e4567-e89b-12d3-a456-426614174001')

    validPatient = new Patient(
      patientId,
      personalInfo,
      contactInfo,
      emergencyContact,
      insuranceInfo,
      status,
      new Date(),
      new Date(),
      userId
    )
  })

  describe('Construction', () => {
    it('should create a valid patient', () => {
      expect(validPatient).toBeInstanceOf(Patient)
      expect(validPatient.id.value).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(validPatient.personalInfo.fullName.value).toBe('João Silva')
      expect(validPatient.status.value).toBe('new')
    })
  })

  describe('Status Management', () => {
    it('should allow valid status transitions', () => {
      const activeStatus = new PatientStatus('active')
      const updatedPatient = validPatient.changeStatus(activeStatus)
      
      expect(updatedPatient.status.value).toBe('active')
      expect(updatedPatient.updatedAt.getTime()).toBeGreaterThanOrEqual(validPatient.updatedAt.getTime())
    })

    it('should reject invalid status transitions', () => {
      const dischargedStatus = new PatientStatus('discharged')
      
      expect(() => {
        validPatient.changeStatus(dischargedStatus)
      }).toThrow('Invalid status transition from new to discharged')
    })

    it('should correctly identify active patients', () => {
      expect(validPatient.isActive()).toBe(false)
      
      const activePatient = validPatient.changeStatus(new PatientStatus('active'))
      expect(activePatient.isActive()).toBe(true)
    })

    it('should correctly identify patients who can schedule appointments', () => {
      expect(validPatient.canScheduleAppointment()).toBe(true)
      
      const activePatient = validPatient.changeStatus(new PatientStatus('active'))
      expect(activePatient.canScheduleAppointment()).toBe(true)
      
      const inactivePatient = activePatient.changeStatus(new PatientStatus('inactive'))
      expect(inactivePatient.canScheduleAppointment()).toBe(false)
    })
  })

  describe('Personal Information Updates', () => {
    it('should update personal information', () => {
      const newPersonalInfo = new PersonalInformation(
        new FullName('João Santos'),
        new Date('1990-01-01'),
        new Gender('male'),
        new CPF('11144477735'),
        new RG('123456789')
      )

      const updatedPatient = validPatient.updatePersonalInfo(newPersonalInfo)
      
      expect(updatedPatient.personalInfo.fullName.value).toBe('João Santos')
      expect(updatedPatient.updatedAt.getTime()).toBeGreaterThanOrEqual(validPatient.updatedAt.getTime())
    })
  })

  describe('Emergency Contact Management', () => {
    it('should add emergency contact', () => {
      const newEmergencyContact = new EmergencyContact(
        new FullName('Pedro Silva'),
        new PhoneNumber('11987654323'),
        'Pai'
      )

      const updatedPatient = validPatient.addEmergencyContact(newEmergencyContact)
      
      expect(updatedPatient.emergencyContact.name.value).toBe('Pedro Silva')
      expect(updatedPatient.emergencyContact.relationship).toBe('Pai')
    })
  })
})