// ============================================================================
// PATIENT CREATION PROPERTY TESTS
// Property-based tests for patient creation uniqueness
// Feature: patient-management-system, Property 1: Patient Creation Generates Unique Identifiers
// **Validates: Requirements 1.1**
// ============================================================================

import * as fc from 'fast-check'
import { Patient } from '../../domain/entities/Patient'
import {
  PatientId,
  PersonalInformation,
  ContactInformation,
  EmergencyContact,
  InsuranceInformation,
  PatientStatus,
  UserId
} from '../../domain/value-objects'
import {
  personalInformationGenerator,
  contactInformationGenerator,
  emergencyContactGenerator,
  insuranceInformationGenerator,
  patientStatusGenerator,
  userIdGenerator
} from '../../testing/generators'

describe('Patient Creation Properties', () => {
  describe('Property 1: Patient Creation Generates Unique Identifiers', () => {
    it('should generate unique patient IDs for different patients', () => {
      fc.assert(
        fc.property(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            // Create two patients with the same data but different IDs
            const patientId1 = PatientId.generate()
            const patientId2 = PatientId.generate()
            
            const now = new Date()
            
            const patient1 = new Patient(
              patientId1,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            
            const patient2 = new Patient(
              patientId2,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            
            // Patient IDs should be different even with same data
            return !patient1.id.equals(patient2.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create valid patient entities with generated data', () => {
      fc.assert(
        fc.property(
          personalInformationGenerator(),
          contactInformationGenerator(),
          emergencyContactGenerator(),
          insuranceInformationGenerator(),
          patientStatusGenerator(),
          userIdGenerator(),
          (personalInfo, contactInfo, emergencyContact, insuranceInfo, status, userId) => {
            const patientId = PatientId.generate()
            const now = new Date()
            
            const patient = new Patient(
              patientId,
              personalInfo,
              contactInfo,
              emergencyContact,
              insuranceInfo,
              status,
              now,
              now,
              userId
            )
            
            // Patient should be created successfully and have valid properties
            return (
              patient instanceof Patient &&
              patient.id.equals(patientId) &&
              patient.personalInfo.equals(personalInfo) &&
              patient.contactInfo.equals(contactInfo) &&
              patient.emergencyContact.equals(emergencyContact) &&
              patient.insuranceInfo.equals(insuranceInfo) &&
              patient.status.equals(status) &&
              patient.createdBy.equals(userId)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})