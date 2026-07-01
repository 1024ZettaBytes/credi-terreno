"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireSystem } from "@/lib/rbac"
import { anclaPrimerPagoHistorica, fechaVencimientoMensualidad } from "@/lib/finance"
import { formatDateISO } from "@/lib/date"
import { ajustarPrimerPagoSchema } from "./schemas"

/**
 * Ajusta la fecha del primer pago de una venta existente y re-estampa los pagos
 * de mensualidad ya registrados para que coincidan con el nuevo calendario.
 *
 * Cada pago de tipo MENSUALIDAD conserva su número de mensualidad (k); solo se
 * recalcula la fecha de vencimiento de esa mensualidad con la nueva ancla. El
 * número k se recupera comparando el periodo guardado contra la ancla anterior.
 */
export async function ajustarFechaPrimerPago(input: unknown): Promise<
  ActionResult<{ ajustados: number; diaPago: number; proximaFechaPago: string }>
> {
  await requireSystem()
  const parsed = ajustarPrimerPagoSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const { ventaId, fechaPrimerPago } = parsed.data

  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { pagos: true },
  })
  if (!venta) return fail("Venta no encontrada")

  const newAnchor = fechaPrimerPago
  const newDiaPago = newAnchor.getUTCDate()
  // Ancla anterior: la almacenada, o la histórica para ventas heredadas sin ella.
  const oldAnchor =
    venta.fechaPrimerPago ?? anclaPrimerPagoHistorica(venta.fechaVenta, venta.diaPago)

  const updates = []
  for (const p of venta.pagos) {
    if (p.tipo !== "MENSUALIDAD" || p.periodoMes == null || p.periodoAnio == null) continue
    // Número de mensualidad (1-based) según la ancla anterior.
    const k =
      (p.periodoAnio - oldAnchor.getUTCFullYear()) * 12 +
      (p.periodoMes - 1 - oldAnchor.getUTCMonth()) +
      1
    if (k < 1) continue
    const nuevaFecha = fechaVencimientoMensualidad(newAnchor, newDiaPago, k)
    updates.push(
      prisma.pago.update({
        where: { id: p.id },
        data: {
          fechaPeriodo: nuevaFecha,
          periodoMes: nuevaFecha.getUTCMonth() + 1,
          periodoAnio: nuevaFecha.getUTCFullYear(),
        },
      }),
    )
  }

  const nuevaProximaFechaPago = fechaVencimientoMensualidad(
    newAnchor,
    newDiaPago,
    venta.numeroMensualidadActual,
  )

  try {
    await prisma.$transaction([
      prisma.venta.update({
        where: { id: ventaId },
        data: {
          fechaPrimerPago: newAnchor,
          diaPago: newDiaPago,
          proximaFechaPago: nuevaProximaFechaPago,
        },
      }),
      ...updates,
    ])
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al ajustar la venta")
  }

  revalidatePath("/desarrollador")
  revalidatePath(`/ventas/${ventaId}`)
  revalidatePath("/ventas")
  revalidatePath("/pagos")
  revalidatePath("/")
  return ok({
    ajustados: updates.length,
    diaPago: newDiaPago,
    proximaFechaPago: formatDateISO(nuevaProximaFechaPago),
  })
}
