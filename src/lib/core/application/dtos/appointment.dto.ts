export interface AppointmentListItemDto {
  id: string
  patientId: string
  therapistId: string
  type: string
  status: string
  dateTime: string
  duration: number
}
