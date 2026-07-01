import { z } from "zod"
import { parseLocalDate } from "@/lib/date"

const dateOnlySchema = z
  .union([z.date(), z.string()])
  .transform((val) => parseLocalDate(val))

export const ventaSchema = z
  .object({
    loteId: z.string().min(1, "Lote requerido"),
    clienteId: z.string().min(1, "Cliente requerido"),
    vendedorId: z.string().optional().nullable(),
    fechaVenta: dateOnlySchema.default(() => parseLocalDate(new Date())),
    enganche: z.coerce.number().min(0, "Enganche debe ser ≥ 0"),
    modalidadPago: z.enum(["MENSUALIDADES", "FECHA_LIMITE"]).default("MENSUALIDADES"),
    // En FECHA_LIMITE el plazo no aplica; se acepta por defecto 1.
    plazoMeses: z.coerce.number().int().min(1, "Plazo mínimo 1 mes").max(360, "Plazo máximo 360 meses").default(1),
    fechaPrimerPago: dateOnlySchema.optional().nullable(),
    fechaLimitePago: dateOnlySchema.optional().nullable(),
    interesMoratorioPorcentaje: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%").default(5),
    notas: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.modalidadPago === "MENSUALIDADES") {
      if (!d.fechaPrimerPago) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaPrimerPago"], message: "Fecha del primer pago requerida" })
      } else if (d.fechaPrimerPago.getTime() < d.fechaVenta.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaPrimerPago"], message: "No puede ser anterior a la fecha de venta" })
      }
    } else {
      if (!d.fechaLimitePago) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaLimitePago"], message: "Fecha límite requerida" })
      } else if (d.fechaLimitePago.getTime() < d.fechaVenta.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaLimitePago"], message: "No puede ser anterior a la fecha de venta" })
      }
    }
  })
export type VentaInput = z.infer<typeof ventaSchema>

export const convertirFechaLimiteSchema = z.object({
  ventaId: z.string().min(1),
  fechaLimitePago: dateOnlySchema,
})
export type ConvertirFechaLimiteInput = z.infer<typeof convertirFechaLimiteSchema>

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
