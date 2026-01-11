"use client"

import { useState } from "react"

interface OnboardingData {
  email?: string
  fullName?: string
  phone?: string
  areas_atuacao?: string[]
  objetivos?: string[]
  consultorio_nome?: string
  consultorio_endereco?: string
  work_environment?: {
    routine?: string
    patients?: string
    team?: string
  }
  referral_source?: string
  terms_accepted?: boolean
  onboarding_step?: number
  onboarding_completed?: boolean
}

const STORAGE_KEY = "onboarding_data"

export function useOnboardingStorage() {
  const [data, setData] = useState<OnboardingData>(() => {
    // Carregar dados do localStorage na inicialização do estado
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (error) {
          console.error("Erro ao carregar dados do onboarding:", error)
        }
      }
    }
    return {}
  })

  const updateData = (newData: Partial<OnboardingData>) => {
    const updated = { ...data, ...newData }
    setData(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }

  const clearData = () => {
    setData({})
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const getData = () => {
    if (typeof window === 'undefined') return {}
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return {}
      }
    }
    return {}
  }

  return {
    data,
    updateData,
    clearData,
    getData,
  }
}
