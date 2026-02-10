import { useQuery } from "@tanstack/react-query"
import * as reportsApi from "@/lib/api/reports"

export function useReportsQuery(params?: {
  patientId?: string
  type?: string
  status?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: () => reportsApi.listReports(params),
  })
}
