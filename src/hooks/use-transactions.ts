"use client"

import * as React from "react"

export function useTransactions() {
  return {
    transactions: [],
    loading: false,
  }
}
