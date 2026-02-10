"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { usePatientMutations } from "@/hooks"
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

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const

const patientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
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

type PatientFormValues = z.infer<typeof patientSchema>

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

const STEP_LABELS = ["Dados Pessoais", "Endereço", "Observações"]

export default function NovoPatientePage() {
  const router = useRouter()
  const { createPatient, isCreating } = usePatientMutations()
  const [error, setError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState(1)
  const [fetchingCep, setFetchingCep] = React.useState(false)
  const [cepError, setCepError] = React.useState<string | null>(null)

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "", email: "", phone: "", birthDate: "", cpf: "",
      guardianName: "", guardianPhone: "", guardianRelationship: "",
      address: { street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" },
      medicalHistory: { notes: "" },
    },
  })

  // ViaCEP auto-fill
  const watchedCep = form.watch("address.zipCode")
  React.useEffect(() => {
    if (!watchedCep) return
    const digits = watchedCep.replace(/\D/g, "")
    if (digits.length !== 8) { setCepError(null); return }
    let cancelled = false
    setFetchingCep(true)
    setCepError(null)
    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.erro) { setCepError("CEP não encontrado"); return }
        form.setValue("address.street", data.logradouro || "", { shouldValidate: true })
        form.setValue("address.neighborhood", data.bairro || "", { shouldValidate: true })
        form.setValue("address.city", data.localidade || "", { shouldValidate: true })
        form.setValue("address.state", data.uf || "", { shouldValidate: true })
      })
      .catch(() => { if (!cancelled) setCepError("Erro ao buscar CEP") })
      .finally(() => { if (!cancelled) setFetchingCep(false) })
    return () => { cancelled = true }
  }, [watchedCep, form])

  const handleNextFromStep1 = async () => {
    const valid = await form.trigger(["name", "email", "phone", "birthDate", "cpf", "guardianName", "guardianPhone", "guardianRelationship"])
    if (valid) setStep(2)
  }

  const handleNextFromStep2 = async () => {
    const valid = await form.trigger(["address.street", "address.number", "address.complement", "address.neighborhood", "address.city", "address.state", "address.zipCode"])
    if (valid) setStep(3)
  }

  const onSubmit = async (values: PatientFormValues) => {
    setError(null)
    try {
      const addr = values.address
      const hasAddress = addr && Object.values(addr).some((v) => v && v.trim())
      await createPatient({
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
      router.push("/dashboard/pacientes")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar paciente")
    }
  }

  const inputClass = "h-11 rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40"
  const labelClass = "text-xs font-bold text-gray-500 uppercase tracking-wide"
  const selectClass = "w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/40 transition-colors"

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-6">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col gap-5 sm:gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Novo Paciente</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Preencha os dados do novo paciente</p>
          </div>
          <Link href="/dashboard/pacientes">
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#820AD1] transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Voltar
            </button>
          </Link>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <button
                type="button"
                onClick={() => { if (s < step) setStep(s) }}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0 ${
                  step === s
                    ? "bg-[#820AD1] text-white shadow-lg shadow-[#820AD1]/20"
                    : step > s
                      ? "bg-green-500 text-white cursor-pointer"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s ? <span className="material-symbols-outlined text-[16px]">check</span> : s}
              </button>
              {s < 3 && (
                <div className="flex-1 flex items-center gap-1">
                  <div className={`flex-1 h-1 rounded-full transition-colors ${step > s ? "bg-green-500" : "bg-gray-200"}`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-gray-400 font-medium -mt-3 sm:-mt-4">Etapa {step} de 3 — {STEP_LABELS[step - 1]}</p>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* Step 1: Dados Pessoais */}
            {step === 1 && (
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
                <SectionTitle icon="person" title="Dados Pessoais" />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Nome Completo *</FormLabel>
                    <FormControl><Input placeholder="Nome do paciente" className={inputClass} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="email@exemplo.com" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Telefone</FormLabel>
                      <FormControl><Input type="tel" placeholder="(00) 00000-0000" className={inputClass} {...field} onChange={(e) => field.onChange(maskPhone(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="birthDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Data de Nascimento</FormLabel>
                      <FormControl><Input type="date" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>CPF</FormLabel>
                      <FormControl><Input inputMode="numeric" placeholder="000.000.000-00" className={inputClass} {...field} onChange={(e) => field.onChange(maskCPF(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Responsável */}
                <div className="border-t border-gray-100 pt-5">
                  <SectionTitle icon="family_restroom" title="Responsável" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <FormField control={form.control} name="guardianName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Nome do Responsável</FormLabel>
                        <FormControl><Input placeholder="Nome do responsável" className={inputClass} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Telefone do Responsável</FormLabel>
                        <FormControl><Input type="tel" placeholder="(00) 00000-0000" className={inputClass} {...field} onChange={(e) => field.onChange(maskPhone(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="mt-4">
                    <FormField control={form.control} name="guardianRelationship" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Parentesco</FormLabel>
                        <FormControl>
                          <select {...field} className={selectClass}>
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
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Link href="/dashboard/pacientes">
                    <Button type="button" variant="outline" className="rounded-full px-5 h-10 border-gray-200 text-sm">Cancelar</Button>
                  </Link>
                  <Button type="button" onClick={handleNextFromStep1} className="bg-[#820AD1] hover:bg-[#6D08AF] rounded-full px-6 h-10 font-bold text-sm shadow-lg shadow-[#820AD1]/20 flex items-center gap-2">
                    Próximo
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Endereço */}
            {step === 2 && (
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
                <SectionTitle icon="location_on" title="Endereço" />

                <FormField control={form.control} name="address.zipCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>CEP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input inputMode="numeric" placeholder="00000-000" className={`${inputClass} pr-10`} {...field} onChange={(e) => field.onChange(maskCEP(e.target.value))} />
                        {fetchingCep && (
                          <span className="material-symbols-outlined animate-spin text-[#820AD1] text-[18px] absolute right-3 top-1/2 -translate-y-1/2">progress_activity</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {cepError && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{cepError}</p>}
                  </FormItem>
                )} />

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <FormField control={form.control} name="address.street" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Rua</FormLabel>
                        <FormControl><Input placeholder="Nome da rua" className={inputClass} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="address.number" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Número</FormLabel>
                      <FormControl><Input inputMode="numeric" placeholder="Nº" className={inputClass} {...field} onChange={(e) => field.onChange(maskNumber(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="address.complement" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Complemento</FormLabel>
                    <FormControl><Input placeholder="Apto, bloco, etc." className={inputClass} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address.neighborhood" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Bairro</FormLabel>
                    <FormControl><Input placeholder="Nome do bairro" className={inputClass} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="address.city" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Cidade</FormLabel>
                      <FormControl><Input placeholder="Nome da cidade" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address.state" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Estado</FormLabel>
                      <FormControl>
                        <select {...field} className={selectClass}>
                          <option value="">Selecione</option>
                          {UF_LIST.map((uf) => (<option key={uf} value={uf}>{uf}</option>))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-full px-5 h-10 border-gray-200 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleNextFromStep2} className="bg-[#820AD1] hover:bg-[#6D08AF] rounded-full px-6 h-10 font-bold text-sm shadow-lg shadow-[#820AD1]/20 flex items-center gap-2">
                    Próximo
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Observações */}
            {step === 3 && (
              <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
                <SectionTitle icon="medical_information" title="Observações Médicas" />

                <FormField control={form.control} name="medicalHistory.notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Observações gerais</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Diagnósticos, medicações, alergias, observações gerais..." rows={6} className="rounded-xl border-gray-200 bg-white focus-visible:ring-[#820AD1]/20 focus-visible:border-[#820AD1]/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="rounded-full px-5 h-10 border-gray-200 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={isCreating} className="bg-[#820AD1] hover:bg-[#6D08AF] rounded-full px-6 h-10 font-bold text-sm shadow-lg shadow-[#820AD1]/20 flex items-center gap-2">
                    {isCreating ? (
                      <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Salvando...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[18px]">save</span>Salvar Paciente</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
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
