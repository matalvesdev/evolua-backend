"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Document {
  id: string
  title: string
  date: string
  size: string
  type: "pdf" | "audio" | "doc"
  icon: string
  iconColor: string
}

export function DocumentsSection() {
  const [searchTerm, setSearchTerm] = useState("")

  const documents: Document[] = [
    {
      id: "1",
      title: "Avaliação Fonoaudiológica Inicial",
      date: "15 Set 2023",
      size: "2.4 MB",
      type: "pdf",
      icon: "picture_as_pdf",
      iconColor: "bg-red-50 text-red-500"
    },
    {
      id: "2",
      title: "Resumo de Sessão (Áudio Transcrito)",
      date: "10 Out 2023",
      size: "03:45 min",
      type: "audio",
      icon: "graphic_eq",
      iconColor: "bg-purple-50 text-[#820AD1]"
    },
    {
      id: "3",
      title: "Encaminhamento Otorrinolaringologista",
      date: "01 Out 2023",
      size: "DOCX",
      type: "doc",
      icon: "description",
      iconColor: "bg-blue-50 text-blue-500"
    }
  ]

  return (
    <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shadow-sm shadow-blue-100">
            <span className="material-symbols-outlined">folder_open</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Documentos e Relatórios</h3>
            <p className="text-xs text-gray-600 font-medium">4 arquivos este mês</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 bg-white border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-bold rounded-full shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
            <span className="hidden sm:inline">Gravar Áudio</span>
          </Button>
          <Button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-full shadow-lg hover:bg-gray-800">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#820AD1] transition-colors text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar documentos..."
          className="w-full bg-white border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#820AD1]/20 focus:border-[#820AD1]/30 shadow-sm transition-all placeholder:text-gray-400 text-gray-900"
        />
      </div>

      {/* Document List */}
      <div className="flex flex-col gap-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group flex items-center justify-between p-3.5 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-md transition-all cursor-pointer bg-white/40"
          >
            <div className="flex items-center gap-4">
              <div className={`size-11 rounded-xl ${doc.iconColor} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined">{doc.icon}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-gray-900 group-hover:text-[#820AD1] transition-colors">
                  {doc.title}
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  {doc.date} • {doc.size}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
                title="Visualizar"
              >
                <span className="material-symbols-outlined text-[20px]">visibility</span>
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
                title="Baixar"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View All */}
      <button className="w-full py-3 border-t border-gray-100 text-sm text-[#820AD1] font-bold hover:bg-[#820AD1]/5 rounded-b-xl transition-colors flex items-center justify-center gap-2">
        Ver todos os documentos
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </button>
    </section>
  )
}
