"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import * as authApi from "@/lib/api/auth"

function LoginContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [rememberMe, setRememberMe] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const message = searchParams.get("message")
    if (message === "signup-complete") {
      setSuccessMessage("Cadastro concluído! Faça login para continuar.")
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authApi.login(email, password)
      console.log("Login bem-sucedido, redirecionando para dashboard...")

      window.location.href = "/dashboard"
    } catch (err) {
      console.error("Erro inesperado no login:", err)
      setError(err instanceof Error ? err.message : "Erro inesperado ao fazer login")
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#fcfbfd] font-sans text-slate-800 overflow-hidden h-screen w-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 h-full bg-linear-to-br from-purple-50 via-purple-100 to-purple-200 relative flex-col p-12 justify-between overflow-hidden">
        <div className="z-10 flex items-center gap-3 text-purple-600">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Evolua</h2>
        </div>

        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-100 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-100/40 rounded-full blur-[60px]"></div>
          
          <div className="relative w-full h-full flex items-center justify-center p-20">
            <div 
              className="w-full h-full bg-center bg-contain bg-no-repeat rounded-3xl"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070')"
              }}
            />
            
            <div className="absolute top-[30%] right-[22%] bg-white/90 backdrop-blur-md border border-white p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce" style={{animationDuration: '4s'}}>
              <div className="bg-purple-100 p-1.5 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-700">Simplicidade</span>
            </div>
            
            <div className="absolute bottom-[35%] left-[22%] bg-white/90 backdrop-blur-md border border-white p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce" style={{animationDuration: '5s', animationDelay: '1s'}}>
              <div className="bg-blue-100 p-1.5 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-700">Eficiência</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 h-full relative flex flex-col overflow-y-auto bg-[#fcfbfd]">
        <div className="md:hidden flex items-center justify-between p-6 pb-2 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2 text-purple-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-bold text-slate-900">Evolua</span>
          </div>
          <div className="text-xs text-purple-600 font-bold bg-purple-100 px-3 py-1 rounded-full border border-purple-200">Login</div>
        </div>

        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-6 md:p-12 justify-center">
          <div className="mb-8">
            <div className="w-16 h-1.5 bg-purple-600/10 rounded-full mb-6 overflow-hidden flex">
              <div className="w-1/2 h-full bg-purple-600 rounded-full"></div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 leading-tight tracking-tight">
              Olá Fono, que bom te ver de novo
            </h1>
            <h2 className="text-slate-500 text-lg font-medium">
              Entre e simplifique sua rotina 💜
            </h2>
          </div>

          <div className="bg-white/65 backdrop-blur-xl border border-white/80 shadow-lg rounded-3xl p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-xl outline-none text-slate-700 placeholder:text-slate-400 font-medium bg-white border border-slate-200 transition-all hover:border-purple-200 hover:shadow-md focus:border-purple-600 focus:shadow-lg focus:ring-2 focus:ring-purple-600/10"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-bold text-slate-700 ml-1">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-xl outline-none text-slate-700 placeholder:text-slate-400 font-medium bg-white border border-slate-200 transition-all hover:border-purple-200 hover:shadow-md focus:border-purple-600 focus:shadow-lg focus:ring-2 focus:ring-purple-600/10"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600/20 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 font-medium group-hover:text-purple-600 transition-colors">
                    Lembrar-me
                  </span>
                </label>
                <Link 
                  href="#" 
                  className="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline decoration-2 underline-offset-2 transition-all"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_8px_25px_rgba(164,19,236,0.25)] hover:shadow-[0_10px_30px_rgba(164,19,236,0.4)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Ainda não tem conta?{" "}
              <Link 
                href="/auth/cadastro" 
                className="text-purple-600 font-bold hover:text-purple-700 ml-1 transition-colors"
              >
                Crie sua conta aqui
              </Link>
            </p>
          </div>
        </div>

        <div className="p-6 text-center">
          <p className="text-xs text-slate-400 font-medium">© 2024 Evolua. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  )
}
