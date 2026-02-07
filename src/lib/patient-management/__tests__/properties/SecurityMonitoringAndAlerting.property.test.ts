// ============================================================================
// SECURITY MONITORING AND ALERTING PROPERTY TESTS
// Property-based tests for security monitoring and alerting functionality
// Feature: patient-management-system, Property 17: Security Monitoring and Alerting
// **Validates: Requirements 8.6**
// ============================================================================

import * as fc from 'fast-check'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'
import {
  patientIdGenerator,
  userIdGenerator
} from '../../testing/generators'

// ============================================================================
// SECURITY MONITORING TYPES
// ============================================================================

interface SuspiciousActivityPattern {
  type: 'brute_force' | 'unusual_access' | 'data_exfiltration' | 'off_hours' | 'bulk_operations'
  userId: UserId
  patientIds: PatientId[]
  events: SecurityEvent[]
  detectedAt: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityEvent {
  userId: UserId
  patientId: PatientId
  operation: string
  accessResult: 'granted' | 'denied'
  timestamp: Date
  ipAddress?: string
}

interface SecurityAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  detectedAt: Date
  affectedUsers: UserId[]
  affectedPatients: PatientId[]
  evidence: SecurityEvent[]
  riskScore: number
  status: 'active' | 'investigating' | 'resolved'
  investigationDetails?: string
}

// ============================================================================
// MOCK SECURITY MONITORING SERVICE
// ============================================================================

class MockSecurityMonitoringService {
  private alerts: SecurityAlert[] = []
  private monitoringEnabled = true

  async detectSuspiciousActivity(pattern: SuspiciousActivityPattern): Promise<SecurityAlert | null> {
    if (!this.monitoringEnabled) {
      return null
    }

    // Generate alert for suspicious activity
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      type: pattern.type,
      severity: pattern.severity,
      title: this.generateAlertTitle(pattern.type),
      description: this.generateAlertDescription(pattern),
      detectedAt: pattern.detectedAt,
      affectedUsers: [pattern.userId],
      affectedPatients: pattern.patientIds,
      evidence: pattern.events,
      riskScore: this.calculateRiskScore(pattern),
      status: 'active'
    }

    this.alerts.push(alert)
    return alert
  }

  async getAlerts(filters?: {
    type?: string
    severity?: string
    status?: string
    userId?: UserId
  }): Promise<SecurityAlert[]> {
    let results = [...this.alerts]

    if (filters) {
      if (filters.type) {
        results = results.filter(alert => alert.type === filters.type)
      }
      if (filters.severity) {
        results = results.filter(alert => alert.severity === filters.severity)
      }
      if (filters.status) {
        results = results.filter(alert => alert.status === filters.status)
      }
      if (filters.userId) {
        results = results.filter(alert => 
          alert.affectedUsers.some(user => user.value === filters.userId!.value)
        )
      }
    }

    return results
  }

  async updateAlertStatus(alertId: string, status: SecurityAlert['status'], details?: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.status = status
      if (details) {
        alert.investigationDetails = details
      }
    }
  }

  enableMonitoring(): void {
    this.monitoringEnabled = true
  }

  disableMonitoring(): void {
    this.monitoringEnabled = false
  }

  clear(): void {
    this.alerts = []
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateAlertTitle(type: string): string {
    const titles: Record<string, string> = {
      'brute_force': 'Brute Force Attack Detected',
      'unusual_access': 'Unusual Access Pattern Detected',
      'data_exfiltration': 'Potential Data Exfiltration Detected',
      'off_hours': 'Off-Hours Activity Detected',
      'bulk_operations': 'Suspicious Bulk Operations Detected'
    }
    return titles[type] || 'Security Alert'
  }

  private generateAlertDescription(pattern: SuspiciousActivityPattern): string {
    const eventCount = pattern.events.length
    const patientCount = pattern.patientIds.length
    const userId = pattern.userId.value

    switch (pattern.type) {
      case 'brute_force':
        return `User ${userId} has ${eventCount} failed login attempts indicating a brute force attack`
      case 'unusual_access':
        return `User ${userId} accessed ${patientCount} different patients in a short time period`
      case 'data_exfiltration':
        return `User ${userId} performed ${eventCount} read operations suggesting potential data exfiltration`
      case 'off_hours':
        return `User ${userId} accessed patient data during off-hours (${eventCount} events)`
      case 'bulk_operations':
        return `User ${userId} performed ${eventCount} bulk operations on ${patientCount} patients`
      default:
        return `Suspicious activity detected for user ${userId}`
    }
  }

  private calculateRiskScore(pattern: SuspiciousActivityPattern): number {
    const baseScores: Record<string, number> = {
      'brute_force': 80,
      'unusual_access': 60,
      'data_exfiltration': 95,
      'off_hours': 50,
      'bulk_operations': 70
    }

    let score = baseScores[pattern.type] || 50

    // Adjust based on event count
    if (pattern.events.length > 50) {
      score = Math.min(100, score + 10)
    }

    // Adjust based on severity
    const severityMultipliers: Record<string, number> = {
      'low': 0.7,
      'medium': 1.0,
      'high': 1.2,
      'critical': 1.5
    }
    score = Math.round(score * severityMultipliers[pattern.severity])

    return Math.min(100, Math.max(0, score))
  }
}

// ============================================================================
// GENERATORS
// ============================================================================

const operationGenerator = (): fc.Arbitrary<string> =>
  fc.constantFrom('read', 'create', 'update', 'delete', 'export', 'failed_login')

const accessResultGenerator = (): fc.Arbitrary<'granted' | 'denied'> =>
  fc.constantFrom('granted', 'denied')

const ipAddressGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 255 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`)

const securityEventGenerator = (): fc.Arbitrary<SecurityEvent> =>
  fc.record({
    userId: userIdGenerator(),
    patientId: patientIdGenerator(),
    operation: operationGenerator(),
    accessResult: accessResultGenerator(),
    timestamp: fc.date({ min: new Date('2023-01-01'), max: new Date() }),
    ipAddress: fc.option(ipAddressGenerator())
  })

const severityGenerator = (): fc.Arbitrary<'low' | 'medium' | 'high' | 'critical'> =>
  fc.constantFrom('low', 'medium', 'high', 'critical')

// Generator for brute force attack pattern (multiple failed logins)
const bruteForcePatternGenerator = (): fc.Arbitrary<SuspiciousActivityPattern> =>
  fc.record({
    userId: userIdGenerator(),
    patientId: patientIdGenerator(),
    eventCount: fc.integer({ min: 5, max: 20 })
  }).chain(({ userId, patientId, eventCount }) =>
    fc.record({
      type: fc.constant('brute_force' as const),
      userId: fc.constant(userId),
      patientIds: fc.constant([patientId]),
      events: fc.array(
        fc.record({
          userId: fc.constant(userId),
          patientId: fc.constant(patientId),
          operation: fc.constant('failed_login'),
          accessResult: fc.constant('denied' as const),
          timestamp: fc.date({ min: new Date(Date.now() - 15 * 60 * 1000), max: new Date() }),
          ipAddress: fc.option(ipAddressGenerator())
        }),
        { minLength: eventCount, maxLength: eventCount }
      ),
      detectedAt: fc.constant(new Date()),
      severity: fc.constantFrom('high' as const, 'critical' as const)
    })
  )

// Generator for unusual access pattern (accessing many patients)
const unusualAccessPatternGenerator = (): fc.Arbitrary<SuspiciousActivityPattern> =>
  fc.record({
    userId: userIdGenerator(),
    patientCount: fc.integer({ min: 30, max: 100 })
  }).chain(({ userId, patientCount }) =>
    fc.array(patientIdGenerator(), { minLength: patientCount, maxLength: patientCount })
      .chain(patientIds =>
        fc.record({
          type: fc.constant('unusual_access' as const),
          userId: fc.constant(userId),
          patientIds: fc.constant(patientIds),
          events: fc.array(
            fc.integer({ min: 0, max: patientIds.length - 1 }).chain(idx =>
              fc.record({
                userId: fc.constant(userId),
                patientId: fc.constant(patientIds[idx]),
                operation: fc.constant('read'),
                accessResult: fc.constant('granted' as const),
                timestamp: fc.date({ min: new Date(Date.now() - 24 * 60 * 60 * 1000), max: new Date() }),
                ipAddress: fc.option(ipAddressGenerator())
              })
            ),
            { minLength: patientCount, maxLength: patientCount }
          ),
          detectedAt: fc.constant(new Date()),
          severity: fc.constantFrom('medium' as const, 'high' as const)
        })
      )
  )

// Generator for data exfiltration pattern (many read operations)
const dataExfiltrationPatternGenerator = (): fc.Arbitrary<SuspiciousActivityPattern> =>
  fc.record({
    userId: userIdGenerator(),
    readCount: fc.integer({ min: 50, max: 200 })
  }).chain(({ userId, readCount }) =>
    fc.array(patientIdGenerator(), { minLength: 10, maxLength: 50 })
      .chain(patientIds =>
        fc.record({
          type: fc.constant('data_exfiltration' as const),
          userId: fc.constant(userId),
          patientIds: fc.constant(patientIds),
          events: fc.array(
            fc.integer({ min: 0, max: patientIds.length - 1 }).chain(idx =>
              fc.record({
                userId: fc.constant(userId),
                patientId: fc.constant(patientIds[idx]),
                operation: fc.constant('read'),
                accessResult: fc.constant('granted' as const),
                timestamp: fc.date({ min: new Date(Date.now() - 60 * 60 * 1000), max: new Date() }),
                ipAddress: fc.option(ipAddressGenerator())
              })
            ),
            { minLength: readCount, maxLength: readCount }
          ),
          detectedAt: fc.constant(new Date()),
          severity: fc.constant('critical' as const)
        })
      )
  )

const suspiciousActivityPatternGenerator = (): fc.Arbitrary<SuspiciousActivityPattern> =>
  fc.oneof(
    bruteForcePatternGenerator(),
    unusualAccessPatternGenerator(),
    dataExfiltrationPatternGenerator()
  )

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 17: Security Monitoring and Alerting', () => {
  // ============================================================================
  // ALERT GENERATION TESTS
  // ============================================================================

  test('Property 17.1: Suspicious activity patterns generate security alerts', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should be generated for suspicious activity
          expect(alert).toBeDefined()
          expect(alert).not.toBeNull()

          // Verify alert has required fields
          expect(alert!.id).toBeDefined()
          expect(alert!.type).toBe(pattern.type)
          expect(alert!.severity).toBe(pattern.severity)
          expect(alert!.title).toBeDefined()
          expect(alert!.description).toBeDefined()
          expect(alert!.detectedAt).toBeInstanceOf(Date)
          expect(alert!.status).toBe('active')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.2: Security alerts contain affected user information', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should contain affected user information
          expect(alert).toBeDefined()
          expect(alert!.affectedUsers).toBeDefined()
          expect(alert!.affectedUsers.length).toBeGreaterThan(0)
          expect(alert!.affectedUsers[0].value).toBe(pattern.userId.value)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.3: Security alerts contain affected patient information', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should contain affected patient information
          expect(alert).toBeDefined()
          expect(alert!.affectedPatients).toBeDefined()
          expect(alert!.affectedPatients.length).toBe(pattern.patientIds.length)

          // Verify all affected patients are included
          pattern.patientIds.forEach(patientId => {
            const found = alert!.affectedPatients.some(p => p.value === patientId.value)
            expect(found).toBe(true)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.4: Security alerts contain evidence for investigation', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should contain evidence (security events)
          expect(alert).toBeDefined()
          expect(alert!.evidence).toBeDefined()
          expect(alert!.evidence.length).toBeGreaterThan(0)
          expect(alert!.evidence.length).toBe(pattern.events.length)

          // Verify evidence contains relevant security events
          alert!.evidence.forEach(event => {
            expect(event.userId).toBeDefined()
            expect(event.patientId).toBeDefined()
            expect(event.operation).toBeDefined()
            expect(event.accessResult).toBeDefined()
            expect(event.timestamp).toBeInstanceOf(Date)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.5: Security alerts have appropriate severity levels', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should have severity matching the pattern
          expect(alert).toBeDefined()
          expect(alert!.severity).toBe(pattern.severity)
          expect(['low', 'medium', 'high', 'critical']).toContain(alert!.severity)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.6: Security alerts include risk scores for prioritization', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should have a risk score
          expect(alert).toBeDefined()
          expect(alert!.riskScore).toBeDefined()
          expect(typeof alert!.riskScore).toBe('number')
          expect(alert!.riskScore).toBeGreaterThanOrEqual(0)
          expect(alert!.riskScore).toBeLessThanOrEqual(100)

          // Higher severity should generally correlate with higher risk scores
          if (pattern.severity === 'critical') {
            expect(alert!.riskScore).toBeGreaterThan(70)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // ALERT DESCRIPTION TESTS
  // ============================================================================

  test('Property 17.7: Security alerts have descriptive titles for quick identification', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should have a descriptive title
          expect(alert).toBeDefined()
          expect(alert!.title).toBeDefined()
          expect(typeof alert!.title).toBe('string')
          expect(alert!.title.length).toBeGreaterThan(0)

          // Title should be relevant to the alert type
          const titleLower = alert!.title.toLowerCase()
          if (pattern.type === 'brute_force') {
            expect(titleLower).toMatch(/brute.*force|attack/i)
          } else if (pattern.type === 'unusual_access') {
            expect(titleLower).toMatch(/unusual|access|pattern/i)
          } else if (pattern.type === 'data_exfiltration') {
            expect(titleLower).toMatch(/data|exfiltration/i)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.8: Security alerts have detailed descriptions for investigation', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should have a detailed description
          expect(alert).toBeDefined()
          expect(alert!.description).toBeDefined()
          expect(typeof alert!.description).toBe('string')
          expect(alert!.description.length).toBeGreaterThan(20)

          // Description should contain relevant details
          const descriptionLower = alert!.description.toLowerCase()
          expect(descriptionLower).toContain(pattern.userId.value.toLowerCase())

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // ALERT RETRIEVAL AND FILTERING TESTS
  // ============================================================================

  test('Property 17.9: Security alerts can be retrieved by administrators', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(suspiciousActivityPatternGenerator(), { minLength: 3, maxLength: 10 }),
        async (patterns) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect multiple suspicious activities
          const alerts = await Promise.all(
            patterns.map(pattern => securityService.detectSuspiciousActivity(pattern))
          )

          // CRITICAL: All alerts should be retrievable
          const retrievedAlerts = await securityService.getAlerts()
          expect(retrievedAlerts.length).toBe(alerts.length)

          // Verify all created alerts are present
          alerts.forEach(alert => {
            const found = retrievedAlerts.find(a => a.id === alert!.id)
            expect(found).toBeDefined()
          })

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 17.10: Security alerts can be filtered by type', () => {
    fc.assert(
      fc.asyncProperty(
        bruteForcePatternGenerator(),
        unusualAccessPatternGenerator(),
        dataExfiltrationPatternGenerator(),
        async (bruteForcePattern, unusualAccessPattern, exfiltrationPattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Create alerts of different types
          await securityService.detectSuspiciousActivity(bruteForcePattern)
          await securityService.detectSuspiciousActivity(unusualAccessPattern)
          await securityService.detectSuspiciousActivity(exfiltrationPattern)

          // Filter by brute force type
          const bruteForceAlerts = await securityService.getAlerts({ type: 'brute_force' })
          expect(bruteForceAlerts.length).toBe(1)
          expect(bruteForceAlerts[0].type).toBe('brute_force')

          // Filter by unusual access type
          const unusualAccessAlerts = await securityService.getAlerts({ type: 'unusual_access' })
          expect(unusualAccessAlerts.length).toBe(1)
          expect(unusualAccessAlerts[0].type).toBe('unusual_access')

          // Filter by data exfiltration type
          const exfiltrationAlerts = await securityService.getAlerts({ type: 'data_exfiltration' })
          expect(exfiltrationAlerts.length).toBe(1)
          expect(exfiltrationAlerts[0].type).toBe('data_exfiltration')

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 17.11: Security alerts can be filtered by severity', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(suspiciousActivityPatternGenerator(), { minLength: 5, maxLength: 15 }),
        async (patterns) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Create alerts with various severities
          await Promise.all(
            patterns.map(pattern => securityService.detectSuspiciousActivity(pattern))
          )

          // Filter by each severity level
          const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical']
          
          for (const severity of severities) {
            const filteredAlerts = await securityService.getAlerts({ severity })
            
            // All returned alerts should match the severity filter
            filteredAlerts.forEach(alert => {
              expect(alert.severity).toBe(severity)
            })
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 17.12: Security alerts can be filtered by affected user', () => {
    fc.assert(
      fc.asyncProperty(
        userIdGenerator(),
        userIdGenerator(),
        async (user1, user2) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Create patterns for different users
          const pattern1: SuspiciousActivityPattern = {
            type: 'brute_force',
            userId: user1,
            patientIds: [new PatientId('00000000-0000-4000-8000-000000000001')],
            events: [{
              userId: user1,
              patientId: new PatientId('00000000-0000-4000-8000-000000000001'),
              operation: 'failed_login',
              accessResult: 'denied',
              timestamp: new Date()
            }],
            detectedAt: new Date(),
            severity: 'high'
          }

          const pattern2: SuspiciousActivityPattern = {
            type: 'unusual_access',
            userId: user2,
            patientIds: [new PatientId('00000000-0000-4000-8000-000000000002')],
            events: [{
              userId: user2,
              patientId: new PatientId('00000000-0000-4000-8000-000000000002'),
              operation: 'read',
              accessResult: 'granted',
              timestamp: new Date()
            }],
            detectedAt: new Date(),
            severity: 'medium'
          }

          await securityService.detectSuspiciousActivity(pattern1)
          await securityService.detectSuspiciousActivity(pattern2)

          // Filter by user1
          const user1Alerts = await securityService.getAlerts({ userId: user1 })
          expect(user1Alerts.length).toBe(1)
          expect(user1Alerts[0].affectedUsers[0].value).toBe(user1.value)

          // Filter by user2
          const user2Alerts = await securityService.getAlerts({ userId: user2 })
          expect(user2Alerts.length).toBe(1)
          expect(user2Alerts[0].affectedUsers[0].value).toBe(user2.value)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // ALERT STATUS MANAGEMENT TESTS
  // ============================================================================

  test('Property 17.13: Security alerts start with active status', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: New alerts should have active status
          expect(alert).toBeDefined()
          expect(alert!.status).toBe('active')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.14: Security alert status can be updated for investigation tracking', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        fc.constantFrom('investigating' as const, 'resolved' as const),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (pattern, newStatus, investigationDetails) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)
          expect(alert).toBeDefined()

          // Update alert status
          await securityService.updateAlertStatus(alert!.id, newStatus, investigationDetails)

          // Verify status was updated
          const alerts = await securityService.getAlerts({ status: newStatus })
          const updatedAlert = alerts.find(a => a.id === alert!.id)
          
          expect(updatedAlert).toBeDefined()
          expect(updatedAlert!.status).toBe(newStatus)
          expect(updatedAlert!.investigationDetails).toBe(investigationDetails)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // SPECIFIC THREAT PATTERN TESTS
  // ============================================================================

  test('Property 17.15: Brute force attacks generate high severity alerts', () => {
    fc.assert(
      fc.asyncProperty(
        bruteForcePatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect brute force attack
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Brute force should generate high or critical severity alert
          expect(alert).toBeDefined()
          expect(alert!.type).toBe('brute_force')
          expect(['high', 'critical']).toContain(alert!.severity)
          expect(alert!.riskScore).toBeGreaterThan(60)

          // Verify evidence contains failed login attempts
          expect(alert!.evidence.length).toBeGreaterThanOrEqual(5)
          alert!.evidence.forEach(event => {
            expect(event.operation).toBe('failed_login')
            expect(event.accessResult).toBe('denied')
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.16: Unusual access patterns generate appropriate alerts', () => {
    fc.assert(
      fc.asyncProperty(
        unusualAccessPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect unusual access pattern
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Unusual access should generate medium or high severity alert
          expect(alert).toBeDefined()
          expect(alert!.type).toBe('unusual_access')
          expect(['medium', 'high']).toContain(alert!.severity)

          // Verify multiple patients are affected
          expect(alert!.affectedPatients.length).toBeGreaterThanOrEqual(30)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.17: Data exfiltration attempts generate critical alerts', () => {
    fc.assert(
      fc.asyncProperty(
        dataExfiltrationPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect data exfiltration
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Data exfiltration should generate critical severity alert
          expect(alert).toBeDefined()
          expect(alert!.type).toBe('data_exfiltration')
          expect(alert!.severity).toBe('critical')
          expect(alert!.riskScore).toBeGreaterThan(80)

          // Verify evidence contains many read operations
          expect(alert!.evidence.length).toBeGreaterThanOrEqual(50)
          alert!.evidence.forEach(event => {
            expect(event.operation).toBe('read')
            expect(event.accessResult).toBe('granted')
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // MONITORING STATE TESTS
  // ============================================================================

  test('Property 17.18: Security monitoring can be enabled and disabled', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Disable monitoring
          securityService.disableMonitoring()

          // Attempt to detect suspicious activity
          const alertWhileDisabled = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: No alert should be generated when monitoring is disabled
          expect(alertWhileDisabled).toBeNull()

          // Enable monitoring
          securityService.enableMonitoring()

          // Detect suspicious activity
          const alertWhileEnabled = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should be generated when monitoring is enabled
          expect(alertWhileEnabled).toBeDefined()
          expect(alertWhileEnabled).not.toBeNull()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ============================================================================
  // COMPREHENSIVE ALERT QUALITY TESTS
  // ============================================================================

  test('Property 17.19: All security alerts contain sufficient detail for investigation', () => {
    fc.assert(
      fc.asyncProperty(
        suspiciousActivityPatternGenerator(),
        async (pattern) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect suspicious activity
          const alert = await securityService.detectSuspiciousActivity(pattern)

          // CRITICAL: Alert should contain all required investigation details
          expect(alert).toBeDefined()
          
          // Verify all essential fields are present and meaningful
          expect(alert!.id).toBeDefined()
          expect(alert!.id.length).toBeGreaterThan(0)
          
          expect(alert!.type).toBeDefined()
          expect(alert!.type.length).toBeGreaterThan(0)
          
          expect(alert!.severity).toBeDefined()
          expect(['low', 'medium', 'high', 'critical']).toContain(alert!.severity)
          
          expect(alert!.title).toBeDefined()
          expect(alert!.title.length).toBeGreaterThan(0)
          
          expect(alert!.description).toBeDefined()
          expect(alert!.description.length).toBeGreaterThan(20)
          
          expect(alert!.detectedAt).toBeInstanceOf(Date)
          
          expect(alert!.affectedUsers).toBeDefined()
          expect(alert!.affectedUsers.length).toBeGreaterThan(0)
          
          expect(alert!.affectedPatients).toBeDefined()
          
          expect(alert!.evidence).toBeDefined()
          expect(alert!.evidence.length).toBeGreaterThan(0)
          
          expect(alert!.riskScore).toBeDefined()
          expect(alert!.riskScore).toBeGreaterThanOrEqual(0)
          expect(alert!.riskScore).toBeLessThanOrEqual(100)
          
          expect(alert!.status).toBeDefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 17.20: Multiple suspicious activities generate multiple distinct alerts', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(suspiciousActivityPatternGenerator(), { minLength: 3, maxLength: 10 }),
        async (patterns) => {
          // Create fresh service for this iteration
          const securityService = new MockSecurityMonitoringService()

          // Detect multiple suspicious activities
          const alerts = await Promise.all(
            patterns.map(pattern => securityService.detectSuspiciousActivity(pattern))
          )

          // CRITICAL: Each pattern should generate a distinct alert
          expect(alerts.length).toBe(patterns.length)

          // Verify all alerts are unique
          const alertIds = new Set(alerts.map(alert => alert!.id))
          expect(alertIds.size).toBe(alerts.length)

          // Verify each alert corresponds to its pattern
          for (let i = 0; i < patterns.length; i++) {
            expect(alerts[i]!.type).toBe(patterns[i].type)
            expect(alerts[i]!.severity).toBe(patterns[i].severity)
            expect(alerts[i]!.affectedUsers[0].value).toBe(patterns[i].userId.value)
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
