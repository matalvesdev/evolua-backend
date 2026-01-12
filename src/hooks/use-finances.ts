"use client"

import * as React from "react"

export function useFinances() {
  return {
    monthlyData: [],
    revenueSources: [],
    transactions: [],
    loading: false,
  }
}
