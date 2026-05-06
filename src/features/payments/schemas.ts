import { z } from "zod"
import { parseLocalDate } from "@/lib/date"

export const TipoPagoEnum = z.enum([
  "ENGANCHE",
  "MENSUALIDAD",
  "ABONO_CAPITAL",
  "MORATORIO",
  "LIQUIDACION",
])

const dateOnlySchema = z
  .union([z.date(), z.string()])
  .transform((val) => parseLocalDate(val))

export const registrarPagoSchema = z.object({
  ventaId: z.string().min(1),
  monto: z.coerce.number().positive("Monto debe ser > 0"),
  fechaRegistro: dateOnlySchema.default(() => parseLocalDate(new Date())),
  tipo: TipoPagoEnum.default("MENSUALIDAD"),
  comprobanteUrl: z.string().optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
  /** Si true, se calcula automáticamente el cargo moratorio cuando aplica */
  cobrarMoraAutomatica: z.coerce.boolean().default(true),
})
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>
