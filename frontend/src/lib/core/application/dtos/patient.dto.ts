export interface PatientListItemDto {
  id: string
  name: string
  email?: string
  phone?: string
  status: string
  therapistId?: string
  createdAt: string
}

export interface PatientDetailDto {
  id: string
  clinicId: string
  name: string
  email?: string
  phone?: string
  cpf?: string
  birthDate?: string
  status: string
  guardianName?: string
  guardianPhone?: string
  guardianRelationship?: string
  therapistId?: string
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipCode?: string
  } | null
  medicalHistory?: {
    diagnosis?: string[]
    medications?: string[]
    allergies?: string[]
    notes?: string
  } | null
  createdAt: string
  updatedAt: string
}
