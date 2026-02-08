"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  DocumentsHeader,
  DocumentsFilterBar,
  DocumentsTable,
} from "@/components/patient-documents"

interface DocumentsPageProps {
  params: Promise<{ id: string }>
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = use(params)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")

  // Mock data - substituir por dados reais do Supabase
  const documents = [
    {
      id: "1",
      fileName: "Avaliação Fonoaudiológica.pdf",
      fileDescription: "Relatório Inicial Completo",
      fileType: "pdf" as const,
      date: "15 Set 2023",
      size: "2.4 MB",
      author: {
        name: "Dra. Julia",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVIwBzXm5zYn2BuS0AxE0fpQNJSgemGClEhiESKpiNZxEPQumfo3tOSrWnSI7XoLKfgh4F0Enna27S03f-1ZI3ZOArcU1FgHrn95ELqM2Q_v3HadwnZxCa68_mDu-m-2pfxf0oZPJ8K77HoGRDAPathnKjJI-hD-oh67LevjqIYPvSSqIj2RKGGQF0X3Fds59oTfhrUVEJtfWI88p_DITjBx4k9MopZVsVPdY-zDixssUqFe13bQZRDJgPKUZAB1Zygtk2NSAL1gi",
      },
    },
    {
      id: "2",
      fileName: "Exercícios de Dicção - Sessão 04.mp3",
      fileDescription: "Gravação de Áudio",
      fileType: "audio" as const,
      date: "10 Out 2023",
      size: "14 MB",
      author: {
        name: "Dra. Julia",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVIwBzXm5zYn2BuS0AxE0fpQNJSgemGClEhiESKpiNZxEPQumfo3tOSrWnSI7XoLKfgh4F0Enna27S03f-1ZI3ZOArcU1FgHrn95ELqM2Q_v3HadwnZxCa68_mDu-m-2pfxf0oZPJ8K77HoGRDAPathnKjJI-hD-oh67LevjqIYPvSSqIj2RKGGQF0X3Fds59oTfhrUVEJtfWI88p_DITjBx4k9MopZVsVPdY-zDixssUqFe13bQZRDJgPKUZAB1Zygtk2NSAL1gi",
      },
    },
    {
      id: "3",
      fileName: "Foto Exame Físico - Orofaciais.jpg",
      fileDescription: "Imagem de registro",
      fileType: "image" as const,
      date: "20 Set 2023",
      size: "3.1 MB",
      author: {
        name: "Mariana Souza (Mãe)",
        initials: "MS",
      },
    },
    {
      id: "4",
      fileName: "Encaminhamento Otorrinolaringologista.docx",
      fileDescription: "Documento Word",
      fileType: "document" as const,
      date: "01 Out 2023",
      size: "450 KB",
      author: {
        name: "Dra. Julia",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVIwBzXm5zYn2BuS0AxE0fpQNJSgemGClEhiESKpiNZxEPQumfo3tOSrWnSI7XoLKfgh4F0Enna27S03f-1ZI3ZOArcU1FgHrn95ELqM2Q_v3HadwnZxCa68_mDu-m-2pfxf0oZPJ8K77HoGRDAPathnKjJI-hD-oh67LevjqIYPvSSqIj2RKGGQF0X3Fds59oTfhrUVEJtfWI88p_DITjBx4k9MopZVsVPdY-zDixssUqFe13bQZRDJgPKUZAB1Zygtk2NSAL1gi",
      },
    },
    {
      id: "5",
      fileName: "Plano Terapêutico Individual (PTI).pdf",
      fileDescription: "Planejamento Semestral",
      fileType: "other" as const,
      date: "10 Set 2023",
      size: "890 KB",
      author: {
        name: "Dra. Julia",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVIwBzXm5zYn2BuS0AxE0fpQNJSgemGClEhiESKpiNZxEPQumfo3tOSrWnSI7XoLKfgh4F0Enna27S03f-1ZI3ZOArcU1FgHrn95ELqM2Q_v3HadwnZxCa68_mDu-m-2pfxf0oZPJ8K77HoGRDAPathnKjJI-hD-oh67LevjqIYPvSSqIj2RKGGQF0X3Fds59oTfhrUVEJtfWI88p_DITjBx4k9MopZVsVPdY-zDixssUqFe13bQZRDJgPKUZAB1Zygtk2NSAL1gi",
      },
    },
  ]

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    console.log("Searching:", query)
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    console.log("Filter changed:", filter)
  }

  const handleNewDocument = () => {
    console.log("New document clicked")
  }

  const handleView = (documentId: string) => {
    console.log("View document:", documentId)
  }

  const handleShare = (documentId: string) => {
    console.log("Share document:", documentId)
  }

  const handleDownload = (documentId: string) => {
    console.log("Download document:", documentId)
  }

  const handlePlay = (documentId: string) => {
    console.log("Play audio:", documentId)
  }

  const handlePrevious = () => {
    console.log("Previous page")
  }

  const handleNext = () => {
    console.log("Next page")
  }

  return (
    <div className="relative min-h-screen">
      {/* Gradient Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#8A05BE]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-pink-300/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10 py-8 pb-10">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/dashboard/pacientes" className="hover:text-[#8A05BE] transition-colors">
            Pacientes
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href={`/dashboard/pacientes/${id}`} className="hover:text-[#8A05BE] transition-colors">
            Ana Clara Souza
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#8A05BE] font-medium">Documentos</span>
        </div>

        <div className="flex flex-col gap-8">
          {/* Header */}
          <DocumentsHeader storageUsed={1.2} storageTotal={5} />

          {/* Filter Bar and Table */}
          <div className="flex flex-col">
            <DocumentsFilterBar
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              onNewDocument={handleNewDocument}
            />

            <DocumentsTable
              documents={documents}
              totalCount={24}
              onView={handleView}
              onShare={handleShare}
              onDownload={handleDownload}
              onPlay={handlePlay}
              onPrevious={handlePrevious}
              onNext={handleNext}
              hasPrevious={false}
              hasNext={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
