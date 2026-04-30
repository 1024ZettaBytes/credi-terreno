"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { Decimal, toDecimal } from "@/lib/money"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireAdmin, requireUser } from "@/lib/rbac"
import { uploadFile } from "@/lib/storage"
import {
  calcularEstadoCuenta,
  fechaVencimientoMensualidad,
} from "@/lib/finance"
import { registrarPagoSchema } from "./schemas"

/**
 * Registra un pago manual. Si el pago llega después del `diaPago`, calcula y
 * registra automáticamente el interés moratorio según `interesMoratorioPorcentaje`
 * de la venta (un cargo MORATORIO adicional).
 */
export async function registerPayment(
  input: unknown,
): Promise<ActionResult<{ pagoId: string; moraPagoId: string | null; diasMora: number; montoMora: string }>> {
  const user = await requireUser()
  const parsed = registrarPagoSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const data = parsed.data

  const venta = await prisma.venta.findUnique({
    where: { id: data.ventaId },
    include: { pagos: true },
  })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo se aceptan pagos en ventas ACTIVAS")

  const monto = toDecimal(data.monto)
  const tasaMora = toDecimal(venta.interesMoratorioPorcentaje).dividedBy(100)

  // Determinar fecha del periodo: si no viene mes/año, usar la siguiente mensualidad pendiente
  let periodoMes = data.periodoMes ?? null
  let periodoAnio = data.periodoAnio ?? null
  let fechaPeriodo: Date | null = null
  let diasMora = 0
  let montoMora = new Decimal(0)
  let aplicaMora = false

  if (data.tipo === "MENSUALIDAD") {
    if (!periodoMes || !periodoAnio) {
      // próximo periodo no cubierto
      const cubiertos = new Set(
        venta.pagos
          .filter((p) => p.tipo === "MENSUALIDAD" && p.periodoMes && p.periodoAnio)
          .map((p) => `${p.periodoAnio}-${p.periodoMes}`),
      )
      for (let n = 1; n <= venta.plazoMeses; n++) {
        const venc = fechaVencimientoMensualidad(venta.fechaVenta, venta.diaPago, n)
        const k = `${venc.getFullYear()}-${venc.getMonth() + 1}`
        if (!cubiertos.has(k)) {
          periodoMes = venc.getMonth() + 1
          periodoAnio = venc.getFullYear()
          fechaPeriodo = venc
          break
        }
      }
    } else {
      // construir fechaPeriodo desde mes/año + diaPago
      fechaPeriodo = new Date(periodoAnio, periodoMes - 1, venta.diaPago)
    }

    if (fechaPeriodo && data.fechaRegistro > fechaPeriodo) {
      diasMora = Math.floor(
        (data.fechaRegistro.getTime() - fechaPeriodo.getTime()) / 86_400_000,
      )
      if (diasMora > 0 && data.cobrarMoraAutomatica) {
        const mesesAtraso = Math.ceil(diasMora / 30) || 1
        montoMora = toDecimal(venta.mensualidadBase)
          .times(tasaMora)
          .times(mesesAtraso)
          .toDecimalPlaces(2)
        aplicaMora = montoMora.greaterThan(0)
      }
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pago = await tx.pago.create({
        data: {
          ventaId: data.ventaId,
          monto: monto.toFixed(2),
          fechaRegistro: data.fechaRegistro,
          fechaPeriodo,
          tipo: data.tipo,
          periodoMes,
          periodoAnio,
          diasMora: diasMora || null,
          comprobanteUrl: data.comprobanteUrl || null,
          notas: data.notas || null,
          registradoPorId: user.id,
        },
      })

      let moraPago = null
      if (aplicaMora) {
        moraPago = await tx.pago.create({
          data: {
            ventaId: data.ventaId,
            monto: montoMora.toFixed(2),
            fechaRegistro: data.fechaRegistro,
            fechaPeriodo,
            tipo: "MORATORIO",
            periodoMes,
            periodoAnio,
            diasMora,
            notas: `Cargo moratorio automático (${diasMora} días de atraso)`,
            registradoPorId: user.id,
          },
        })
      }

      // Si fue LIQUIDACION o queda en cero el saldo, marcar venta liquidada
      if (data.tipo === "LIQUIDACION") {
        await tx.venta.update({
          where: { id: data.ventaId },
          data: { estatus: "LIQUIDADO", fechaCierre: data.fechaRegistro },
        })
      }
      return { pago, moraPago }
    })

    revalidatePath("/pagos")
    revalidatePath(`/ventas/${data.ventaId}`)
    revalidatePath("/")
    return ok({
      pagoId: result.pago.id,
      moraPagoId: result.moraPago?.id ?? null,
      diasMora,
      montoMora: montoMora.toFixed(2),
    })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al registrar pago")
  }
}

/**
 * Sube un comprobante (imagen del voucher) y devuelve la URL para guardarse en el pago.
 * Dummy storage por ahora.
 */
export async function uploadComprobante(
  ventaId: string,
  file: File,
): Promise<ActionResult<{ url: string }>> {
  await requireUser()
  if (!file || file.size === 0) return fail("Archivo inválido")
  const r = await uploadFile(file, { folder: "comprobantes", prefix: ventaId })
  return ok({ url: r.url })
}

export async function deletePago(pagoId: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const pago = await prisma.pago.findUnique({ where: { id: pagoId } })
  if (!pago) return fail("Pago no encontrado")
  await prisma.pago.delete({ where: { id: pagoId } })
  revalidatePath("/pagos")
  revalidatePath(`/ventas/${pago.ventaId}`)
  return ok(null)
}

export async function previewMora(
  ventaId: string,
  fechaRegistro: Date,
  periodoMes?: number | null,
  periodoAnio?: number | null,
): Promise<{ diasMora: number; montoMora: string } | null> {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { pagos: true },
  })
  if (!venta) return null
  let fechaPeriodo: Date | null = null
  if (periodoMes && periodoAnio) {
    fechaPeriodo = new Date(periodoAnio, periodoMes - 1, venta.diaPago)
  } else {
    const cubiertos = new Set(
      venta.pagos
        .filter((p) => p.tipo === "MENSUALIDAD" && p.periodoMes && p.periodoAnio)
        .map((p) => `${p.periodoAnio}-${p.periodoMes}`),
    )
    for (let n = 1; n <= venta.plazoMeses; n++) {
      const venc = fechaVencimientoMensualidad(venta.fechaVenta, venta.diaPago, n)
      const k = `${venc.getFullYear()}-${venc.getMonth() + 1}`
      if (!cubiertos.has(k)) {
        fechaPeriodo = venc
        break
      }
    }
  }
  if (!fechaPeriodo || fechaRegistro <= fechaPeriodo) {
    return { diasMora: 0, montoMora: "0.00" }
  }
  const diasMora = Math.floor(
    (fechaRegistro.getTime() - fechaPeriodo.getTime()) / 86_400_000,
  )
  const mesesAtraso = Math.ceil(diasMora / 30) || 1
  const monto = toDecimal(venta.mensualidadBase)
    .times(toDecimal(venta.interesMoratorioPorcentaje).dividedBy(100))
    .times(mesesAtraso)
    .toDecimalPlaces(2)
  return { diasMora, montoMora: monto.toFixed(2) }
}

// Re-export del helper de cálculo para conveniencia
export async function getEstadoCuenta(ventaId: string) {
  const v = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { pagos: true },
  })
  if (!v) return null
  return calcularEstadoCuenta({
    fechaVenta: v.fechaVenta,
    diaPago: v.diaPago,
    plazoMeses: v.plazoMeses,
    mensualidadBase: v.mensualidadBase,
    enganche: v.enganche,
    precioTotal: v.precioTotal,
    interesMoratorioPorcentaje: v.interesMoratorioPorcentaje,
    pagos: v.pagos.map((p) => ({
      monto: p.monto,
      tipo: p.tipo,
      fechaRegistro: p.fechaRegistro,
      periodoMes: p.periodoMes,
      periodoAnio: p.periodoAnio,
    })),
  })
}
