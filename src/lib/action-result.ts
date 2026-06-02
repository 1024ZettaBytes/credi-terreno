import { z } from "zod"

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

export function failFromZod(err: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form"
    if (!fieldErrors[key]) fieldErrors[key] = []
    fieldErrors[key].push(issue.message)
  }
  return { ok: false, error: "Datos inválidos", fieldErrors }
}
