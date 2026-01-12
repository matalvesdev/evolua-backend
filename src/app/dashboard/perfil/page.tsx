'use client';

import { useState, useEffect } from 'react';

interface UserData {
  name: string;
  email: string;
  phone: string;
  crfa: string;
  specialization: string;
  avatarUrl?: string;
}

interface Preferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  reportNotifications: boolean;
  darkMode: boolean;
}

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<UserData>({
    name: 'Dra. Clara Silva',
    email: 'clara.silva@evolua.com',
    phone: '(11) 98765-4321',
    crfa: '2-12345',
    specialization: 'Fonoaudiologia Clínica',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFPUJTW_YZ5_7XKTe_3Br11gRjruE3B99AZmrNdZhiDp0vOx4E5aijaqlhMaJZKBt6-6hX3UfjBowbzKmh4M7ne0u_W3FLnJTsqvg3Z6zY09dfmXhtzHxRInfRP_pVTonVI2D6fLKk0cLgr0yqQsR-hGmSLVqPXlVfxLkjrbNlM28iCisIAO4kuUa3bgVuOO7ubm4MCyzMTq2HENcntGAUxSq2RLgUk_YiAKLeXs-oWR5ulD40COTyUJnCCT5_FtIlVp7eMvwVJ9Tr',
  });

  const [preferences, setPreferences] = useState<Preferences>({
    emailNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    reportNotifications: true,
    darkMode: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
      {/* Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#fbf8fd] to-transparent dark:from-[#2a1b33] dark:to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-[1000px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-[#161118] dark:text-white text-3xl lg:text-4xl font-bold tracking-tight mb-2">
              Meu Perfil
            </h1>
            <p className="text-[#7c6189] dark:text-gray-400 text-base font-normal">
              Gerencie suas informações pessoais, preferências e segurança.
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 border-b border-[#f3f0f4] dark:border-white/10 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-[#7c6189] hover:text-[#161118] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              person
            </span>
            <span className="font-semibold text-sm">Perfil</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-primary text-primary'
                : 'border-transparent text-[#7c6189] hover:text-[#161118] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              tune
            </span>
            <span className="font-semibold text-sm">Preferências</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-primary text-primary'
                : 'border-transparent text-[#7c6189] hover:text-[#161118] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              lock
            </span>
            <span className="font-semibold text-sm">Segurança</span>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6">
            {/* Avatar Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-[#2d1b36] dark:to-[#1c1022] backdrop-blur-md border border-white/60 dark:border-white/10 shadow-lg p-6 lg:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative group">
                  {formData.avatarUrl ? (
                    <div
                      className="size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-white/20 shadow-lg"
                      style={{ backgroundImage: `url(${formData.avatarUrl})` }}
                    ></div>
                  ) : (
                    <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-4 border-white dark:border-white/20 shadow-lg">
                      {getInitials(formData.name)}
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-110">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      photo_camera
                    </span>
                  </button>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-[#161118] dark:text-white mb-1">
                    {formData.name}
                  </h2>
                  <p className="text-[#7c6189] dark:text-gray-400 text-sm mb-1">{formData.email}</p>
                  <p className="text-[#7c6189] dark:text-gray-400 text-sm">
                    CRFa: {formData.crfa} • {formData.specialization}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Form Card */}
            <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden p-6 lg:p-8">
              <h3 className="text-lg font-bold text-[#161118] dark:text-white mb-6">
                Informações Pessoais
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#161118] dark:text-white">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#161118] dark:text-white">
                      E-mail
                    </label>
                    <input
                      type="email"
                      className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#161118] dark:text-white">
                      Telefone
                    </label>
                    <input
                      type="text"
                      className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#161118] dark:text-white">
                      CRFa
                    </label>
                    <input
                      type="text"
                      className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                      value={formData.crfa}
                      onChange={(e) => setFormData({ ...formData, crfa: e.target.value })}
                      placeholder="0-00000"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-[#161118] dark:text-white">
                      Especialização
                    </label>
                    <input
                      type="text"
                      className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      placeholder="Ex: Fonoaudiologia Clínica"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-lg border border-[#f3f0f4] dark:border-white/10 text-[#7c6189] hover:text-[#161118] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5 transition-all text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                          progress_activity
                        </span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          save
                        </span>
                        Salvar alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="flex flex-col gap-6">
            {/* Notifications Card */}
            <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    notifications
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#161118] dark:text-white">Notificações</h3>
                  <p className="text-xs text-[#7c6189]">Personalize como você recebe atualizações</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '20px' }}>
                      mail
                    </span>
                    <div>
                      <p className="font-semibold text-[#161118] dark:text-white text-sm">
                        Notificações por e-mail
                      </p>
                      <p className="text-xs text-[#7c6189]">Receba atualizações e lembretes por e-mail</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({ ...preferences, emailNotifications: !preferences.emailNotifications })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.emailNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '20px' }}>
                      notifications_active
                    </span>
                    <div>
                      <p className="font-semibold text-[#161118] dark:text-white text-sm">Notificações push</p>
                      <p className="text-xs text-[#7c6189]">Receba notificações no navegador</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({ ...preferences, pushNotifications: !preferences.pushNotifications })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.pushNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '20px' }}>
                      event
                    </span>
                    <div>
                      <p className="font-semibold text-[#161118] dark:text-white text-sm">
                        Lembretes de agendamentos
                      </p>
                      <p className="text-xs text-[#7c6189]">Receba lembretes antes dos agendamentos</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        appointmentReminders: !preferences.appointmentReminders,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.appointmentReminders ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.appointmentReminders ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '20px' }}>
                      description
                    </span>
                    <div>
                      <p className="font-semibold text-[#161118] dark:text-white text-sm">
                        Notificações de relatórios
                      </p>
                      <p className="text-xs text-[#7c6189]">Seja notificado quando relatórios forem gerados</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        reportNotifications: !preferences.reportNotifications,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.reportNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.reportNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Appearance Card */}
            <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    palette
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#161118] dark:text-white">Aparência</h3>
                  <p className="text-xs text-[#7c6189]">Customize o tema da interface</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#7c6189]" style={{ fontSize: '20px' }}>
                    dark_mode
                  </span>
                  <div>
                    <p className="font-semibold text-[#161118] dark:text-white text-sm">Modo escuro</p>
                    <p className="text-xs text-[#7c6189]">Ativar tema escuro na interface</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, darkMode: !preferences.darkMode })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.darkMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg border border-[#f3f0f4] dark:border-white/10 text-[#7c6189] hover:text-[#161118] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5 transition-all text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 transition-all duration-200 text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                      progress_activity
                    </span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      save
                    </span>
                    Salvar preferências
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-6">
            {/* Change Password Card */}
            <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    lock
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#161118] dark:text-white">Alterar Senha</h3>
                  <p className="text-xs text-[#7c6189]">Mantenha sua conta segura</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#161118] dark:text-white">Senha atual</label>
                  <input
                    type="password"
                    className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#161118] dark:text-white">Nova senha</label>
                  <input
                    type="password"
                    className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#161118] dark:text-white">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    className="block w-full py-2.5 px-4 text-sm text-[#161118] dark:text-white bg-white dark:bg-white/5 border border-[#f3f0f4] dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#7c6189]"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    lock
                  </span>
                  Alterar senha
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50/80 to-red-100/40 dark:from-red-900/20 dark:to-red-950/10 backdrop-blur-md border border-red-200 dark:border-red-900/50 shadow-lg p-6 lg:p-8">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    warning
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-2">Zona de Perigo</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Ações irreversíveis que afetarão permanentemente sua conta. Tenha cuidado ao prosseguir.
                  </p>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      delete_forever
                    </span>
                    Excluir conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
