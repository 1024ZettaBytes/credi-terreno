import { z } from "zod"

export const ventaSchema = z.object({
  loteId: z.string().min(1, "Lote requerido"),
  clienteId: z.string().min(1, "Cliente requerido"),
  vendedorId: z.string().optional().nullable(),
  fechaVenta: z.coerce.date().default(() => new Date()),
  enganche: z.coerce.number().min(0, "Enganche debe ser ≥ 0"),
  plazoMeses: z.coerce.number().int().min(1, "Plazo mínimo 1 mes").max(360),
  diaPago: z.coerce.number().int().min(1).max(28, "Use día 1-28 para evitar problemas"),
  interesMoratorioPorcentaje: z.coerce.number().min(0).max(100).default(5),
  notas: z.string().max(1000).optional().nullable(),
})
export type VentaInput = z.infer<typeof ventaSchema>

export const traspasoSchema = z.object({
  ventaOriginalId: z.string().min(1),
  clienteNuevoId: z.string().min(1, "Cliente nuevo requerido"),
  costoTraspaso: z.coerce.number().min(0).default(0),
  // Datos para la nueva venta (puede heredar la mayoría):
  fechaTraspaso: z.coerce.date().default(() => new Date()),
  enganche: z.coerce.number().min(0).default(0),
  plazoMeses: z.coerce.number().int().min(1).max(360),
  diaPago: z.coerce.number().int().min(1).max(28),
  interesMoratorioPorcentaje: z.coerce.number().min(0).max(100).default(5),
  vendedorId: z.string().optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
})
export type TraspasoInput = z.infer<typeof traspasoSchema>

export const recuperacionSchema = z.object({
  ventaId: z.string().min(1),
  porcentajeDevolucion: z.coerce.number().min(0).max(100),
  motivo: z.string().max(1000).optional().nullable(),
})
export type RecuperacionInput = z.infer<typeof recuperacionSchema>
