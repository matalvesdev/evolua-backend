// ============================================================================
// PATIENT REPOSITORY FACTORY
// Factory for creating Patient Repository instances
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { SupabasePatientRepository } from '../repositories/SupabasePatientRepository'
import { IPatientRepository } from '../repositories/IPatientRepository'

/**
 * Factory for creating Patient Repository instances
 * 
 * This factory provides a centralized way to create repository instances
 * with proper configuration and dependencies.
 */
export class PatientRepositoryFactory {
  /**
   * Create a Supabase Patient Repository instance
   * 
   * @param supabaseClient - Configured Supabase client
   * @param clinicId - Default clinic ID for operations
   * @param therapistId - Default therapist ID for operations
   * @returns Configured Patient Repository instance
   */
  static createSupabaseRepository(
    supabaseClient: SupabaseClient<Database>,
    clinicId: string,
    therapistId: string
  ): IPatientRepository {
    return new SupabasePatientRepository(supabaseClient, clinicId, therapistId)
  }

  /**
   * Create a Patient Repository instance with environment defaults
   * 
   * This method uses environment variables and default configurations
   * to create a repository instance suitable for most use cases.
   * 
   * @param supabaseClient - Configured Supabase client
   * @param userId - Current user ID (will be used as therapist ID)
   * @param clinicId - Optional clinic ID (defaults to user's clinic)
   * @returns Configured Patient Repository instance
   */
  static createDefault(
    supabaseClient: SupabaseClient<Database>,
    userId: string,
    clinicId?: string
  ): IPatientRepository {
    // Use provided clinic ID or default to a placeholder
    const defaultClinicId = clinicId || 'default-clinic-id'
    
    return new SupabasePatientRepository(
      supabaseClient,
      defaultClinicId,
      userId
    )
  }
}