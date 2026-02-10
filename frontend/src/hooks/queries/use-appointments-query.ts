import { useQuery } from "@tanstack/react-query"
import * as appointmentsApi from "@/lib/api/appointments"

export function useAppointmentsQuery(params?: {
  patientId?: string
  therapistId?: string
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: () => appointmentsApi.listAppointments(params),
  })
}
