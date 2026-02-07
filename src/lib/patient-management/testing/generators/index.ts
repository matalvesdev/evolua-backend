// ============================================================================
// PROPERTY-BASED TESTING GENERATORS
// Fast-check generators for patient management domain objects
// ============================================================================

import * as fc from 'fast-check'
import {
  PatientId,
  MedicalRecordId,
  UserId,
  FullName,
  CPF,
  RG,
  Gender,
  GenderType,
  PersonalInformation,
  PhoneNumber,
  Email,
  Address,
  ContactInformation,
  EmergencyContact,
  PatientStatus,
  PatientStatusType,
  InsuranceInformation,
  Diagnosis,
  TreatmentHistory,
  Medication,
  Allergy,
  AllergySeverity,
  ProgressNote,
  Assessment,
  TreatmentPlan
} from '../../domain'

// ============================================================================
// BASIC GENERATORS
// ============================================================================

export const uuidGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.integer({ min: 0, max: 0xffffffff }),
    fc.integer({ min: 0, max: 0xffff }),
    fc.integer({ min: 0x1000, max: 0x5fff }), // Version 1-5
    fc.integer({ min: 0x8000, max: 0xbfff }), // Variant bits
    fc.integer({ min: 0, max: 0xffffffffffff })
  ).map(([a, b, c, d, e]) => {
    const hex = (n: number, len: number) => n.toString(16).padStart(len, '0')
    return `${hex(a, 8)}-${hex(b, 4)}-${hex(c, 4)}-${hex(d, 4)}-${hex(e, 12)}`
  })

export const patientIdGenerator = (): fc.Arbitrary<PatientId> =>
  uuidGenerator().map(uuid => new PatientId(uuid))

export const medicalRecordIdGenerator = (): fc.Arbitrary<MedicalRecordId> =>
  uuidGenerator().map(uuid => new MedicalRecordId(uuid))

export const userIdGenerator = (): fc.Arbitrary<UserId> =>
  uuidGenerator().map(uuid => new UserId(uuid))

// ============================================================================
// NAME AND PERSONAL INFO GENERATORS
// ============================================================================

export const fullNameGenerator = (): fc.Arbitrary<FullName> =>
  fc.tuple(
    fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-ZÀ-ÿ]+$/.test(s)),
    fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-ZÀ-ÿ]+$/.test(s))
  ).map(([first, last]) => new FullName(`${first} ${last}`))

export const cpfGenerator = (): fc.Arbitrary<CPF> => {
  // Generate valid CPF
  return fc.tuple(
    fc.integer({ min: 100, max: 999 }),
    fc.integer({ min: 100, max: 999 }),
    fc.integer({ min: 100, max: 999 })
  ).map(([a, b, c]) => {
    const base = `${a}${b}${c}`
    
    // Calculate first check digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(base.charAt(i)) * (10 - i)
    }
    const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    
    // Calculate second check digit
    sum = 0
    const withFirst = base + firstDigit
    for (let i = 0; i < 10; i++) {
      sum += parseInt(withFirst.charAt(i)) * (11 - i)
    }
    const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    
    const fullCpf = `${base}${firstDigit}${secondDigit}`
    return new CPF(fullCpf)
  })
}

export const rgGenerator = (): fc.Arbitrary<RG> =>
  fc.integer({ min: 1000000, max: 999999999 })
    .filter(num => {
      const str = num.toString()
      // Ensure it's not all the same digit
      return !/^(\d)\1+$/.test(str)
    })
    .map(num => new RG(num.toString()))

export const genderGenerator = (): fc.Arbitrary<Gender> =>
  fc.constantFrom<GenderType>('male', 'female', 'other', 'prefer_not_to_say')
    .map(gender => new Gender(gender))

export const personalInformationGenerator = (): fc.Arbitrary<PersonalInformation> =>
  fc.tuple(
    fullNameGenerator(),
    fc.date({ min: new Date('1920-01-01'), max: new Date('2010-12-31') }).filter(date => !isNaN(date.getTime())),
    genderGenerator(),
    cpfGenerator(),
    rgGenerator()
  ).map(([fullName, dateOfBirth, gender, cpf, rg]) =>
    new PersonalInformation(fullName, dateOfBirth, gender, cpf, rg)
  )

// ============================================================================
// CONTACT INFO GENERATORS
// ============================================================================

export const phoneNumberGenerator = (): fc.Arbitrary<PhoneNumber> =>
  fc.tuple(
    fc.integer({ min: 11, max: 99 }), // Area code
    fc.boolean(), // Is mobile
    fc.integer({ min: 1000, max: 9999 }), // First part
    fc.integer({ min: 1000, max: 9999 })  // Second part
  ).map(([areaCode, isMobile, first, second]) => {
    const phone = isMobile 
      ? `${areaCode}9${first}${second}`
      : `${areaCode}${first}${second}`
    return new PhoneNumber(phone)
  })

export const emailGenerator = (): fc.Arbitrary<Email> =>
  fc.tuple(
    fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[a-zA-Z0-9]+$/.test(s) && s.length >= 1)
      .filter(s => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf'].includes(s.toLowerCase())),
    fc.constantFrom('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com')
  ).map(([local, domain]) => new Email(`${local}@${domain}`))

export const addressGenerator = (): fc.Arbitrary<Address> =>
  fc.tuple(
    fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
    fc.integer({ min: 1, max: 9999 }).map(String),
    fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length >= 1)),
    fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5),
    fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3),
    fc.constantFrom('SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO'),
    fc.integer({ min: 10000000, max: 99999999 }).map(String)
  ).map(([street, number, complement, neighborhood, city, state, zipCode]) =>
    new Address(street.trim(), number, complement?.trim() || null, neighborhood.trim(), city.trim(), state, zipCode)
  )

export const contactInformationGenerator = (): fc.Arbitrary<ContactInformation> =>
  fc.tuple(
    phoneNumberGenerator(),
    fc.option(phoneNumberGenerator()),
    fc.option(emailGenerator()),
    addressGenerator()
  ).map(([primaryPhone, secondaryPhone, email, address]) =>
    new ContactInformation(primaryPhone, secondaryPhone, email, address)
  )

export const emergencyContactGenerator = (): fc.Arbitrary<EmergencyContact> =>
  fc.tuple(
    fullNameGenerator(),
    phoneNumberGenerator(),
    fc.constantFrom('Pai', 'Mãe', 'Cônjuge', 'Irmão', 'Irmã', 'Filho', 'Filha', 'Amigo')
  ).map(([name, phone, relationship]) =>
    new EmergencyContact(name, phone, relationship)
  )

// ============================================================================
// PATIENT STATUS AND INSURANCE GENERATORS
// ============================================================================

export const patientStatusGenerator = (): fc.Arbitrary<PatientStatus> =>
  fc.constantFrom<PatientStatusType>('new', 'active', 'on_hold', 'discharged', 'inactive')
    .map(status => new PatientStatus(status))

export const insuranceInformationGenerator = (): fc.Arbitrary<InsuranceInformation> =>
  fc.oneof(
    // No insurance
    fc.constant(new InsuranceInformation(null, null, null, null)),
    // With insurance
    fc.tuple(
      fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
      fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 5),
      fc.option(fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3)),
      fc.option(
        fc.date({ 
          min: new Date(Date.now() + 24 * 60 * 60 * 1000), 
          max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
        }).filter(date => !isNaN(date.getTime()))
      )
    ).map(([provider, policyNumber, groupNumber, validUntil]) =>
      new InsuranceInformation(provider.trim(), policyNumber.trim(), groupNumber?.trim() || null, validUntil)
    )
  )

// ============================================================================
// MEDICAL RECORD GENERATORS
// ============================================================================

export const diagnosisGenerator = (): fc.Arbitrary<Diagnosis> =>
  fc.tuple(
    fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
    fc.string({ minLength: 10, maxLength: 200 }),
    fc.date({ min: new Date('2000-01-01'), max: new Date() }).filter(date => !isNaN(date.getTime())),
    fc.constantFrom<'mild' | 'moderate' | 'severe' | 'unknown'>('mild', 'moderate', 'severe', 'unknown')
  ).map(([code, description, diagnosedAt, severity]) =>
    new Diagnosis(code, description, diagnosedAt, severity)
  )

export const treatmentHistoryGenerator = (): fc.Arbitrary<TreatmentHistory> =>
  fc.tuple(
    uuidGenerator(),
    fc.string({ minLength: 20, maxLength: 500 }),
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
    fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    fc.date({ min: new Date('2020-01-01'), max: new Date() })
  ).map(([id, description, startDate, endDate, goals, recordedAt]) =>
    new TreatmentHistory(id, description, startDate, endDate, goals, recordedAt)
  )

export const medicationGenerator = (): fc.Arbitrary<Medication> =>
  fc.tuple(
    fc.string({ minLength: 3, maxLength: 50 }),
    fc.string({ minLength: 3, maxLength: 20 }),
    fc.string({ minLength: 5, maxLength: 30 }),
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
    fc.string({ minLength: 5, maxLength: 50 }),
    fc.option(fc.string({ minLength: 10, maxLength: 200 }))
  ).map(([name, dosage, frequency, startDate, endDate, prescribedBy, notes]) =>
    new Medication(name, dosage, frequency, startDate, endDate, prescribedBy, notes)
  )

export const allergyGenerator = (): fc.Arbitrary<Allergy> =>
  fc.tuple(
    fc.string({ minLength: 3, maxLength: 50 }),
    fc.string({ minLength: 5, maxLength: 100 }),
    fc.constantFrom<AllergySeverity>('mild', 'moderate', 'severe', 'life_threatening'),
    fc.date({ min: new Date('2000-01-01'), max: new Date() }).filter(date => !isNaN(date.getTime())),
    fc.option(fc.string({ minLength: 10, maxLength: 200 }))
  ).map(([allergen, reaction, severity, diagnosedAt, notes]) =>
    new Allergy(allergen, reaction, severity, diagnosedAt, notes)
  )

export const progressNoteGenerator = (): fc.Arbitrary<ProgressNote> =>
  fc.tuple(
    uuidGenerator(),
    fc.string({ minLength: 20, maxLength: 1000 }),
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    userIdGenerator(),
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    fc.constantFrom<'assessment' | 'treatment' | 'observation' | 'goal_progress'>('assessment', 'treatment', 'observation', 'goal_progress')
  ).map(([id, content, createdAt, createdBy, sessionDate, category]) =>
    new ProgressNote(id, content, createdAt, createdBy, sessionDate, category)
  )

export const assessmentGenerator = (): fc.Arbitrary<Assessment> =>
  fc.tuple(
    uuidGenerator(),
    fc.string({ minLength: 5, maxLength: 50 }),
    fc.dictionary(fc.string(), fc.anything()),
    fc.string({ minLength: 20, maxLength: 500 }),
    fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    userIdGenerator()
  ).map(([id, type, results, summary, recommendations, date, assessedBy]) =>
    new Assessment(id, type, results, summary, recommendations, date, assessedBy)
  )

export const treatmentPlanGenerator = (): fc.Arbitrary<TreatmentPlan> =>
  fc.tuple(
    uuidGenerator(),
    fc.string({ minLength: 20, maxLength: 500 }),
    fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
    fc.string({ minLength: 5, maxLength: 30 }),
    fc.integer({ min: 30, max: 120 })
  ).map(([id, description, goals, startDate, endDate, frequency, duration]) =>
    new TreatmentPlan(id, description, goals, startDate, endDate, frequency, duration)
  )