import Link from "next/link"

export function AuthLogo() {
  return (
    <Link 
      href="/" 
      className="flex items-center gap-3 text-lg font-semibold text-gray-900 group w-fit"
    >
      <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-600/20 group-hover:bg-purple-700 transition-all duration-300 transform group-hover:scale-105">
        <span className="text-xl">E</span>
      </div>
      <span className="font-bold text-2xl tracking-tight text-gray-900 group-hover:text-purple-600 transition-colors">
        Evolua
      </span>
    </Link>
  )
}
