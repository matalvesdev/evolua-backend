"use client"

import { useState } from "react"

interface OnboardingData {
  step?: number
  fullName?: string
  phone?: string
  cpf?: string
  specialty?: string
  clinicName?: string
  clinicAddress?: string
  objectives?: string[]
  [key: string]: unknown
}

const STORAGE_KEY = "evolua-onboarding"

export function useOnboardingStorage() {
  const [data, setData] = useState<OnboardingData>(() => {
    if (typeof window === "undefined") return {}
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const clearData = () => {
    localStorage.removeItem(STORAGE_KEY)
    setData({})
  }

  return { data, updateData, clearData }
}
