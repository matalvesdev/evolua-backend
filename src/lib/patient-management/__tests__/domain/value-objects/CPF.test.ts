// ============================================================================
// CPF VALUE OBJECT TESTS
// Unit tests for CPF validation and formatting
// ============================================================================

import { CPF } from '../../../domain/value-objects/CPF'

describe('CPF Value Object', () => {
  describe('Valid CPFs', () => {
    const validCpfs = [
      '11144477735',
      '111.444.777-35',
      '12345678909',
      '123.456.789-09'
    ]

    validCpfs.forEach(cpf => {
      it(`should accept valid CPF: ${cpf}`, () => {
        expect(() => new CPF(cpf)).not.toThrow()
      })
    })

    it('should format CPF correctly', () => {
      const cpf = new CPF('11144477735')
      expect(cpf.value).toBe('111.444.777-35')
    })

    it('should return clean value', () => {
      const cpf = new CPF('111.444.777-35')
      expect(cpf.getCleanValue()).toBe('11144477735')
    })
  })

  describe('Invalid CPFs', () => {
    const invalidCpfs = [
      '',
      '123',
      '12345678901', // Invalid check digit
      '11111111111', // All same digits
      '00000000000', // All zeros
      'abc.def.ghi-jk' // Non-numeric
    ]

    invalidCpfs.forEach(cpf => {
      it(`should reject invalid CPF: ${cpf}`, () => {
        expect(() => new CPF(cpf)).toThrow()
      })
    })
  })

  describe('Equality', () => {
    it('should consider CPFs with same digits as equal', () => {
      const cpf1 = new CPF('11144477735')
      const cpf2 = new CPF('111.444.777-35')
      
      expect(cpf1.equals(cpf2)).toBe(true)
    })

    it('should consider different CPFs as not equal', () => {
      const cpf1 = new CPF('11144477735')
      const cpf2 = new CPF('12345678909')
      
      expect(cpf1.equals(cpf2)).toBe(false)
    })
  })
})