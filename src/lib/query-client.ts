"use client"

import { QueryClient } from "@tanstack/react-query"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Configurações otimizadas para performance
        staleTime: 60 * 1000, // 1 minuto - dados ficam "frescos"
        gcTime: 5 * 60 * 1000, // 5 minutos - garbage collection
        refetchOnWindowFocus: false, // Não refetch ao focar janela
        refetchOnReconnect: true, // Refetch ao reconectar
        retry: 1, // 1 tentativa de retry em falhas
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: sempre cria um novo query client
    return makeQueryClient()
  } else {
    // Browser: reutiliza o mesmo query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}
