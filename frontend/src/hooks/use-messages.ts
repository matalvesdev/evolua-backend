import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as messagesApi from "@/lib/api/messages"
import type { Message, CreateMessageInput } from "@/lib/api/messages"

export type { Message }

export function useMessages(patientId: string, params?: { type?: string; page?: number; limit?: number }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["messages", patientId, params],
    queryFn: () => messagesApi.listMessages(patientId, params),
    enabled: !!patientId,
  })

  return {
    messages: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    loading: isLoading,
    error,
    refetch,
  }
}

export function useCreateMessage() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ patientId, ...input }: CreateMessageInput & { patientId: string }) =>
      messagesApi.createMessage(patientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] })
    },
  })

  return {
    createMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  }
}
