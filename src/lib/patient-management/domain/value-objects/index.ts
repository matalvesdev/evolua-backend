// ============================================================================
// VALUE OBJECTS INDEX
// Exports all value objects for the patient management domain
// ============================================================================

// Core identifiers
export { PatientId } from './PatientId'
export { MedicalRecordId } from './MedicalRecordId'
export { UserId } from './UserId'

// Personal information
export { FullName } from './FullName'
export { CPF } from './CPF'
export { RG } from './RG'
export { Gender, type GenderType } from './Gender'
export { PersonalInformation } from './PersonalInformation'

// Contact information
export { PhoneNumber } from './PhoneNumber'
export { Email } from './Email'
export { Address } from './Address'
export { ContactInformation } from './ContactInformation'
export { EmergencyContact } from './EmergencyContact'

// Patient status and insurance
export { PatientStatus, type PatientStatusType } from './PatientStatus'
export { InsuranceInformation } from './InsuranceInformation'

// Medical record components
export { Diagnosis } from './Diagnosis'
export { TreatmentHistory } from './TreatmentHistory'
export { Medication } from './Medication'
export { Allergy, type AllergySeverity } from './Allergy'
export { ProgressNote } from './ProgressNote'
export { Assessment } from './Assessment'
export { TreatmentPlan } from './TreatmentPlan'