// ============================================================================
// TESTING SETUP
// Configuration for property-based testing with fast-check
// ============================================================================

import * as fc from 'fast-check'

// Configure fast-check globally
beforeAll(() => {
  // Set global configuration for property-based tests
  fc.configureGlobal({
    numRuns: 100, // Run each property test 100 times
    verbose: true,
    seed: 42, // Use deterministic seed for reproducible tests
    endOnFailure: true
  })
})

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R
      toBeValidCPF(): R
      toBeValidEmail(): R
      toBeValidPhoneNumber(): R
    }
  }
}

// Custom matchers for domain validation
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass
    }
  },

  toBeValidCPF(received: string) {
    const cleanCpf = received.replace(/\D/g, '')
    
    if (cleanCpf.length !== 11) {
      return { message: () => `expected ${received} to be a valid CPF`, pass: false }
    }

    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      return { message: () => `expected ${received} to be a valid CPF`, pass: false }
    }

    // Validate check digits
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i)
    }
    let remainder = sum % 11
    let firstCheckDigit = remainder < 2 ? 0 : 11 - remainder

    if (parseInt(cleanCpf.charAt(9)) !== firstCheckDigit) {
      return { message: () => `expected ${received} to be a valid CPF`, pass: false }
    }

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i)
    }
    remainder = sum % 11
    let secondCheckDigit = remainder < 2 ? 0 : 11 - remainder

    const pass = parseInt(cleanCpf.charAt(10)) === secondCheckDigit
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid CPF`,
      pass
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received) && received.length <= 254
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass
    }
  },

  toBeValidPhoneNumber(received: string) {
    const cleanPhone = received.replace(/\D/g, '')
    const pass = (cleanPhone.length === 10 || cleanPhone.length === 11) && 
                 parseInt(cleanPhone.substring(0, 2)) >= 11 && 
                 parseInt(cleanPhone.substring(0, 2)) <= 99
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid Brazilian phone number`,
      pass
    }
  }
})