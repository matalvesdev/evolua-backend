export interface PatientListItemDto {
  id: string
  fullName: string
  email?: string
  phone?: string
  status: string
  therapistId?: string
  createdAt: string
}

export interface PatientDetailDto {
  id: string
  clinicId: string
  fullName: string
  email?: string
  phone?: string
  cpf?: string
  dateOfBirth?: string
  gender?: string
  status: string
  therapistId?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
