"use client"

import { useState } from "react"
import Image from "next/image"

interface TodoItem {
  id: number
  text: string
  completed: boolean
}

const initialTodos: TodoItem[] = [
  { id: 1, text: "Revisar prontuário de Miguel", completed: false },
  { id: 2, text: "Responder e-mail da clínica", completed: false },
  { id: 3, text: "Preparar material para Laura", completed: true },
]

export function DashboardTodoList() {
  const [todos, setTodos] = useState(initialTodos)

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
          <div className="p-1.5 bg-green-100 rounded-lg">
            <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
          </div>
          Minha To-Do List
        </h3>
        <button className="text-xs font-bold text-primary hover:bg-purple-50 px-2 py-1 rounded-md transition-colors">
          + Add
        </button>
      </div>
      <div className="space-y-2 mb-6">
        {todos.map((todo) => (
          <label
            key={todo.id}
            className="flex items-start gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-colors group"
          >
            <input
              type="checkbox"
              className={`mt-1 rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 ${todo.completed ? "opacity-50" : ""}`}
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span className={`text-sm transition-colors ${todo.completed ? "text-gray-400 line-through" : "text-gray-600 group-hover:text-gray-900"}`}>
              {todo.text}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-auto relative rounded-2xl overflow-hidden min-h-40 shadow-sm">
        <Image
          alt="Fonoaudióloga interagindo com tecnologia"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBowjBdJ77dfaU37M_dwmTXJ0wC17N8mwUCZojMLsVRTmzPhFK40fs1u-jUfmtX4ikkRiDO79tSnlHumVpzlzb4UrdZur8oaKnEoUsGf-kmD6MQjfykYk6XdsexkWF8r2FTQL6E6aEdb10h1WE0tonjQN7TvvppXKzl-W3MRaF2ud0sLt4AGZg3wKq-2_vA4HuBYSoknCV5y6mrQBZar6fN4w4l9PceKwB9Y08YNkIwnQ0rqx_xr6nyjIPVnCKVuz3Ctf0xt1bKK47x"
          fill
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-linear-to-t from-purple-900/80 to-transparent flex items-end p-4">
          <p className="text-white text-xs font-medium leading-tight">
            &ldquo;A tecnologia conecta, mas é o seu cuidado que transforma vidas.&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
