// ============================================================================
// REPORT INTEGRATION INTERFACE
// Defines the contract for integrating patient data with the report system
// ============================================================================

export enum ReportType {
  INITIAL_ASSESSMENT = 'initial_assessment',
  PROGRESS_REPORT = 'progress_report',
  DISCHARGE_SUMMARY = 'discharge_summary',
  SESSION_NOTE = 'session_note',
  EVALUATION_REPORT = 'evaluation_report'
}

export enum ExportFormat {
  JSON = 'json',
  PDF = 'pdf',
  CSV = 'csv',
  XML = 'xml'
}

export interface ReportData {
  patientId: string
  patientName: string
  patientAge: number
  patientGender: string
  diagnosis: string[]
  medications: string[]
  allergies: string[]
  treatmentHistory: Array<{
    date: Date
    description: string
    outcome?: string
  }>
  progressNotes: Array<{
    date: Date
    note: string
    author: string
  }>
  currentStatus: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  insuranceInfo?: {
    provider: string
    policyNumber: string
  }
}

export interface PatientSummary {
  patientId: string
  fullName: string
  dateOfBirth: Date
  age: number
  gender: string
  contactPhone: string
  contactEmail?: string
  status: string
  totalAppointments: number
  lastAppointmentDate?: Date
  nextAppointmentDate?: Date
  activeDiagnoses: string[]
  currentMedications: string[]
  treatmentStartDate: Date
  treatmentDuration: number // in days
}

export interface ExportResult {
  patientId: string
  format: ExportFormat
  data: string | Buffer
  exportedAt: Date
  exportedBy: string
  fileSize: number
}

export interface IReportIntegration {
  /**
   * Retrieves comprehensive patient data formatted for report generation
   * @param patientId - The patient identifier
   * @param reportType - The type of report being generated
   * @returns Promise resolving to formatted report data
   */
  getPatientDataForReport(patientId: string, reportType: ReportType): Promise<ReportData>

  /**
   * Generates a comprehensive patient summary
   * @param patientId - The patient identifier
   * @returns Promise resolving to patient summary
   */
  generatePatientSummary(patientId: string): Promise<PatientSummary>

  /**
   * Exports patient data in the specified format
   * @param patientId - The patient identifier
   * @param format - The export format
   * @returns Promise resolving to export result
   */
  exportPatientData(patientId: string, format: ExportFormat): Promise<ExportResult>

  /**
   * Updates report system when patient data changes
   * @param patientId - The patient identifier
   * @param changedFields - Array of field names that changed
   * @returns Promise resolving when propagation is complete
   */
  propagatePatientDataChanges(patientId: string, changedFields: string[]): Promise<void>

  /**
   * Validates data consistency between patient and report systems
   * @param patientId - The patient identifier
   * @returns Promise resolving to boolean indicating consistency
   */
  validateDataConsistency(patientId: string): Promise<boolean>
}
