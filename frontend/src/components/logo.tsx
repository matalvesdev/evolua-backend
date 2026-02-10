import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconOnly?: boolean
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: {
    icon: "h-5 w-5",
    text: "text-base",
  },
  md: {
    icon: "h-6 w-6",
    text: "text-lg",
  },
  lg: {
    icon: "h-8 w-8",
    text: "text-xl",
  },
}

export function Logo({ className, iconOnly = false, size = "md" }: LogoProps) {
  const sizes = sizeClasses[size]

  return (
    <Link
      href="/dashboard/"
      className={cn(
        "flex items-center gap-2 font-semibold text-primary hover:opacity-80 transition-opacity",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-primary flex items-center justify-center",
          sizes.icon
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-3/5 w-3/5 text-primary-foreground"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </div>
      {!iconOnly && <span className={cn("font-bold", sizes.text)}>Evolua</span>}
    </Link>
  )
}
