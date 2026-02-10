"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { usePatient, usePatientMutations } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface EditPatientPageProps {
  params: Promise<{ id: string }>
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const

const editPatientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string()
    .refine((v) => !v || /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v.replace(/\s/g, "")), { message: "Telefone inválido. Use (00) 00000-0000" })
    .optional().or(z.literal("")),
  birthDate: z.string().optional(),
  cpf: z.string()
    .refine((v) => !v || /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(v), { message: "CPF inválido. Use 000.000.000-00" })
    .optional().or(z.literal("")),
  guardianName: z.string().optional(),
  guardianPhone: z.string()
    .refine((v) => !v || /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v.replace(/\s/g, "")), { message: "Telefone inválido. Use (00) 00000-0000" })
    .optional().or(z.literal("")),
  guardianRelationship: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string()
      .refine((v) => !v || /^[\d]+[a-zA-Z]?$/.test(v.trim()), { message: "Número deve conter apenas dígitos" })
      .optional().or(z.literal("")),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string()
      .refine((v) => !v || /^[a-zA-ZÀ-ÿ\s'-]+$/.test(v.trim()), { message: "Cidade deve conter apenas letras" })
      .optional().or(z.literal("")),
    state: z.string().optional(),
    zipCode: z.string()
      .refine((v) => !v || /^\d{5}-?\d{3}$/.test(v.replace(/\s/g, "")), { message: "CEP inválido. Use 00000-000" })
      .optional().or(z.literal("")),
  }).optional(),
  medicalHistory: z.object({
    notes: z.string().optional(),
  }).optional(),
})

type EditPatientFormValues = z.infer<typeof editPatientSchema>

// Input mask helpers
function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ""
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function maskNumber(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, "")
}

export default function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { patient, loading } = usePatient(id)
  const { updatePatient, isUpdating } = usePatientMutations()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [fetchingCep, setFetchingCep] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)

  const form = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      name: "", email: "", phone: "", birthDate: "", cpf: "",
      guardianName: "", guardianPhone: "", guardianRelationship: "",
      address: { street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" },
      medicalHistory: { notes: "" },
    },
  })

  useEffect(() => {
    if (patient) {
      const addr = patient.address
      form.reset({
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        birthDate: patient.birthDate ? patient.birthDate.split("T")[0] : "",
        cpf: patient.cpf || "",
        guardianName: patient.guardianName || "",
        guardianPhone: patient.guardianPhone || "",
        guardianRelationship: patient.guardianRelationship || "",
        address: {
          street: addr?.street || "", number: addr?.number || "",
          complement: addr?.complement || "", neighborhood: addr?.neighborhood || "",
          city: addr?.city || "", state: addr?.state || "", zipCode: addr?.zipCode || "",
        },
        medicalHistory: { notes: patient.medicalHistory?.notes || "" },
      })
    }
  }, [patient, form])

  const watchedCep = form.watch("address.zipCode")

  useEffect(() => {
    if (!watchedCep) return
    const digits = watchedCep.replace(/\D/g, "")
    if (digits.length !== 8) {
      setCepError(null)
      return
    }

    let cancelled = false
    setFetchingCep(true)
    setCepError(null)

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.erro) {
          setCepError("CEP não encontrado")
          return
        }
        form.setValue("address.street", data.logradouro || "", { shouldValidate: true })
        form.setValue("address.neighborhood", data.bairro || "", { shouldValidate: true })
        form.setValue("address.city", data.localidade || "", { shouldValidate: true })
        form.setValue("address.state", data.uf || "", { shouldValidate: true })
      })
      .catch(() => {
        if (!cancelled) setCepError("Erro ao buscar CEP")
      })
      .finally(() => {
        if (!cancelled) setFetchingCep(false)
      })

    return () => { cancelled = true }
  }, [watchedCep, form])

  const onSubmit = async (values: EditPatientFormValues) => {
    setError(null)
    setSaved(false)
    try {
      const addr = values.address
      const hasAddress = addr && Object.values(addr).some((v) => v && v.trim())
      await updatePatient({
        id,
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        birthDate: values.birthDate || undefined,
        cpf: values.cpf || undefined,
        guardianName: values.guardianName || undefined,
        guardianPhone: values.guardianPhone || undefined,
        guardianRelationship: values.guardianRelationship || undefined,
        address: hasAddress ? addr : undefined,
        medicalHistory: values.medicalHistory?.notes ? values.medicalHistory : undefined,
      })
      setSaved(true)
      setTimeout(() => router.push(`/dashboard/pacientes/${id}`), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar paciente")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined animate-spin text-[#820AD1] text-3xl">progress_activity</span>
      </div>
    )
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const patientName = form.watch("name")

  const statusMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    active: { label: "Ativo", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
    inactive: { label: "Inativo", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
    discharged: { label: "Alta", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    "on-hold": { label: "Em Espera", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  }
  const st = statusMap[patient?.status || "active"] || statusMap.active

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto scroll-smooth pb-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 font-medium mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap">
          <Link href="/dashboard/pacientes" className="hover:text-[#820AD1] transition-colors">Pacientes</Link>
          <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
          <Link href={`/dashboard/pacientes/${id}`} className="hover:text-[#820AD1] transition-colors">{patientName || "..."}</Link>
          <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
          <span className="text-[#820AD1] font-semibold">Editar</span>
        </nav>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

            {/* Header Card */}
            <div className="glass-card-strong rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#820AD1]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex items-center gap-3 sm:gap-5 relative z-10">
                <div className="size-12 sm:size-16 md:size-20 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl md:text-3xl font-bold shrink-0 shadow-lg shadow-[#820AD1]/20" style={{ background: "linear-gradient(135deg, #820AD1 0%, #C084FC 100%)" }}>
                  {patientName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Editar Paciente</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">Atualize as informações de <span className="font-semibold text-gray-700">{patientName}</span></p>
                </div>
                <span className={`px-2.5 py-1 ${st.bg} ${st.text} text-[10px] sm:text-xs font-bold rounded-full border shadow-sm items-center gap-1.5 shrink-0 hidden sm:flex`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>
            </div>

            {/* Dados Pessoais */}
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8">
              <SectionTitle icon="person" title="Dados Pessoais" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5">
                <div className="md:col-span-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome Completo *</FormLabel>
                      <FormControl><Input className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="birthDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Data de Nascimento</FormLabel>
                    <FormControl><Input type="date" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">CPF</FormLabel>
                    <FormControl><Input inputMode="numeric" placeholder="000.000.000-00" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} onChange={(e) => field.onChange(maskCPF(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</FormLabel>
                    <FormControl><Input type="email" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Telefone</FormLabel>
                    <FormControl><Input type="tel" placeholder="(00) 00000-0000" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} onChange={(e) => field.onChange(maskPhone(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Responsável */}
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8">
              <SectionTitle icon="family_restroom" title="Responsável" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5">
                <FormField control={form.control} name="guardianName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Responsável</FormLabel>
                    <FormControl><Input className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Telefone do Responsável</FormLabel>
                    <FormControl><Input type="tel" placeholder="(00) 00000-0000" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} onChange={(e) => field.onChange(maskPhone(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="guardianRelationship" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Parentesco</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-colors">
                        <option value="">Selecione</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Pai">Pai</option>
                        <option value="Avô/Avó">Avô/Avó</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Endereço */}
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8">
              <SectionTitle icon="location_on" title="Endereço" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5">
                <FormField control={form.control} name="address.zipCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">CEP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input inputMode="numeric" placeholder="00000-000" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40 pr-10" {...field} onChange={(e) => field.onChange(maskCEP(e.target.value))} />
                        {fetchingCep && (
                          <span className="material-symbols-outlined animate-spin text-[#820AD1] text-[18px] absolute right-3 top-1/2 -translate-y-1/2">progress_activity</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {cepError && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{cepError}</p>}
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.street" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rua</FormLabel>
                    <FormControl><Input className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Número</FormLabel>
                    <FormControl><Input inputMode="numeric" placeholder="123" className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} onChange={(e) => field.onChange(maskNumber(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.complement" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Complemento</FormLabel>
                    <FormControl><Input className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.neighborhood" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bairro</FormLabel>
                    <FormControl><Input className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.city" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cidade</FormLabel>
                    <FormControl><Input className="h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.state" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estado</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-colors">
                        <option value="">Selecione</option>
                        {UF_LIST.map((uf) => (<option key={uf} value={uf}>{uf}</option>))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Observações Médicas */}
            <section className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8">
              <SectionTitle icon="medical_information" title="Observações Médicas" />
              <div className="mt-4 sm:mt-5">
                <FormField control={form.control} name="medicalHistory.notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wide">Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Diagnósticos, medicações, alergias, observações gerais..." className="rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Success message */}
            {saved && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <p className="text-sm text-green-700 font-medium">Paciente atualizado com sucesso! Redirecionando...</p>
              </div>
            )}
          </form>
        </Form>
      </div>
      </div>

      {/* Sticky Save Buttons */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-6 md:bottom-6 md:right-8 z-40 flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full px-4 sm:px-5 h-9 sm:h-10 border-gray-200 bg-white shadow-lg hover:bg-gray-50 text-xs sm:text-sm">
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={isUpdating}
          onClick={form.handleSubmit(onSubmit)}
          className="bg-[#820AD1] hover:bg-[#6D08AF] rounded-full px-4 sm:px-6 h-9 sm:h-10 shadow-lg shadow-[#820AD1]/20 flex items-center gap-2 font-bold text-xs sm:text-sm"
        >
          {isUpdating ? (
            <><span className="material-symbols-outlined animate-spin text-[16px] sm:text-[18px]">progress_activity</span><span className="hidden sm:inline">Salvando...</span></>
          ) : (
            <><span className="material-symbols-outlined text-[16px] sm:text-[18px]">save</span><span className="hidden sm:inline">Salvar Alterações</span></>
          )}
        </Button>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-[#820AD1]/10 p-2 rounded-xl text-[#820AD1]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    </div>
  )
}
