"use client"

export function DashboardTodoList() {
  // TODO: Connect to real tasks from database
  const todos: any[] = []

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
          <div className="p-1.5 bg-green-100 rounded-lg">
            <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
          </div>
          Minha To-Do List
        </h3>
      </div>
      <div className="space-y-2 mb-6">
        {todos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">check_circle</span>
            <p className="text-sm">Tudo em dia!</p>
          </div>
        ) : (
          todos.map((todo: any) => (
            <label
              key={todo.id}
              className="flex items-start gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-colors group"
            >
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                {todo.text}
              </span>
            </label>
          ))
        )}
      </div>
      <button className="w-full text-xs font-bold text-primary hover:bg-purple-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-sm">add</span>
        Adicionar Tarefa
      </button>
    </div>
  )
}
