"use client"

import * as React from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { login } from "@/lib/supabase/actions"

export function LoginForm() {
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      setError("Ocorreu um erro ao fazer login. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* E-mail Input */}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="seuemail@exemplo.com"
          required
          className="h-11 px-4 rounded-lg"
        />
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Sua senha"
          required
          className="h-11 px-4 rounded-lg"
        />
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Checkbox id="remember-me" name="remember-me" />
          <Label
            htmlFor="remember-me"
            className="text-muted-foreground font-normal cursor-pointer"
          >
            Lembrar-me
          </Label>
        </div>
        <Link
          href="/dashboard/esqueci-senha"
          className="font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Esqueceu sua senha?
        </Link>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 rounded-full text-base font-semibold"
        disabled={isLoading}
      >
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>

      {/* Sign Up Link */}
      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/auth/cadastro" className="font-semibold text-primary hover:underline">
            Crie sua conta aqui
          </Link>
        </p>
      </div>
    </form>
  )
}
