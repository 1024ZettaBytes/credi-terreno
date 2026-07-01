"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { Decimal, toDecimal } from "@/lib/money"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireCaptura } from "@/lib/rbac"
import { uploadFile } from "@/lib/storage"
import {
  calcularEstadoCuenta,
  calcularMoraDiaria,
  fechaVencimientoMensualidad,
  recalcularEstadoVenta,
} from "@/lib/finance"
import { formatDateISO, parseLocalDate } from "@/lib/date"
import { registrarPagoSchema } from "./schemas"
import type { TipoPago } from "@prisma/client"

/* ============================================================
 * SIMULADOR DE DISTRIBUCIÓN — fuente única para preview y registro.
 * ============================================================ */

interface VentaSnapshot {
  id: string
  fechaVenta: Date
  diaPago: number
  fechaPrimerPago: Date
  plazoMeses: number
  mensualidadBase: Decimal
  interesMoratorioPorcentaje: Decimal
  proximaFechaPago: Date
  saldoMensualidadActual: Decimal
  numeroMensualidadActual: number
  saldoCapital: Decimal
}

export interface DistribucionItem {
  tipo: TipoPago
  monto: string
  descripcion: string
  periodoMes?: number | null
  periodoAnio?: number | null
  diasMora?: number | null
}

export interface DistribucionPago {
  diasAtraso: number
  moraDebida: string
  items: DistribucionItem[]
  totalAplicado: string
  sobrante: string
  saldoCapitalAntes: string
  saldoCapitalDespues: string
  mensualidadAntes: string
  mensualidadDespues: string
  saldoMensualidadActualDespues: string
  numeroMensualidadActualDespues: number
  proximaFechaPagoDespues: string
  liquidaCredito: boolean
}

function simularDistribucion(
  v: VentaSnapshot,
  monto: Decimal,
  fechaRegistro: Date,
  tipo: TipoPago,
  cobrarMoraAutomatica: boolean,
): DistribucionPago {
  const items: DistribucionItem[] = []
  let restante = monto
  let saldoMens = v.saldoMensualidadActual
  let numMes = v.numeroMensualidadActual
  let mensualidadBase = v.mensualidadBase
  let proximaFechaPago = v.proximaFechaPago
  let saldoCapital = v.saldoCapital

  const diasAtraso = Math.max(
    0,
    Math.floor((fechaRegistro.getTime() - proximaFechaPago.getTime()) / 86_400_000),
  )
  const moraDebida = calcularMoraDiaria(saldoMens, v.interesMoratorioPorcentaje, diasAtraso)

  const aplicarMora = () => {
    if (moraDebida.lessThanOrEqualTo(0)) return
    const aplicado = Decimal.min(restante, moraDebida)
    if (aplicado.lessThanOrEqualTo(0)) return
    items.push({
      tipo: "MORATORIO",
      monto: aplicado.toFixed(2),
      descripcion: `Cargo moratorio (${diasAtraso} días)`,
      diasMora: diasAtraso,
    })
    restante = restante.minus(aplicado)
  }

  const recalcMensualidad = () => {
    const mesesRestantes = v.plazoMeses - (numMes - 1)
    if (mesesRestantes <= 0 || saldoCapital.lessThanOrEqualTo(0)) {
      saldoMens = new Decimal(0)
      return
    }
    const pagadoEsteMes = mensualidadBase.minus(saldoMens)
    const nuevaMens = saldoCapital.dividedBy(mesesRestantes).toDecimalPlaces(2)
    mensualidadBase = nuevaMens
    saldoMens = Decimal.max(nuevaMens.minus(pagadoEsteMes), new Decimal(0))
  }

  if (tipo === "MORATORIO") {
    aplicarMora()
  } else if (tipo === "LIQUIDACION") {
    aplicarMora()
    if (restante.greaterThan(0) && saldoCapital.greaterThan(0)) {
      const liq = Decimal.min(restante, saldoCapital)
      items.push({
        tipo: "LIQUIDACION",
        monto: liq.toFixed(2),
        descripcion: "Liquidación de saldo capital",
      })
      restante = restante.minus(liq)
      saldoCapital = saldoCapital.minus(liq)
      saldoMens = new Decimal(0)
    }
  } else if (tipo === "MENSUALIDAD" || tipo === "ABONO_CAPITAL") {
    // Cascada compartida: mora → mensualidad(es) → excedente a capital.
    // ABONO_CAPITAL reusa el mismo flujo pero el excedente final se etiqueta como "Abono a capital".
    if (cobrarMoraAutomatica) aplicarMora()

    while (restante.greaterThan(0) && numMes <= v.plazoMeses && saldoCapital.greaterThan(0)) {
      const aplicado = Decimal.min(restante, saldoMens, saldoCapital)
      if (aplicado.lessThanOrEqualTo(0)) break
      const fechaVenc =
        numMes === v.numeroMensualidadActual
          ? proximaFechaPago
          : fechaVencimientoMensualidad(v.fechaPrimerPago, v.diaPago, numMes)
      items.push({
        tipo: "MENSUALIDAD",
        monto: aplicado.toFixed(2),
        descripcion: `Mensualidad #${numMes} (${formatDateISO(fechaVenc)})`,
        periodoMes: fechaVenc.getUTCMonth() + 1,
        periodoAnio: fechaVenc.getUTCFullYear(),
      })
      saldoMens = saldoMens.minus(aplicado)
      saldoCapital = saldoCapital.minus(aplicado)
      restante = restante.minus(aplicado)
      if (saldoMens.lessThanOrEqualTo(0)) {
        numMes += 1
        if (numMes <= v.plazoMeses) {
          saldoMens = mensualidadBase
          proximaFechaPago = fechaVencimientoMensualidad(v.fechaPrimerPago, v.diaPago, numMes)
        } else {
          saldoMens = new Decimal(0)
        }
      }
      // En modo ABONO_CAPITAL solo cubrimos una mensualidad; el resto va a capital.
      if (tipo === "ABONO_CAPITAL") break
    }

    if (restante.greaterThan(0) && saldoCapital.greaterThan(0)) {
      const aplicado = Decimal.min(restante, saldoCapital)
      items.push({
        tipo: "ABONO_CAPITAL",
        monto: aplicado.toFixed(2),
        descripcion: tipo === "ABONO_CAPITAL" ? "Abono a capital" : "Excedente abonado a capital",
      })
      saldoCapital = saldoCapital.minus(aplicado)
      restante = restante.minus(aplicado)
      recalcMensualidad()
    }
  }

  const totalAplicado = monto.minus(restante)
  const liquida = saldoCapital.lessThanOrEqualTo(0)

  return {
    diasAtraso,
    moraDebida: moraDebida.toFixed(2),
    items,
    totalAplicado: totalAplicado.toFixed(2),
    sobrante: restante.toFixed(2),
    saldoCapitalAntes: v.saldoCapital.toFixed(2),
    saldoCapitalDespues: Decimal.max(saldoCapital, new Decimal(0)).toFixed(2),
    mensualidadAntes: v.mensualidadBase.toFixed(2),
    mensualidadDespues: mensualidadBase.toFixed(2),
    saldoMensualidadActualDespues: saldoMens.toFixed(2),
    numeroMensualidadActualDespues: Math.min(numMes, v.plazoMeses + 1),
    proximaFechaPagoDespues: formatDateISO(proximaFechaPago),
    liquidaCredito: liquida,
  }
}

function ventaToSnapshot(v: {
  id: string
  fechaVenta: Date
  diaPago: number
  fechaPrimerPago: Date | null
  plazoMeses: number
  mensualidadBase: import("decimal.js").Decimal
  interesMoratorioPorcentaje: import("decimal.js").Decimal
  proximaFechaPago: Date
  saldoMensualidadActual: import("decimal.js").Decimal
  numeroMensualidadActual: number
  saldoCapital: import("decimal.js").Decimal
}): VentaSnapshot {
  return {
    id: v.id,
    fechaVenta: v.fechaVenta,
    diaPago: v.diaPago,
    // Fallback a fechaVenta solo para filas heredadas no rellenadas (ver backfill).
    fechaPrimerPago: v.fechaPrimerPago ?? v.fechaVenta,
    plazoMeses: v.plazoMeses,
    mensualidadBase: toDecimal(v.mensualidadBase),
    interesMoratorioPorcentaje: toDecimal(v.interesMoratorioPorcentaje),
    proximaFechaPago: v.proximaFechaPago,
    saldoMensualidadActual: toDecimal(v.saldoMensualidadActual),
    numeroMensualidadActual: v.numeroMensualidadActual,
    saldoCapital: toDecimal(v.saldoCapital),
  }
}

/* ============================================================
 * PUBLIC ACTIONS
 * ============================================================ */

export async function previewPago(
  ventaId: string,
  monto: number,
  fechaRegistro: Date,
  tipo: TipoPago,
  cobrarMoraAutomatica: boolean,
): Promise<DistribucionPago | null> {
  if (!Number.isFinite(monto) || monto <= 0) return null
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!venta || venta.estatus !== "ACTIVO") return null
  return simularDistribucion(
    ventaToSnapshot(venta),
    new Decimal(monto),
    fechaRegistro,
    tipo,
    cobrarMoraAutomatica,
  )
}

export async function registerPayment(
  input: unknown,
): Promise<ActionResult<{ distribucion: DistribucionPago }>> {
  const user = await requireCaptura()
  const parsed = registrarPagoSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const data = parsed.data

  const venta = await prisma.venta.findUnique({ where: { id: data.ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo se aceptan pagos en ventas ACTIVAS")

  const monto = toDecimal(data.monto)
  const dist = simularDistribucion(
    ventaToSnapshot(venta),
    monto,
    data.fechaRegistro,
    data.tipo,
    data.cobrarMoraAutomatica,
  )

  if (dist.items.length === 0) {
    return fail("El pago no aplica a ningún rubro")
  }
  if (Number(dist.sobrante) > 0.005) {
    return fail(`El crédito ya está cubierto. Sobran $${dist.sobrante}. Reduce el monto.`)
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of dist.items) {
        const fechaPeriodo =
          item.periodoMes && item.periodoAnio
            ? new Date(Date.UTC(item.periodoAnio, item.periodoMes - 1, venta.diaPago, 12, 0, 0))
            : null
        await tx.pago.create({
          data: {
            ventaId: data.ventaId,
            monto: item.monto,
            tipo: item.tipo,
            fechaRegistro: data.fechaRegistro,
            fechaPeriodo,
            periodoMes: item.periodoMes ?? null,
            periodoAnio: item.periodoAnio ?? null,
            diasMora: item.diasMora ?? null,
            comprobanteUrl: data.comprobanteUrl || null,
            notas: data.notas || null,
            registradoPorId: user.id,
          },
        })
      }
      await tx.venta.update({
        where: { id: data.ventaId },
        data: {
          mensualidadBase: dist.mensualidadDespues,
          saldoMensualidadActual: dist.saldoMensualidadActualDespues,
          saldoCapital: dist.saldoCapitalDespues,
          proximaFechaPago: parseLocalDate(dist.proximaFechaPagoDespues),
          numeroMensualidadActual: dist.numeroMensualidadActualDespues,
          estatus: dist.liquidaCredito ? "LIQUIDADO" : "ACTIVO",
          fechaCierre: dist.liquidaCredito ? data.fechaRegistro : null,
        },
      })
    })

    revalidatePath("/pagos")
    revalidatePath(`/ventas/${data.ventaId}`)
    revalidatePath("/")
    return ok({ distribucion: dist })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al registrar pago")
  }
}

export async function uploadComprobante(
  ventaId: string,
  file: File,
): Promise<ActionResult<{ url: string }>> {
  await requireCaptura()
  if (!file || file.size === 0) return fail("Archivo inválido")
  const r = await uploadFile(file, { folder: "comprobantes", prefix: ventaId })
  return ok({ url: r.url })
}

export async function updateFechaPago(
  pagoId: string,
  fechaStr: string,
): Promise<ActionResult<null>> {
  await requireCaptura()

  if (!fechaStr || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return fail("Fecha inválida. Usa el formato AAAA-MM-DD.")
  }

  const pago = await prisma.pago.findUnique({ where: { id: pagoId } })
  if (!pago) return fail("Pago no encontrado")

  await prisma.pago.update({
    where: { id: pagoId },
    data: { fechaRegistro: parseLocalDate(fechaStr) },
  })

  revalidatePath("/pagos")
  revalidatePath(`/ventas/${pago.ventaId}`)
  return ok(null)
}

/**
 * Elimina un pago y recomputa el estado vivo de la venta reproduciendo los
 * pagos restantes. ADMIN o CAPTURA; no aplica a ENGANCHE ni a ventas no activas.
 */
export async function deletePago(pagoId: string): Promise<ActionResult<null>> {
  await requireCaptura()
  const pago = await prisma.pago.findUnique({ where: { id: pagoId } })
  if (!pago) return fail("Pago no encontrado")
  if (pago.tipo === "ENGANCHE") {
    return fail("El enganche no se puede eliminar; cancela la venta para revertirlo.")
  }

  const venta = await prisma.venta.findUnique({ where: { id: pago.ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") {
    return fail("Solo se pueden eliminar pagos de ventas activas")
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pago.delete({ where: { id: pagoId } })
      const restantes = await tx.pago.findMany({
        where: { ventaId: venta.id },
        orderBy: [{ fechaRegistro: "asc" }, { createdAt: "asc" }],
        select: { tipo: true, monto: true },
      })
      const estado = recalcularEstadoVenta(
        {
          fechaVenta: venta.fechaVenta,
          diaPago: venta.diaPago,
          fechaPrimerPago: venta.fechaPrimerPago ?? venta.fechaVenta,
          plazoMeses: venta.plazoMeses,
          montoFinanciado: venta.montoFinanciado,
        },
        restantes,
      )
      await tx.venta.update({
        where: { id: venta.id },
        data: {
          mensualidadBase: estado.mensualidadBase.toFixed(2),
          saldoMensualidadActual: estado.saldoMensualidadActual.toFixed(2),
          saldoCapital: estado.saldoCapital.toFixed(2),
          proximaFechaPago: estado.proximaFechaPago,
          numeroMensualidadActual: estado.numeroMensualidadActual,
        },
      })
    })

    revalidatePath("/pagos")
    revalidatePath(`/ventas/${pago.ventaId}`)
    revalidatePath("/ventas")
    revalidatePath("/")
    return ok(null)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al eliminar pago")
  }
}

/** Estado de cuenta desde los campos vivos de la venta. */
export async function getEstadoCuenta(ventaId: string) {
  const v = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!v) return null
  return calcularEstadoCuenta({
    fechaVenta: v.fechaVenta,
    diaPago: v.diaPago,
    plazoMeses: v.plazoMeses,
    mensualidadBase: v.mensualidadBase,
    interesMoratorioPorcentaje: v.interesMoratorioPorcentaje,
    proximaFechaPago: v.proximaFechaPago,
    saldoMensualidadActual: v.saldoMensualidadActual,
    numeroMensualidadActual: v.numeroMensualidadActual,
    saldoCapital: v.saldoCapital,
  })
}
