// ============================================================================
// SEARCH QUERY BUILDER TESTS
// Unit tests for search query builder
// ============================================================================

import { SearchQueryBuilder, SearchQueryTemplates } from '../../../application/services/SearchQueryBuilder'
import { PatientStatus } from '../../../domain/value-objects/PatientStatus'

describe('SearchQueryBuilder', () => {
  let builder: SearchQueryBuilder

  beforeEach(() => {
    builder = new SearchQueryBuilder()
  })

  describe('basic field filters', () => {
    it('should build criteria with name', () => {
      const criteria = builder.withName('Silva').build()
      expect(criteria.name).toBe('Silva')
    })

    it('should build criteria with email', () => {
      const criteria = builder.withEmail('test@example.com').build()
      expect(criteria.email).toBe('test@example.com')
    })

    it('should build criteria with phone', () => {
      const criteria = builder.withPhone('11987654321').build()
      expect(criteria.phone).toBe('11987654321')
    })

    it('should build criteria with CPF', () => {
      const criteria = builder.withCpf('123.456.789-00').build()
      expect(criteria.cpf).toBe('123.456.789-00')
    })

    it('should build criteria with medical record number', () => {
      const criteria = builder.withMedicalRecordNumber('MRN-12345').build()
      expect(criteria.medicalRecordNumber).toBe('MRN-12345')
    })
  })

  describe('status filters', () => {
    it('should build criteria with single status', () => {
      const status = new PatientStatus('active')
      const criteria = builder.withStatus(status).build()
      expect(criteria.statuses).toEqual([status])
    })

    it('should build criteria with multiple statuses', () => {
      const status1 = new PatientStatus('active')
      const status2 = new PatientStatus('on_hold')
      const criteria = builder.withStatuses(status1, status2).build()
      expect(criteria.statuses).toEqual([status1, status2])
    })
  })

  describe('age filters', () => {
    it('should build criteria with age range', () => {
      const criteria = builder.withAgeRange(18, 65).build()
      expect(criteria.ageMin).toBe(18)
      expect(criteria.ageMax).toBe(65)
    })

    it('should build criteria with minimum age only', () => {
      const criteria = builder.withMinAge(18).build()
      expect(criteria.ageMin).toBe(18)
      expect(criteria.ageMax).toBeUndefined()
    })

    it('should build criteria with maximum age only', () => {
      const criteria = builder.withMaxAge(65).build()
      expect(criteria.ageMin).toBeUndefined()
      expect(criteria.ageMax).toBe(65)
    })
  })

  describe('date filters', () => {
    it('should build criteria with date of birth range', () => {
      const from = new Date('1990-01-01')
      const to = new Date('2000-12-31')
      const criteria = builder.withDateOfBirthRange(from, to).build()
      expect(criteria.dateOfBirthFrom).toEqual(from)
      expect(criteria.dateOfBirthTo).toEqual(to)
    })

    it('should build criteria with created date range', () => {
      const after = new Date('2024-01-01')
      const before = new Date('2024-12-31')
      const criteria = builder.withCreatedDateRange(after, before).build()
      expect(criteria.createdAfter).toEqual(after)
      expect(criteria.createdBefore).toEqual(before)
    })

    it('should build criteria with updated date range', () => {
      const after = new Date('2024-01-01')
      const before = new Date('2024-12-31')
      const criteria = builder.withUpdatedDateRange(after, before).build()
      expect(criteria.updatedAfter).toEqual(after)
      expect(criteria.updatedBefore).toEqual(before)
    })
  })

  describe('medical filters', () => {
    it('should build criteria with single diagnosis', () => {
      const criteria = builder.withDiagnosis('Aphasia').build()
      expect(criteria.diagnosis).toEqual(['Aphasia'])
    })

    it('should build criteria with multiple diagnoses', () => {
      const criteria = builder.withDiagnoses('Aphasia', 'Dysarthria').build()
      expect(criteria.diagnosis).toEqual(['Aphasia', 'Dysarthria'])
    })

    it('should build criteria with single treatment type', () => {
      const criteria = builder.withTreatmentType('Speech Therapy').build()
      expect(criteria.treatmentType).toEqual(['Speech Therapy'])
    })

    it('should build criteria with multiple treatment types', () => {
      const criteria = builder.withTreatmentTypes('Speech Therapy', 'Language Therapy').build()
      expect(criteria.treatmentType).toEqual(['Speech Therapy', 'Language Therapy'])
    })
  })

  describe('location filters', () => {
    it('should build criteria with city', () => {
      const criteria = builder.withCity('São Paulo').build()
      expect(criteria.city).toBe('São Paulo')
    })

    it('should build criteria with state', () => {
      const criteria = builder.withState('SP').build()
      expect(criteria.state).toBe('SP')
    })
  })

  describe('insurance filters', () => {
    it('should build criteria with insurance provider', () => {
      const criteria = builder.withInsuranceProvider('Unimed').build()
      expect(criteria.insuranceProvider).toBe('Unimed')
    })

    it('should build criteria with insurance status', () => {
      const criteria = builder.withInsuranceStatus(true).build()
      expect(criteria.hasInsurance).toBe(true)
    })
  })

  describe('other filters', () => {
    it('should build criteria with active status', () => {
      const criteria = builder.withActiveStatus(true).build()
      expect(criteria.isActive).toBe(true)
    })

    it('should build criteria with combine mode', () => {
      const criteria = builder.withCombineMode('OR').build()
      expect(criteria.combineMode).toBe('OR')
    })
  })

  describe('method chaining', () => {
    it('should support method chaining', () => {
      const criteria = builder
        .withName('Silva')
        .withStatus(new PatientStatus('active'))
        .withAgeRange(18, 65)
        .withCity('São Paulo')
        .withState('SP')
        .build()

      expect(criteria.name).toBe('Silva')
      expect(criteria.statuses).toBeDefined()
      expect(criteria.ageMin).toBe(18)
      expect(criteria.ageMax).toBe(65)
      expect(criteria.city).toBe('São Paulo')
      expect(criteria.state).toBe('SP')
    })
  })

  describe('utility methods', () => {
    it('should reset builder', () => {
      builder.withName('Silva').withEmail('test@example.com')
      builder.reset()
      const criteria = builder.build()
      expect(Object.keys(criteria).length).toBe(0)
    })

    it('should clone builder', () => {
      builder.withName('Silva').withEmail('test@example.com')
      const cloned = builder.clone()
      const criteria = cloned.build()
      expect(criteria.name).toBe('Silva')
      expect(criteria.email).toBe('test@example.com')
    })

    it('should check if builder is empty', () => {
      expect(builder.isEmpty()).toBe(true)
      builder.withName('Silva')
      expect(builder.isEmpty()).toBe(false)
    })

    it('should count criteria', () => {
      expect(builder.getCriteriaCount()).toBe(0)
      builder.withName('Silva')
      expect(builder.getCriteriaCount()).toBe(1)
      builder.withEmail('test@example.com')
      expect(builder.getCriteriaCount()).toBe(2)
    })
  })
})

describe('SearchQueryTemplates', () => {
  describe('activeInCity', () => {
    it('should create criteria for active patients in city', () => {
      const criteria = SearchQueryTemplates.activeInCity('São Paulo')
      expect(criteria.isActive).toBe(true)
      expect(criteria.city).toBe('São Paulo')
    })
  })

  describe('byAgeGroup', () => {
    it('should create criteria for children', () => {
      const criteria = SearchQueryTemplates.byAgeGroup('child')
      expect(criteria.ageMin).toBe(0)
      expect(criteria.ageMax).toBe(12)
    })

    it('should create criteria for teens', () => {
      const criteria = SearchQueryTemplates.byAgeGroup('teen')
      expect(criteria.ageMin).toBe(13)
      expect(criteria.ageMax).toBe(17)
    })

    it('should create criteria for adults', () => {
      const criteria = SearchQueryTemplates.byAgeGroup('adult')
      expect(criteria.ageMin).toBe(18)
      expect(criteria.ageMax).toBe(64)
    })

    it('should create criteria for seniors', () => {
      const criteria = SearchQueryTemplates.byAgeGroup('senior')
      expect(criteria.ageMin).toBe(65)
      expect(criteria.ageMax).toBeUndefined()
    })
  })

  describe('newPatientsInLastDays', () => {
    it('should create criteria for new patients', () => {
      const criteria = SearchQueryTemplates.newPatientsInLastDays(7)
      expect(criteria.statuses).toBeDefined()
      expect(criteria.createdAfter).toBeDefined()
      expect(criteria.createdBefore).toBeDefined()
    })
  })

  describe('insurance templates', () => {
    it('should create criteria for patients with insurance', () => {
      const criteria = SearchQueryTemplates.withInsurance()
      expect(criteria.hasInsurance).toBe(true)
    })

    it('should create criteria for patients without insurance', () => {
      const criteria = SearchQueryTemplates.withoutInsurance()
      expect(criteria.hasInsurance).toBe(false)
    })
  })

  describe('medical templates', () => {
    it('should create criteria by diagnosis', () => {
      const criteria = SearchQueryTemplates.byDiagnosis('Aphasia')
      expect(criteria.diagnosis).toEqual(['Aphasia'])
    })

    it('should create criteria by treatment type', () => {
      const criteria = SearchQueryTemplates.byTreatmentType('Speech Therapy')
      expect(criteria.treatmentType).toEqual(['Speech Therapy'])
    })
  })

  describe('status templates', () => {
    it('should create criteria for inactive patients', () => {
      const criteria = SearchQueryTemplates.inactive()
      expect(criteria.statuses).toBeDefined()
      expect(criteria.statuses![0].value).toBe('inactive')
    })

    it('should create criteria for patients on hold', () => {
      const criteria = SearchQueryTemplates.onHold()
      expect(criteria.statuses).toBeDefined()
      expect(criteria.statuses![0].value).toBe('on_hold')
    })
  })
})
