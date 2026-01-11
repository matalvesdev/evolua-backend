"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  password: string
  className?: string
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0

    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++

    if (score <= 2) return { score, label: "Fraca", color: "bg-red-500" }
    if (score <= 4) return { score, label: "Média", color: "bg-yellow-500" }
    return { score, label: "Forte", color: "bg-green-500" }
  }

  const strength = getStrength(password)

  if (!password) return null

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= strength.score ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className={cn(
        "text-xs",
        strength.score <= 2 && "text-red-500",
        strength.score > 2 && strength.score <= 4 && "text-yellow-600",
        strength.score > 4 && "text-green-600"
      )}>
        Senha {strength.label}
      </p>
    </div>
  )
}
