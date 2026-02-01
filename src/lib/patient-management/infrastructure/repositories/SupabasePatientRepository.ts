// ============================================================================
// SUPABASE PATIENT REPOSITORY IMPLEMENTATION
// Implements patient data persistence using Supabase PostgreSQL
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { 
  IPatientRepository, 
  CreatePatientData, 
  UpdatePatientData, 
  SearchCriteria, 
  PaginationOptions, 
  PaginatedResult 
} from './IPatientRepository'
import { Patient } from '../../domain/entities/Patient'
import { PatientId } from '../../domain/value-objects/PatientId'
import { PatientStatus } from '../../domain/value-objects/PatientStatus'
import { PersonalInformation } from '../../domain/value-objects/PersonalInformation'
import { ContactInformation } from '../../domain/value-objects/ContactInformation'
import { EmergencyContact } from '../../domain/value-objects/EmergencyContact'
import { InsuranceInformation } from '../../domain/value-objects/InsuranceInformation'
import { FullName } from '../../domain/value-objects/FullName'
import { Gender } from '../../domain/value-objects/Gender'
import { CPF } from '../../domain/value-objects/CPF'
import { RG } from '../../domain/value-objects/RG'
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber'
import { Email } from '../../domain/value-objects/Email'
import { Address } from '../../domain/value-objects/Address'
import { UserId } from '../../domain/value-objects/UserId'

type PatientRow = Database['public']['Tables']['patients']['Row']
type PatientInsert = Database['public']['Tables']['patients']['Insert']
type PatientUpdate = Database['public']['Tables']['patients']['Update']

/**
 * Supabase implementation of the Patient Repository
 * 
 * This implementation maps between the domain entities and the current
 * database schema. Note: The current schema is simplified and doesn't
 * include all fields from the design document (status, insurance, etc.).
 * 
 * Requirements: 1.1, 1.5, 7.1, 7.2
 */
export class SupabasePatientRepository implements IPatientRepository {
  constructor(
    private supabase: SupabaseClient<Database>,
    private defaultClinicId: string,
    private defaultTherapistId: string
  ) {}

  async create(patientData: CreatePatientData, createdBy: string): Promise<Patient> {
    try {
      // Map domain data to database format
      const insertData: PatientInsert = {
        clinic_id: this.defaultClinicId,
        therapist_id: createdBy,
        full_name: patientData.personalInfo.fullName,
        date_of_birth: patientData.personalInfo.dateOfBirth.toISOString().split('T')[0],
        cpf: patientData.personalInfo.cpf,
        rg: patientData.personalInfo.rg,
        gender: patientData.personalInfo.gender,
        phone: patientData.contactInfo.primaryPhone,
        email: patientData.contactInfo.email || null,
        address: this.formatAddress(patientData.contactInfo.address),
        city: patientData.contactInfo.address.city,
        state: patientData.contactInfo.address.state,
        zip_code: patientData.contactInfo.address.zipCode,
        emergency_contact_name: patientData.emergencyContact.name,
        emergency_contact_phone: patientData.emergencyContact.phone,
        active: true
      }

      const { data, error } = await this.supabase
        .from('patients')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create patient: ${error.message}`)
      }

      return this.mapRowToEntity(data)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while creating patient')
    }
  }

  async findById(id: PatientId): Promise<Patient | null> {
    try {
      const { data, error } = await this.supabase
        .from('patients')
        .select('*')
        .eq('id', id.value)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new Error(`Failed to find patient: ${error.message}`)
      }

      return this.mapRowToEntity(data)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while finding patient')
    }
  }

  async update(id: PatientId, updates: UpdatePatientData): Promise<Patient> {
    try {
      const updateData: PatientUpdate = {}

      // Map domain updates to database format
      if (updates.personalInfo) {
        if (updates.personalInfo.fullName) updateData.full_name = updates.personalInfo.fullName
        if (updates.personalInfo.dateOfBirth) {
          updateData.date_of_birth = updates.personalInfo.dateOfBirth.toISOString().split('T')[0]
        }
        if (updates.personalInfo.cpf) updateData.cpf = updates.personalInfo.cpf
        if (updates.personalInfo.rg) updateData.rg = updates.personalInfo.rg
        if (updates.personalInfo.gender) updateData.gender = updates.personalInfo.gender
      }

      if (updates.contactInfo) {
        if (updates.contactInfo.primaryPhone) updateData.phone = updates.contactInfo.primaryPhone
        if (updates.contactInfo.email !== undefined) updateData.email = updates.contactInfo.email
        if (updates.contactInfo.address) {
          updateData.address = this.formatAddress(updates.contactInfo.address)
          updateData.city = updates.contactInfo.address.city
          updateData.state = updates.contactInfo.address.state
          updateData.zip_code = updates.contactInfo.address.zipCode
        }
      }

      if (updates.emergencyContact) {
        if (updates.emergencyContact.name) updateData.emergency_contact_name = updates.emergencyContact.name
        if (updates.emergencyContact.phone) updateData.emergency_contact_phone = updates.emergencyContact.phone
      }

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await this.supabase
        .from('patients')
        .update(updateData)
        .eq('id', id.value)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update patient: ${error.message}`)
      }

      return this.mapRowToEntity(data)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while updating patient')
    }
  }

  async delete(id: PatientId): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('patients')
        .delete()
        .eq('id', id.value)

      if (error) {
        throw new Error(`Failed to delete patient: ${error.message}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while deleting patient')
    }
  }

  async search(
    criteria: SearchCriteria,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    try {
      let query = this.supabase
        .from('patients')
        .select('*', { count: 'exact' })

      // Apply search criteria
      if (criteria.query) {
        query = query.or(`full_name.ilike.%${criteria.query}%,email.ilike.%${criteria.query}%,phone.ilike.%${criteria.query}%,cpf.ilike.%${criteria.query}%`)
      }

      if (criteria.status) {
        // Map status to active field (simplified mapping)
        const isActive = criteria.status.isActive() || criteria.status.isNew()
        query = query.eq('active', isActive)
      }

      if (criteria.ageRange) {
        if (criteria.ageRange.min !== undefined) {
          const maxDate = new Date()
          maxDate.setFullYear(maxDate.getFullYear() - criteria.ageRange.min)
          query = query.lte('date_of_birth', maxDate.toISOString().split('T')[0])
        }
        if (criteria.ageRange.max !== undefined) {
          const minDate = new Date()
          minDate.setFullYear(minDate.getFullYear() - criteria.ageRange.max - 1)
          query = query.gte('date_of_birth', minDate.toISOString().split('T')[0])
        }
      }

      if (criteria.createdAfter) {
        query = query.gte('created_at', criteria.createdAfter.toISOString())
      }

      if (criteria.createdBefore) {
        query = query.lte('created_at', criteria.createdBefore.toISOString())
      }

      // Apply sorting
      const sortColumn = this.mapSortColumn(pagination.sortBy || 'name')
      const sortOrder = pagination.sortOrder || 'asc'
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit
      const to = from + pagination.limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to search patients: ${error.message}`)
      }

      const patients = data?.map(row => this.mapRowToEntity(row)) || []
      const total = count || 0
      const totalPages = Math.ceil(total / pagination.limit)

      return {
        data: patients,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while searching patients')
    }
  }

  async findByStatus(
    status: PatientStatus,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    return this.search({ status }, pagination)
  }

  async findByName(
    name: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    return this.search({ query: name }, pagination)
  }

  async findByContact(
    contact: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Patient>> {
    return this.search({ query: contact }, pagination)
  }

  async existsByCpf(cpf: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('patients')
        .select('id')
        .eq('cpf', cpf)
        .limit(1)

      if (error) {
        throw new Error(`Failed to check CPF existence: ${error.message}`)
      }

      return (data?.length || 0) > 0
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while checking CPF existence')
    }
  }

  async findPotentialDuplicates(personalInfo: {
    fullName: string
    dateOfBirth: Date
    cpf?: string
  }): Promise<Patient[]> {
    try {
      let query = this.supabase
        .from('patients')
        .select('*')

      // Check for exact CPF match first
      if (personalInfo.cpf) {
        const { data: cpfMatches } = await this.supabase
          .from('patients')
          .select('*')
          .eq('cpf', personalInfo.cpf)

        if (cpfMatches && cpfMatches.length > 0) {
          return cpfMatches.map(row => this.mapRowToEntity(row))
        }
      }

      // Check for name and date of birth similarity
      const dateOfBirth = personalInfo.dateOfBirth.toISOString().split('T')[0]
      query = query
        .eq('date_of_birth', dateOfBirth)
        .ilike('full_name', `%${personalInfo.fullName}%`)

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to find potential duplicates: ${error.message}`)
      }

      return data?.map(row => this.mapRowToEntity(row)) || []
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while finding potential duplicates')
    }
  }

  async count(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })

      if (error) {
        throw new Error(`Failed to count patients: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while counting patients')
    }
  }

  async countByStatus(status: PatientStatus): Promise<number> {
    try {
      // Map status to active field (simplified mapping)
      const isActive = status.isActive() || status.isNew()
      
      const { count, error } = await this.supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('active', isActive)

      if (error) {
        throw new Error(`Failed to count patients by status: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error occurred while counting patients by status')
    }
  }

  // Private helper methods

  private mapRowToEntity(row: PatientRow): Patient {
    // Create value objects from database row
    const patientId = new PatientId(row.id)
    
    const personalInfo = new PersonalInformation(
      new FullName(row.full_name),
      row.date_of_birth ? new Date(row.date_of_birth) : new Date(),
      new Gender(row.gender || 'not_specified'),
      new CPF(row.cpf || ''),
      new RG(row.rg || '')
    )

    const contactInfo = new ContactInformation(
      new PhoneNumber(row.phone || '11987654321'), // Default valid phone
      null, // secondary phone not in current schema
      row.email ? new Email(row.email) : null,
      this.parseAddress(row.address, row.city, row.state, row.zip_code)
    )

    const emergencyContact = new EmergencyContact(
      new FullName(row.emergency_contact_name || 'Contato não informado'),
      new PhoneNumber(row.emergency_contact_phone || '11987654321'), // Default valid phone
      'not_specified' // relationship not in current schema
    )

    // Insurance info not in current schema, using empty values
    const insuranceInfo = new InsuranceInformation(null, null, null, null)

    // Map active field to status (simplified mapping)
    const status = new PatientStatus(row.active ? 'active' : 'inactive')

    const createdBy = new UserId(row.therapist_id)

    return new Patient(
      patientId,
      personalInfo,
      contactInfo,
      emergencyContact,
      insuranceInfo,
      status,
      new Date(row.created_at),
      new Date(row.updated_at),
      createdBy
    )
  }

  private formatAddress(address: CreatePatientData['contactInfo']['address']): string {
    return `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''}, ${address.neighborhood}`
  }

  private parseAddress(
    addressString: string | null,
    city: string | null,
    state: string | null,
    zipCode: string | null
  ): Address {
    // Parse the address string back to components
    // This is a simplified implementation for the current database schema
    const parts = addressString?.split(', ') || []
    
    return new Address(
      parts[0] || 'Rua não informada',
      parts[1] || 'S/N',
      parts.length > 3 ? parts[2] : null,
      parts[2] || parts[parts.length - 1] || 'Bairro não informado',
      city || 'Cidade não informada',
      state || 'SP',
      zipCode || '00000000'
    )
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      'name': 'full_name',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'status': 'active'
    }
    
    return columnMap[sortBy] || 'full_name'
  }
}