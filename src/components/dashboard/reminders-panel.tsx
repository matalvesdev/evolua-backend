"use client"

export function RemindersPanel() {
  // TODO: Connect to real reminders/notifications from database
  const reminders: any[] = []

  return (
    <div className="mb-6">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
        <div className="p-1.5 bg-yellow-100 rounded-lg">
          <span className="material-symbols-outlined text-yellow-600 text-sm">notifications_active</span>
        </div>
        Lembretes
      </h3>

      <div className="space-y-3 overflow-y-auto pr-1 flex-1">
        {reminders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">notifications_off</span>
            <p className="text-sm">Nenhum lembrete no momento</p>
          </div>
        ) : (
          reminders.map((reminder: any) => (
            <div key={reminder.id} className="bg-white/60 p-3 rounded-2xl border border-white hover:border-purple-200 transition-all hover:shadow-sm">
              {/* Reminder content will be rendered here */}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
