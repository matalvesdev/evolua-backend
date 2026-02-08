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
import {
  PatientStatusBadge,
  PatientSectionHeader,
} from "@/components/patients"

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

type EditPatientFormValues = z.infer<typeof editPatientSchema>

export default function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { patient, loading } = usePatient(id)
  const { updatePatient, isUpdating } = usePatientMutations()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
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
          street: addr?.street || "",
          number: addr?.number || "",
          complement: addr?.complement || "",
          neighborhood: addr?.neighborhood || "",
          city: addr?.city || "",
          state: addr?.state || "",
          zipCode: addr?.zipCode || "",
        },
        medicalHistory: {
          notes: patient.medicalHistory?.notes || "",
        },
      })
    }
  }, [patient, form])

  const onSubmit = async (values: EditPatientFormValues) => {
    setError(null)
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
      router.push(`/dashboard/pacientes/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar paciente")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
      </div>
    )
  }

  const patientName = form.watch("name")

  return (
    <div className="relative min-h-screen">
      <div className="relative max-w-4xl mx-auto px-4 md:px-8 py-8 pb-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/dashboard/pacientes" className="hover:text-[#820AD1] transition-colors">Pacientes</Link>
          <span>›</span>
          <Link href={`/dashboard/pacientes/${id}`} className="hover:text-[#820AD1] transition-colors">{patientName}</Link>
          <span>›</span>
          <span className="text-[#820AD1] font-medium">Editar Dados</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between gap-6 mb-10 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-5">
              <div className="size-20 rounded-2xl bg-linear-to-br from-[#820AD1] to-purple-400 flex items-center justify-center text-white text-3xl font-bold">
                {patientName?.charAt(0) || "?"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Paciente</h1>
                <p className="text-gray-600 mt-1">Atualize as informações de <span className="font-medium text-gray-900 dark:text-white">{patientName}</span></p>
              </div>
            </div>
            {patient && <PatientStatusBadge status={patient.status as "active" | "inactive" | "discharged" | "on_hold" | "new"} />}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              {/* Dados Pessoais */}
              <div>
                <PatientSectionHeader icon="person" title="Dados Pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="md:col-span-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="birthDate" render={({ field }) => (
                    <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem><FormLabel>CPF</FormLabel><FormControl><Input inputMode="numeric" placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input type="tel" placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Responsável */}
              <div>
                <PatientSectionHeader icon="diversity_3" title="Responsável" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <FormField control={form.control} name="guardianName" render={({ field }) => (
                    <FormItem><FormLabel>Nome do Responsável</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone do Responsável</FormLabel><FormControl><Input type="tel" placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
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

              <hr className="border-gray-100" />

              {/* Endereço */}
              <div>
                <PatientSectionHeader icon="location_on" title="Endereço" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <FormField control={form.control} name="address.zipCode" render={({ field }) => (
                    <FormItem><FormLabel>CEP</FormLabel><FormControl><Input inputMode="numeric" placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address.street" render={({ field }) => (
                    <FormItem><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address.number" render={({ field }) => (
                    <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address.complement" render={({ field }) => (
                    <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address.neighborhood" render={({ field }) => (
                    <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address.city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
              </div>

              <hr className="border-gray-100" />

              {/* Observações */}
              <div>
                <PatientSectionHeader icon="medical_information" title="Observações Médicas" />
                <div className="mt-4">
                  <FormField control={form.control} name="medicalHistory.notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl><Textarea rows={4} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" disabled={isUpdating} className="bg-purple-600 hover:bg-purple-700">
                  {isUpdating ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
