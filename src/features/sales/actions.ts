"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { Decimal, toDecimal } from "@/lib/money"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireAdmin, requireUser } from "@/lib/rbac"
import { calcularComision, calcularMensualidadBase } from "@/lib/finance"
import { ventaSchema, traspasoSchema, recuperacionSchema } from "./schemas"

export async function createVenta(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = ventaSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const data = parsed.data

  const lote = await prisma.lote.findUnique({ where: { id: data.loteId } })
  if (!lote) return fail("Lote no encontrado")
  if (lote.estatus !== "DISPONIBLE" && lote.estatus !== "RECUPERADO") {
    return fail(`Lote no está disponible (estatus: ${lote.estatus})`)
  }

  const precioTotal = toDecimal(lote.totalPrecio)
  const enganche = toDecimal(data.enganche)
  if (enganche.greaterThan(precioTotal)) return fail("Enganche no puede superar el precio total")

  const montoFinanciado = precioTotal.minus(enganche)
  const mensualidad = calcularMensualidadBase(precioTotal, enganche, data.plazoMeses)

  let comisionPorcentaje = new Decimal(0)
  let comisionMonto = new Decimal(0)
  if (data.vendedorId) {
    const vendedor = await prisma.vendedor.findUnique({ where: { id: data.vendedorId } })
    if (!vendedor) return fail("Vendedor no encontrado")
    comisionPorcentaje = toDecimal(vendedor.comisionPorcentaje)
    comisionMonto = calcularComision(precioTotal, comisionPorcentaje)
  }

  try {
    const venta = await prisma.$transaction(async (tx) => {
      const v = await tx.venta.create({
        data: {
          loteId: data.loteId,
          clienteId: data.clienteId,
          vendedorId: data.vendedorId || null,
          fechaVenta: data.fechaVenta,
          precioTotal: precioTotal.toFixed(2),
          enganche: enganche.toFixed(2),
          montoFinanciado: montoFinanciado.toFixed(2),
          mensualidadBase: mensualidad.toFixed(2),
          plazoMeses: data.plazoMeses,
          diaPago: data.diaPago,
          interesMoratorioPorcentaje: new Decimal(data.interesMoratorioPorcentaje).toFixed(2),
          comisionPorcentaje: comisionPorcentaje.toFixed(2),
          comisionMonto: comisionMonto.toFixed(2),
          notas: data.notas || null,
          createdById: user.id,
        },
      })
      // Si hay enganche, registrarlo como pago
      if (enganche.greaterThan(0)) {
        await tx.pago.create({
          data: {
            ventaId: v.id,
            monto: enganche.toFixed(2),
            tipo: "ENGANCHE",
            fechaRegistro: data.fechaVenta,
            registradoPorId: user.id,
          },
        })
      }
      await tx.lote.update({
        where: { id: data.loteId },
        data: { estatus: "VENDIDO" },
      })
      return v
    })
    revalidatePath("/ventas")
    revalidatePath("/inventario")
    revalidatePath("/")
    return ok({ id: venta.id })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear venta")
  }
}

export async function cancelarVenta(ventaId: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo se pueden cancelar ventas activas")
  await prisma.$transaction([
    prisma.venta.update({
      where: { id: ventaId },
      data: { estatus: "CANCELADO", fechaCierre: new Date() },
    }),
    prisma.lote.update({ where: { id: venta.loteId }, data: { estatus: "DISPONIBLE" } }),
  ])
  revalidatePath("/ventas")
  revalidatePath("/inventario")
  return ok(null)
}

export async function liquidarVenta(ventaId: string): Promise<ActionResult<null>> {
  await requireUser()
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo ventas activas pueden liquidarse")
  await prisma.venta.update({
    where: { id: ventaId },
    data: { estatus: "LIQUIDADO", fechaCierre: new Date() },
  })
  revalidatePath("/ventas")
  return ok(null)
}

/**
 * Traspaso: marca la venta original como TRASPASADO, crea una nueva venta para el cliente nuevo
 * sobre el mismo lote y registra la transacción en `traspasos`.
 */
export async function createTraspaso(input: unknown): Promise<ActionResult<{ ventaNuevaId: string; traspasoId: string }>> {
  const user = await requireAdmin()
  const parsed = traspasoSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const data = parsed.data

  const ventaOriginal = await prisma.venta.findUnique({
    where: { id: data.ventaOriginalId },
    include: { lote: true },
  })
  if (!ventaOriginal) return fail("Venta original no encontrada")
  if (ventaOriginal.estatus !== "ACTIVO") return fail("Solo se traspasan ventas activas")
  if (ventaOriginal.clienteId === data.clienteNuevoId) return fail("El cliente nuevo es el mismo")

  const precioTotal = toDecimal(ventaOriginal.lote.totalPrecio)
  const enganche = toDecimal(data.enganche)
  const montoFinanciado = precioTotal.minus(enganche)
  const mensualidad = calcularMensualidadBase(precioTotal, enganche, data.plazoMeses)

  let comisionPorcentaje = new Decimal(0)
  let comisionMonto = new Decimal(0)
  if (data.vendedorId) {
    const vendedor = await prisma.vendedor.findUnique({ where: { id: data.vendedorId } })
    if (vendedor) {
      comisionPorcentaje = toDecimal(vendedor.comisionPorcentaje)
      comisionMonto = calcularComision(precioTotal, comisionPorcentaje)
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cerrar venta original
      await tx.venta.update({
        where: { id: ventaOriginal.id },
        data: { estatus: "TRASPASADO", fechaCierre: data.fechaTraspaso },
      })
      // 2. Marcar lote como TRASPASADO temporalmente, luego pasará a VENDIDO con la nueva venta
      // 3. Crear nueva venta
      const ventaNueva = await tx.venta.create({
        data: {
          loteId: ventaOriginal.loteId,
          clienteId: data.clienteNuevoId,
          vendedorId: data.vendedorId || null,
          fechaVenta: data.fechaTraspaso,
          precioTotal: precioTotal.toFixed(2),
          enganche: enganche.toFixed(2),
          montoFinanciado: montoFinanciado.toFixed(2),
          mensualidadBase: mensualidad.toFixed(2),
          plazoMeses: data.plazoMeses,
          diaPago: data.diaPago,
          interesMoratorioPorcentaje: new Decimal(data.interesMoratorioPorcentaje).toFixed(2),
          comisionPorcentaje: comisionPorcentaje.toFixed(2),
          comisionMonto: comisionMonto.toFixed(2),
          notas: data.notas || `Traspaso desde venta ${ventaOriginal.id}`,
          createdById: user.id,
        },
      })
      if (enganche.greaterThan(0)) {
        await tx.pago.create({
          data: {
            ventaId: ventaNueva.id,
            monto: enganche.toFixed(2),
            tipo: "ENGANCHE",
            fechaRegistro: data.fechaTraspaso,
            registradoPorId: user.id,
          },
        })
      }
      // 4. Registrar traspaso
      const traspaso = await tx.traspaso.create({
        data: {
          ventaOriginalId: ventaOriginal.id,
          ventaNuevaId: ventaNueva.id,
          clienteAnteriorId: ventaOriginal.clienteId,
          clienteNuevoId: data.clienteNuevoId,
          fechaTraspaso: data.fechaTraspaso,
          costoTraspaso: new Decimal(data.costoTraspaso).toFixed(2),
          notas: data.notas || null,
          createdById: user.id,
        },
      })
      // 5. Lote queda VENDIDO bajo el nuevo titular
      await tx.lote.update({
        where: { id: ventaOriginal.loteId },
        data: { estatus: "VENDIDO" },
      })
      return { ventaNueva, traspaso }
    })
    revalidatePath("/ventas")
    revalidatePath("/traspasos")
    revalidatePath("/inventario")
    return ok({ ventaNuevaId: result.ventaNueva.id, traspasoId: result.traspaso.id })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear traspaso")
  }
}

/**
 * Recuperación: rescinde el contrato. Marca venta como CANCELADO, lote a RECUPERADO,
 * y registra la devolución en la tabla `recuperaciones`.
 */
export async function recuperarLote(input: unknown): Promise<ActionResult<{ id: string; montoDevolucion: string }>> {
  await requireAdmin()
  const parsed = recuperacionSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const { ventaId, porcentajeDevolucion, motivo } = parsed.data

  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { pagos: true },
  })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo se recuperan ventas activas")

  // Total pagado por el cliente (capital + enganche) — excluye mora
  const totalPagado = venta.pagos
    .filter((p) => p.tipo !== "MORATORIO")
    .reduce((acc, p) => acc.plus(toDecimal(p.monto)), new Decimal(0))

  const montoDevolucion = totalPagado
    .times(new Decimal(porcentajeDevolucion).dividedBy(100))
    .toDecimalPlaces(2)

  try {
    const rec = await prisma.$transaction(async (tx) => {
      await tx.venta.update({
        where: { id: ventaId },
        data: { estatus: "CANCELADO", fechaCierre: new Date() },
      })
      await tx.lote.update({
        where: { id: venta.loteId },
        data: { estatus: "RECUPERADO" },
      })
      return tx.recuperacion.create({
        data: {
          ventaId,
          totalPagadoCliente: totalPagado.toFixed(2),
          porcentajeDevolucion: new Decimal(porcentajeDevolucion).toFixed(2),
          montoDevolucion: montoDevolucion.toFixed(2),
          motivo: motivo || null,
        },
      })
    })
    revalidatePath("/ventas")
    revalidatePath("/inventario")
    revalidatePath("/recuperaciones")
    return ok({ id: rec.id, montoDevolucion: montoDevolucion.toFixed(2) })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al recuperar lote")
  }
}

/**
 * Reactivar lote recuperado: cambia el estatus de RECUPERADO -> DISPONIBLE
 * para volver a ponerlo a la venta.
 */
export async function reactivarLote(loteId: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const lote = await prisma.lote.findUnique({ where: { id: loteId } })
  if (!lote) return fail("Lote no encontrado")
  if (lote.estatus !== "RECUPERADO") return fail("Solo lotes RECUPERADOS pueden reactivarse")
  await prisma.lote.update({ where: { id: loteId }, data: { estatus: "DISPONIBLE" } })
  revalidatePath("/inventario")
  return ok(null)
}
