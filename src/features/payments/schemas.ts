import { z } from "zod"

export const TipoPagoEnum = z.enum([
  "ENGANCHE",
  "MENSUALIDAD",
  "ABONO_CAPITAL",
  "MORATORIO",
  "LIQUIDACION",
])

export const registrarPagoSchema = z.object({
  ventaId: z.string().min(1),
  monto: z.coerce.number().positive("Monto debe ser > 0"),
  fechaRegistro: z.coerce.date().default(() => new Date()),
  tipo: TipoPagoEnum.default("MENSUALIDAD"),
  periodoMes: z.coerce.number().int().min(1).max(12).optional().nullable(),
  periodoAnio: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  comprobanteUrl: z.string().optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
  /** Si true, se calcula automáticamente el cargo moratorio cuando aplica */
  cobrarMoraAutomatica: z.coerce.boolean().default(true),
})
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>
