"use client"

import { cn } from "@/lib/utils"

interface FieldErrorProps {
  errors?: string[]
  className?: string
}

export function FieldError({ errors, className }: FieldErrorProps) {
  if (!errors || errors.length === 0) return null
  return (
    <div className={cn("text-xs text-red-600 mt-0.5", className)}>
      {errors.map((msg, i) => (
        <p key={i}>{msg}</p>
      ))}
    </div>
  )
}

interface FieldHintProps {
  children: React.ReactNode
  className?: string
}

export function FieldHint({ children, className }: FieldHintProps) {
  return (
    <p className={cn("text-[11px] text-muted-foreground mt-0.5", className)}>
      {children}
    </p>
  )
}

interface FormErrorProps {
  error?: string
  className?: string
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null
  return (
    <div className={cn("rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2", className)}>
      <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  )
}
