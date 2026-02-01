// ============================================================================
// ENCRYPTION SERVICE
// AES-256-GCM encryption service for LGPD compliance
// ============================================================================

import { createCipherGCM, createDecipherGCM, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export interface EncryptionResult {
  encryptedData: string
  iv: string
  authTag: string
  salt: string
}

export interface DecryptionInput {
  encryptedData: string
  iv: string
  authTag: string
  salt: string
}

/**
 * Encryption Service
 * 
 * Provides AES-256-GCM encryption/decryption for sensitive patient data
 * following LGPD requirements for data protection.
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32 // 256 bits
  private readonly ivLength = 16 // 128 bits
  private readonly saltLength = 32 // 256 bits
  private readonly tagLength = 16 // 128 bits

  constructor(private readonly masterKey: string) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters long')
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param data - Plain text data to encrypt
   * @returns Promise resolving to encrypted data with metadata
   */
  async encrypt(data: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength)
      const iv = randomBytes(this.ivLength)

      // Derive key from master key and salt
      const key = await this.deriveKey(this.masterKey, salt)

      // Create cipher
      const cipher = createCipherGCM(this.algorithm, key, iv)

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Get authentication tag
      const authTag = cipher.getAuthTag()

      // Combine all components into a single string
      const result: EncryptionResult = {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex')
      }

      return JSON.stringify(result)
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedString - Encrypted data string with metadata
   * @returns Promise resolving to decrypted plain text
   */
  async decrypt(encryptedString: string): Promise<string> {
    try {
      // Parse encrypted data components
      const encryptionData: EncryptionResult = JSON.parse(encryptedString)
      
      // Convert hex strings back to buffers
      const salt = Buffer.from(encryptionData.salt, 'hex')
      const iv = Buffer.from(encryptionData.iv, 'hex')
      const authTag = Buffer.from(encryptionData.authTag, 'hex')

      // Derive key from master key and salt
      const key = await this.deriveKey(this.masterKey, salt)

      // Create decipher
      const decipher = createDecipherGCM(this.algorithm, key, iv)
      decipher.setAuthTag(authTag)

      // Decrypt data
      let decrypted = decipher.update(encryptionData.encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Encrypt file data for document storage
   * @param fileBuffer - File buffer to encrypt
   * @returns Promise resolving to encrypted file data
   */
  async encryptFile(fileBuffer: Buffer): Promise<string> {
    try {
      const base64Data = fileBuffer.toString('base64')
      return await this.encrypt(base64Data)
    } catch (error) {
      throw new Error(`File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt file data from document storage
   * @param encryptedString - Encrypted file data string
   * @returns Promise resolving to decrypted file buffer
   */
  async decryptFile(encryptedString: string): Promise<Buffer> {
    try {
      const base64Data = await this.decrypt(encryptedString)
      return Buffer.from(base64Data, 'base64')
    } catch (error) {
      throw new Error(`File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate encryption key for field-level encryption
   * @param fieldName - Name of the field being encrypted
   * @param patientId - Patient ID for key derivation
   * @returns Promise resolving to field-specific encryption key
   */
  async generateFieldKey(fieldName: string, patientId: string): Promise<Buffer> {
    try {
      const keyMaterial = `${this.masterKey}:${fieldName}:${patientId}`
      const salt = Buffer.from(patientId, 'utf8')
      return await this.deriveKey(keyMaterial, salt)
    } catch (error) {
      throw new Error(`Field key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Encrypt individual field data
   * @param fieldValue - Field value to encrypt
   * @param fieldName - Name of the field
   * @param patientId - Patient ID
   * @returns Promise resolving to encrypted field value
   */
  async encryptField(fieldValue: string, fieldName: string, patientId: string): Promise<string> {
    try {
      // Use field-specific encryption for better security
      const fieldKey = await this.generateFieldKey(fieldName, patientId)
      const iv = randomBytes(this.ivLength)
      
      const cipher = createCipherGCM(this.algorithm, fieldKey, iv)
      let encrypted = cipher.update(fieldValue, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      
      const result = {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        fieldName,
        patientId
      }
      
      return JSON.stringify(result)
    } catch (error) {
      throw new Error(`Field encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt individual field data
   * @param encryptedFieldString - Encrypted field data string
   * @returns Promise resolving to decrypted field value
   */
  async decryptField(encryptedFieldString: string): Promise<string> {
    try {
      const fieldData = JSON.parse(encryptedFieldString)
      
      const fieldKey = await this.generateFieldKey(fieldData.fieldName, fieldData.patientId)
      const iv = Buffer.from(fieldData.iv, 'hex')
      const authTag = Buffer.from(fieldData.authTag, 'hex')
      
      const decipher = createDecipherGCM(this.algorithm, fieldKey, iv)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(fieldData.encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error(`Field decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate encryption integrity
   * @param encryptedString - Encrypted data to validate
   * @returns Promise resolving to validation result
   */
  async validateEncryption(encryptedString: string): Promise<boolean> {
    try {
      // Try to parse the encrypted data structure
      const encryptionData: EncryptionResult = JSON.parse(encryptedString)
      
      // Validate required fields
      if (!encryptionData.encryptedData || 
          !encryptionData.iv || 
          !encryptionData.authTag || 
          !encryptionData.salt) {
        return false
      }
      
      // Validate hex string formats
      const hexRegex = /^[0-9a-fA-F]+$/
      if (!hexRegex.test(encryptionData.iv) ||
          !hexRegex.test(encryptionData.authTag) ||
          !hexRegex.test(encryptionData.salt) ||
          !hexRegex.test(encryptionData.encryptedData)) {
        return false
      }
      
      // Validate component lengths
      if (Buffer.from(encryptionData.iv, 'hex').length !== this.ivLength ||
          Buffer.from(encryptionData.authTag, 'hex').length !== this.tagLength ||
          Buffer.from(encryptionData.salt, 'hex').length !== this.saltLength) {
        return false
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Generate secure random key for new encryption contexts
   * @returns Promise resolving to new random key
   */
  async generateSecureKey(): Promise<string> {
    try {
      const keyBuffer = randomBytes(this.keyLength)
      return keyBuffer.toString('hex')
    } catch (error) {
      throw new Error(`Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    try {
      return (await scryptAsync(password, salt, this.keyLength)) as Buffer
    } catch (error) {
      throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Factory function to create encryption service with environment-based key
 */
export function createEncryptionService(): EncryptionService {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'default-development-key-not-for-production-use-32chars'
  
  if (process.env.NODE_ENV === 'production' && masterKey === 'default-development-key-not-for-production-use-32chars') {
    throw new Error('Production environment requires a secure ENCRYPTION_MASTER_KEY environment variable')
  }
  
  return new EncryptionService(masterKey)
}