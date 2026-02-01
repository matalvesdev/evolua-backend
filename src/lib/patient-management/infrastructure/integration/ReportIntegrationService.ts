// ============================================================================
// REPORT INTEGRATION SERVICE
// Implements integration between patient management and report systems
// ============================================================================

import type { 
  IReportIntegration, 
  ReportData, 
  PatientSummary, 
  ExportResult, 
  ReportType, 
  ExportFormat 
} from './IReportIntegration'
import type { IPatientRepository } from '../repositories/IPatientRepository'
import type { IMedicalRecordRepository } from '../repositories/IMedicalRecordRepository'
import type { IReportRepository } from '../../../core/domain/repositories/report.repository'
import type { IAppointmentRepository } from '../../../core/domain/repositories/appointment.repository'
import type { AuditLogger } from '../services/AuditLogger'
import { PatientId } from '../../domain/value-objects/PatientId'
import { UserId } from '../../domain/value-objects/UserId'

export interface ReportIntegrationConfig {
  enableChangeTracking: boolean
  autoSyncOnUpdate: boolean
  consistencyCheckIntervalMs: number
}

export class ReportIntegrationService implements IReportIntegration {
  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly medicalRecordRepository: IMedicalRecordRepository,
    private readonly reportRepository: IReportRepository,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly auditLogger: AuditLogger,
    private readonly config: ReportIntegrationConfig = {
      enableChangeTracking: true,
      autoSyncOnUpdate: true,
      consistencyCheckIntervalMs: 60000
    }
  ) {}

  async getPatientDataForReport(patientId: string, reportType: ReportType): Promise<ReportData> {
    try {
      // Retrieve patient data
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      // Retrieve medical records
      const medicalRecords = await this.medicalRecordRepository.findByPatientId(new PatientId(patientId))
      const latestRecord = medicalRecords[0] // Assuming sorted by date

      // Compile treatment history
      const treatmentHistory = medicalRecords.flatMap(record => 
        record.treatmentHistory.map(treatment => ({
          date: treatment.startDate,
          description: treatment.description,
          outcome: treatment.endDate ? 'Completed' : 'In Progress'
        }))
      )

      // Compile progress notes
      const progressNotes = medicalRecords.flatMap(record =>
        record.progressNotes.map(note => ({
          date: note.sessionDate,
          note: note.content,
          author: note.createdBy.value
        }))
      )

      const reportData: ReportData = {
        patientId: patient.id.value,
        patientName: patient.personalInfo.fullName.value,
        patientAge: patient.personalInfo.getAge(),
        patientGender: patient.personalInfo.gender.value,
        diagnosis: latestRecord?.diagnosis.map(d => d.description) || [],
        medications: latestRecord?.medications.map(m => m.name) || [],
        allergies: latestRecord?.allergies.map(a => a.allergen) || [],
        treatmentHistory,
        progressNotes,
        currentStatus: patient.status.value,
        emergencyContact: {
          name: patient.emergencyContact.name.value,
          phone: patient.emergencyContact.phone.value,
          relationship: patient.emergencyContact.relationship
        },
        insuranceInfo: patient.insuranceInfo.provider ? {
          provider: patient.insuranceInfo.provider,
          policyNumber: patient.insuranceInfo.policyNumber || ''
        } : undefined
      }

      // Audit log the data access
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'GENERATE_REPORT_DATA',
        dataType: 'report_data',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { reportType }
      })

      return reportData
    } catch (error) {
      await this.handleIntegrationError('getPatientDataForReport', error, { patientId, reportType: String(reportType) })
      throw error
    }
  }

  async generatePatientSummary(patientId: string): Promise<PatientSummary> {
    try {
      // Retrieve patient data
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      // Retrieve appointments
      const appointmentsResult = await this.appointmentRepository.findByPatientId(patientId)
      const appointments = appointmentsResult.appointments

      // Calculate appointment statistics
      const completedAppointments = appointments.filter(a => a.status === 'completed')
      const sortedAppointments = [...appointments].sort((a, b) => 
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      )
      const lastAppointment = sortedAppointments.find(a => a.status === 'completed')
      const nextAppointment = sortedAppointments.find(a => 
        a.status === 'scheduled' && new Date(a.dateTime) > new Date()
      )

      // Retrieve medical records
      const medicalRecords = await this.medicalRecordRepository.findByPatientId(new PatientId(patientId))
      const latestRecord = medicalRecords[0]

      // Calculate treatment duration
      const treatmentStartDate = patient.createdAt
      const treatmentDuration = Math.floor(
        (new Date().getTime() - treatmentStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      const summary: PatientSummary = {
        patientId: patient.id.value,
        fullName: patient.personalInfo.fullName.value,
        dateOfBirth: patient.personalInfo.dateOfBirth,
        age: patient.personalInfo.getAge(),
        gender: patient.personalInfo.gender.value,
        contactPhone: patient.contactInfo.primaryPhone.value,
        contactEmail: patient.contactInfo.email?.value,
        status: patient.status.value,
        totalAppointments: completedAppointments.length,
        lastAppointmentDate: lastAppointment?.dateTime,
        nextAppointmentDate: nextAppointment?.dateTime,
        activeDiagnoses: latestRecord?.diagnosis.map(d => d.description) || [],
        currentMedications: latestRecord?.medications.map(m => m.name) || [],
        treatmentStartDate,
        treatmentDuration
      }

      // Audit log the summary generation
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'GENERATE_PATIENT_SUMMARY',
        dataType: 'patient_summary',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { summaryGeneratedAt: new Date() }
      })

      return summary
    } catch (error) {
      await this.handleIntegrationError('generatePatientSummary', error, { patientId })
      throw error
    }
  }

  async exportPatientData(patientId: string, format: ExportFormat): Promise<ExportResult> {
    try {
      // Get comprehensive patient data
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      const summary = await this.generatePatientSummary(patientId)
      const medicalRecords = await this.medicalRecordRepository.findByPatientId(new PatientId(patientId))

      // Compile export data
      const exportData: Record<string, unknown> = {
        patient: {
          id: patient.id.value,
          personalInfo: {
            fullName: patient.personalInfo.fullName.value,
            dateOfBirth: patient.personalInfo.dateOfBirth,
            gender: patient.personalInfo.gender.value,
            cpf: patient.personalInfo.cpf.value,
            rg: patient.personalInfo.rg.value
          },
          contactInfo: {
            primaryPhone: patient.contactInfo.primaryPhone.value,
            secondaryPhone: patient.contactInfo.secondaryPhone?.value,
            email: patient.contactInfo.email?.value,
            address: patient.contactInfo.address
          },
          emergencyContact: patient.emergencyContact,
          insuranceInfo: patient.insuranceInfo,
          status: patient.status.value
        },
        medicalRecords: medicalRecords.map(record => ({
          id: record.id.value,
          diagnosis: record.diagnosis,
          treatmentHistory: record.treatmentHistory,
          medications: record.medications,
          allergies: record.allergies,
          progressNotes: record.progressNotes,
          assessments: record.assessments
        })),
        summary
      }

      // Format data based on export format
      let formattedData: string | Buffer
      switch (format) {
        case 'json':
          formattedData = JSON.stringify(exportData, null, 2)
          break
        case 'csv':
          formattedData = this.convertToCSV(exportData)
          break
        case 'xml':
          formattedData = this.convertToXML(exportData)
          break
        case 'pdf':
          // PDF generation would require additional library
          throw new Error('PDF export not yet implemented')
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      const result: ExportResult = {
        patientId: patient.id.value,
        format,
        data: formattedData,
        exportedAt: new Date(),
        exportedBy: patient.createdBy.value,
        fileSize: Buffer.byteLength(formattedData, 'utf8')
      }

      // Audit log the export
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'EXPORT_PATIENT_DATA',
        dataType: 'patient_export',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { format, fileSize: result.fileSize, exportedAt: result.exportedAt }
      })

      return result
    } catch (error) {
      await this.handleIntegrationError('exportPatientData', error, { patientId, format: String(format) })
      throw error
    }
  }

  async propagatePatientDataChanges(patientId: string, changedFields: string[]): Promise<void> {
    try {
      if (!this.config.enableChangeTracking) {
        return
      }

      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`)
      }

      // Get all reports for this patient
      const reportsResult = await this.reportRepository.findByPatientId(patientId)
      const reports = reportsResult.reports

      // Update reports with changed patient data
      const updatePromises = reports
        .filter(report => report.status === 'draft' || report.status === 'pending_review')
        .map(async (report) => {
          const updates: Record<string, unknown> = {}

          if (changedFields.includes('personalInfo.fullName')) {
            updates.patientName = patient.personalInfo.fullName.value
          }

          if (Object.keys(updates).length > 0) {
            await this.reportRepository.update(report.id, {
              ...updates,
              updatedAt: new Date()
            })
          }
        })

      await Promise.all(updatePromises)

      // Audit log the propagation
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'PROPAGATE_DATA_CHANGES',
        dataType: 'data_propagation',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { changedFields, affectedReports: reports.length }
      })
    } catch (error) {
      await this.handleIntegrationError('propagatePatientDataChanges', error, { patientId, changedFields: changedFields.join(',') })
      throw error
    }
  }

  async validateDataConsistency(patientId: string): Promise<boolean> {
    try {
      const patient = await this.patientRepository.findById(new PatientId(patientId))
      if (!patient) {
        return false
      }

      // Get all reports for this patient
      const reportsResult = await this.reportRepository.findByPatientId(patientId)
      const reports = reportsResult.reports

      // Check if patient name matches in all reports
      const inconsistentReports = reports.filter(
        report => report.patientName !== patient.personalInfo.fullName.value
      )

      const isConsistent = inconsistentReports.length === 0

      // Audit log the consistency check
      await this.auditLogger.logDataAccess({
        userId: new UserId(patient.createdBy.value),
        patientId: patient.id,
        operation: 'VALIDATE_DATA_CONSISTENCY',
        dataType: 'consistency_check',
        accessResult: 'granted',
        timestamp: new Date(),
        newValues: { isConsistent, inconsistentReports: inconsistentReports.length }
      })

      return isConsistent
    } catch (error) {
      await this.handleIntegrationError('validateDataConsistency', error, { patientId })
      return false
    }
  }

  /**
   * Converts export data to CSV format
   */
  private convertToCSV(data: Record<string, unknown>): string {
    const patient = data.patient as Record<string, unknown>
    const personalInfo = patient.personalInfo as Record<string, unknown>
    const contactInfo = patient.contactInfo as Record<string, unknown>
    const lines: string[] = []

    // Patient information
    lines.push('Patient Information')
    lines.push('Field,Value')
    lines.push(`Full Name,${personalInfo.fullName}`)
    lines.push(`Date of Birth,${personalInfo.dateOfBirth}`)
    lines.push(`Gender,${personalInfo.gender}`)
    lines.push(`CPF,${personalInfo.cpf}`)
    lines.push(`Status,${patient.status}`)
    lines.push('')

    // Contact information
    lines.push('Contact Information')
    lines.push(`Primary Phone,${contactInfo.primaryPhone}`)
    lines.push(`Email,${contactInfo.email || 'N/A'}`)
    lines.push('')

    return lines.join('\n')
  }

  /**
   * Converts export data to XML format
   */
  private convertToXML(data: Record<string, unknown>): string {
    const patient = data.patient as Record<string, unknown>
    const personalInfo = patient.personalInfo as Record<string, unknown>
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<PatientData>\n'
    xml += '  <Patient>\n'
    xml += `    <Id>${patient.id}</Id>\n`
    xml += `    <FullName>${this.escapeXML(String(personalInfo.fullName))}</FullName>\n`
    xml += `    <DateOfBirth>${personalInfo.dateOfBirth}</DateOfBirth>\n`
    xml += `    <Gender>${personalInfo.gender}</Gender>\n`
    xml += `    <Status>${patient.status}</Status>\n`
    xml += '  </Patient>\n'
    xml += '</PatientData>'
    return xml
  }

  /**
   * Escapes XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Handles integration errors with logging
   */
  private async handleIntegrationError(
    operation: string,
    error: unknown,
    context: Record<string, string>
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`Report integration error in ${operation}:`, {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString()
    })

    try {
      await this.auditLogger.logDataAccess({
        userId: new UserId('system'),
        patientId: new PatientId(context.patientId || 'unknown'),
        operation: 'INTEGRATION_ERROR',
        dataType: 'integration',
        accessResult: 'denied',
        timestamp: new Date(),
        newValues: {
          operation,
          error: errorMessage,
          context
        }
      })
    } catch (auditError) {
      console.error('Failed to log integration error to audit system:', auditError)
    }
  }
}
