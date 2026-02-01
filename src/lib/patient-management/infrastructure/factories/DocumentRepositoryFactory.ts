// ============================================================================
// DOCUMENT REPOSITORY FACTORY
// Factory for creating enhanced Document Repository instances with encryption support
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { SupabaseDocumentRepository } from '../repositories/SupabaseDocumentRepository'
import { IDocumentRepository } from '../repositories/IDocumentRepository'

/**
 * Factory for creating Document Repository instances
 * 
 * This factory provides a centralized way to create repository instances
 * with proper configuration and dependencies for document management,
 * including encryption and version control support.
 */
export class DocumentRepositoryFactory {
  /**
   * Create a Supabase Document Repository instance with encryption support
   * 
   * @param supabaseClient - Configured Supabase client
   * @param masterKey - Optional master key for encryption (uses env var if not provided)
   * @returns Configured Document Repository instance
   */
  static createSupabaseRepository(
    supabaseClient: SupabaseClient<Database>,
    masterKey?: string
  ): IDocumentRepository {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing')
    }

    return new SupabaseDocumentRepository(supabaseUrl, supabaseKey, masterKey)
  }

  /**
   * Create a Document Repository instance with environment defaults
   * 
   * This method uses environment variables and default configurations
   * to create a repository instance suitable for most use cases.
   * 
   * @param supabaseClient - Configured Supabase client
   * @param masterKey - Optional master key for encryption (uses env var if not provided)
   * @returns Configured Document Repository instance
   */
  static createDefault(
    supabaseClient: SupabaseClient<Database>,
    masterKey?: string
  ): IDocumentRepository {
    return DocumentRepositoryFactory.createSupabaseRepository(supabaseClient, masterKey)
  }

  /**
   * Create a Document Repository instance for testing
   * 
   * @param supabaseUrl - Test Supabase URL
   * @param supabaseKey - Test Supabase key
   * @param masterKey - Test master key for encryption
   * @returns Configured Document Repository instance for testing
   */
  static createForTesting(
    supabaseUrl: string,
    supabaseKey: string,
    masterKey?: string
  ): IDocumentRepository {
    return new SupabaseDocumentRepository(supabaseUrl, supabaseKey, masterKey)
  }

  /**
   * Create a Document Repository instance with custom encryption configuration
   * 
   * @param supabaseClient - Configured Supabase client
   * @param config - Custom configuration options
   * @returns Configured Document Repository instance
   */
  static createWithConfig(
    supabaseClient: SupabaseClient<Database>,
    config: {
      masterKey?: string
      encryptionAlgorithm?: string
      enableVersionControl?: boolean
      enableAccessControl?: boolean
    }
  ): IDocumentRepository {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing')
    }

    // For now, we pass the master key to the repository
    // In the future, we could extend this to support more configuration options
    return new SupabaseDocumentRepository(supabaseUrl, supabaseKey, config.masterKey)
  }
}