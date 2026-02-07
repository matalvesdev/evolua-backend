import { useQuery } from "@tanstack/react-query"
import * as patientsApi from "@/lib/api/patients"

export function usePatientsQuery(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => patientsApi.listPatients(params),
  })
}
