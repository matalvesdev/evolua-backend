/**
 * Pure utility functions extracted from patient components for testability.
 * These functions handle data transformation for patient card rendering
 * and patient list search filtering.
 */

/**
 * Get initials from a patient name.
 * If the name has two or more parts, returns the first letter of the first two parts.
 * Otherwise, returns the first two characters of the name.
 */
export function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  "from-blue-100 to-blue-200 text-blue-600",
  "from-pink-100 to-rose-200 text-rose-600",
  "from-amber-100 to-yellow-200 text-amber-600",
  "from-indigo-100 to-indigo-200 text-indigo-600",
  "from-teal-100 to-teal-200 text-teal-600",
  "from-purple-100 to-purple-200 text-[#8A05BE]",
  "from-emerald-100 to-emerald-200 text-emerald-600",
]

/**
 * Get a deterministic avatar color class based on the patient name.
 * Uses the char code of the first character modulo the number of available colors.
 */
export function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Get a specialty tag color class based on the specialty name.
 * Matches known specialty keywords to specific color schemes.
 */
export function getSpecialtyColor(specialty: string): string {
  const lowerSpecialty = specialty.toLowerCase()
  if (lowerSpecialty.includes("tea")) return "bg-purple-100 text-[#8A05BE]"
  if (lowerSpecialty.includes("fala")) return "bg-gray-100 text-gray-600"
  if (lowerSpecialty.includes("motricidade")) return "bg-orange-100 text-orange-700"
  if (lowerSpecialty.includes("apraxia")) return "bg-blue-100 text-blue-700"
  if (lowerSpecialty.includes("linguagem")) return "bg-emerald-100 text-emerald-700"
  if (lowerSpecialty.includes("disfagia")) return "bg-red-100 text-red-600"
  return "bg-gray-100 text-gray-600"
}

/**
 * Patient data shape used for search filtering.
 */
export interface PatientSearchData {
  name: string
  email?: string
  phone?: string
}

/**
 * Filter patients by a search term using case-insensitive substring matching
 * on name, email, and phone fields. This is the same logic used in the
 * patient list page component.
 *
 * Returns all patients if searchTerm is empty.
 */
export function filterPatients<T extends PatientSearchData>(
  patients: T[],
  searchTerm: string
): T[] {
  if (!searchTerm) return patients

  const search = searchTerm.toLowerCase()
  return patients.filter((patient) => {
    return (
      patient.name.toLowerCase().includes(search) ||
      patient.email?.toLowerCase().includes(search) ||
      patient.phone?.toLowerCase().includes(search)
    )
  })
}
