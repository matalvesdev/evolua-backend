"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { usePatientMutations } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  cpf: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianRelationship: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  medicalHistory: z.object({
    notes: z.string().optional(),
  }).optional(),
})

type PatientFormValues = z.infer<typeof patientSchema>

export default function NovoPatientePage() {
  const router = useRouter()
  const { createPatient, isCreating } = usePatientMutations()
  const [error, setError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState(1)

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      birthDate: "",
      cpf: "",
      guardianName: "",
      guardianPhone: "",
      guardianRelationship: "",
      address: { street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" },
      medicalHistory: { notes: "" },
    },
  })

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Novo Paciente</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preencha os dados do novo paciente</p>
        </div>
        <Link href="/dashboard/pacientes">
          <Button variant="ghost">← Voltar</Button>
        </Link>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s ? "bg-purple-600 text-white" : step > s ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </button>
            {s < 3 && <div className={`flex-1 h-1 ${step > s ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </React.Fragment>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>

          {step === 1 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados Pessoais</h2>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl><Input placeholder="Nome do paciente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input type="tel" placeholder="(00) 00000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="birthDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl><Input inputMode="numeric" placeholder="000.000.000-00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Responsável</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="guardianName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Responsável</FormLabel>
                      <FormControl><Input placeholder="Nome do responsável" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone do Responsável</FormLabel>
                      <FormControl><Input type="tel" placeholder="(00) 00000-0000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="mt-4">
                  <FormField control={form.control} name="guardianRelationship" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
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
              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => setStep(2)} className="bg-purple-600 hover:bg-purple-700">Próximo →</Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Endereço</h2>
              <FormField control={form.control} name="address.zipCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl><Input inputMode="numeric" placeholder="00000-000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormField control={form.control} name="address.street" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua</FormLabel>
                      <FormControl><Input placeholder="Nome da rua" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address.number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl><Input placeholder="Nº" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address.complement" render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl><Input placeholder="Apto, bloco, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address.neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl><Input placeholder="Nome do bairro" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="address.city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl><Input placeholder="Nome da cidade" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address.state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="">Selecione</option>
                        {UF_LIST.map((uf) => (<option key={uf} value={uf}>{uf}</option>))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
                <Button type="button" onClick={() => setStep(3)} className="bg-purple-600 hover:bg-purple-700">Próximo →</Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Observações</h2>
              <FormField control={form.control} name="medicalHistory.notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações gerais</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o paciente, histórico médico, diagnósticos..." rows={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>
              )}
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
                <Button type="submit" disabled={isCreating || !form.getValues("name")} className="bg-purple-600 hover:bg-purple-700">
                  {isCreating ? "Salvando..." : "Salvar Paciente"}
                </Button>
              </div>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
