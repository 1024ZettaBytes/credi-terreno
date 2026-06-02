import { z } from "zod"
import { parseLocalDate } from "@/lib/date"

const dateOnlySchema = z
  .union([z.date(), z.string()])
  .transform((val) => parseLocalDate(val))

export const ventaSchema = z.object({
  loteId: z.string().min(1, "Lote requerido"),
  clienteId: z.string().min(1, "Cliente requerido"),
  vendedorId: z.string().optional().nullable(),
  fechaVenta: dateOnlySchema.default(() => parseLocalDate(new Date())),
  enganche: z.coerce.number().min(0, "Enganche debe ser ≥ 0"),
  plazoMeses: z.coerce.number().int().min(1, "Plazo mínimo 1 mes").max(360, "Plazo máximo 360 meses"),
  diaPago: z.coerce.number().int().min(1, "Día mínimo es 1").max(31, "Día máximo es 31"),
  interesMoratorioPorcentaje: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%").default(5),
  notas: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
})
export type VentaInput = z.infer<typeof ventaSchema>

export const traspasoSchema = z.object({
  ventaOriginalId: z.string().min(1),
  clienteNuevoId: z.string().min(1, "Cliente nuevo requerido"),
  notas: z.string().max(1000).optional().nullable(),
})
export type TraspasoInput = z.infer<typeof traspasoSchema>

export const recuperacionSchema = z.object({
  ventaId: z.string().min(1),
  porcentajeDevolucion: z.coerce.number().min(0).max(100),
  motivo: z.string().max(1000).optional().nullable(),
})
export type RecuperacionInput = z.infer<typeof recuperacionSchema>
