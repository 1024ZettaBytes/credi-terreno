import { z } from "zod"
import { parseLocalDate } from "@/lib/date"

const dateOnlySchema = z
  .union([z.date(), z.string()])
  .transform((val) => parseLocalDate(val))

export const ajustarPrimerPagoSchema = z.object({
  ventaId: z.string().min(1, "Venta requerida"),
  fechaPrimerPago: dateOnlySchema,
})
export type AjustarPrimerPagoInput = z.infer<typeof ajustarPrimerPagoSchema>
