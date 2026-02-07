"use client"

import * as React from "react"
import { useUser } from "@/hooks"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

export default function PerfilPage() {
  const { user, loading } = useUser()
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    crfa: "",
    specialization: "",
  })

  const [preferences, setPreferences] = React.useState({
    emailNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    reportNotifications: true,
    darkMode: false,
  })

  React.useEffect(() => {
    if (user) {
      // Supabase User type has user_metadata for custom fields
      const metadata = user.user_metadata || {}
      setFormData({
        name: (metadata.name || metadata.full_name || "") as string,
        email: user.email || "",
        phone: (metadata.phone || "") as string,
        crfa: (metadata.crfa || "") as string,
        specialization: (metadata.specialization || "") as string,
      })
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    // TODO: Implement update user profile action
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    setIsSaving(false)
  }

  const handleSavePreferences = async () => {
    setIsSaving(true)
    
    // TODO: Implement save preferences action
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    setIsSaving(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Perfil</h1>
        <p className="text-gray-500 mt-1">Gerencie suas informações pessoais e preferências</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6 pb-6 border-b">
              <Avatar className="size-24">
                <AvatarImage src={user?.user_metadata?.avatar_url as string | undefined} />
                <AvatarFallback className="text-2xl bg-primary text-white">
                  {user?.user_metadata?.name ? getInitials(user.user_metadata.name as string) : user?.user_metadata?.full_name ? getInitials(user.user_metadata.full_name as string) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{(user?.user_metadata?.name || user?.user_metadata?.full_name || "Usuário") as string}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <Button variant="outline" className="mt-2" size="sm">
                  <span className="material-symbols-outlined text-lg mr-2">photo_camera</span>
                  Alterar foto
                </Button>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crfa">CRFa</Label>
                  <Input
                    id="crfa"
                    value={formData.crfa}
                    onChange={(e) => setFormData((prev) => ({ ...prev, crfa: e.target.value }))}
                    placeholder="0-00000"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specialization">Especialização</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, specialization: e.target.value }))
                    }
                    placeholder="Ex: Fonoaudiologia Clínica"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg mr-2">
                        progress_activity
                      </span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg mr-2">save</span>
                      Salvar alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notificações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Notificações por e-mail</p>
                  <p className="text-sm text-gray-500">
                    Receba atualizações e lembretes por e-mail
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Notificações push</p>
                  <p className="text-sm text-gray-500">
                    Receba notificações no navegador
                  </p>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, pushNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Lembretes de agendamentos</p>
                  <p className="text-sm text-gray-500">
                    Receba lembretes antes dos agendamentos
                  </p>
                </div>
                <Switch
                  checked={preferences.appointmentReminders}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, appointmentReminders: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Notificações de relatórios</p>
                  <p className="text-sm text-gray-500">
                    Seja notificado quando relatórios forem gerados
                  </p>
                </div>
                <Switch
                  checked={preferences.reportNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, reportNotifications: checked }))
                  }
                />
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aparência</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Modo escuro</p>
                  <p className="text-sm text-gray-500">
                    Ativar tema escuro na interface
                  </p>
                </div>
                <Switch
                  checked={preferences.darkMode}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, darkMode: checked }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t mt-6">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleSavePreferences} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg mr-2">
                      progress_activity
                    </span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg mr-2">save</span>
                    Salvar preferências
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Senha</h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha atual</Label>
                <Input id="current-password" type="password" placeholder="••••••••" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" placeholder="••••••••" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" />
              </div>

              <Button className="w-full">
                <span className="material-symbols-outlined text-lg mr-2">lock</span>
                Alterar senha
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-red-200 bg-red-50">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Zona de perigo</h3>
            <p className="text-sm text-red-700 mb-4">
              Ações irreversíveis que afetarão permanentemente sua conta.
            </p>
            <Button variant="destructive">
              <span className="material-symbols-outlined text-lg mr-2">delete_forever</span>
              Excluir conta
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
