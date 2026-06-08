"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { Decimal, toDecimal } from "@/lib/money"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireAdmin, requireCaptura } from "@/lib/rbac"
import { calcularComision, calcularMensualidadBase, calcularPrecioVenta, fechaVencimientoMensualidad } from "@/lib/finance"
import { parseLocalDate } from "@/lib/date"
import { ventaSchema, traspasoSchema, recuperacionSchema } from "./schemas"

function toFriendlyDbError(e: unknown, fallback: string): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2003") {
      return "No se pudo guardar por una referencia inválida. Cierra sesión y vuelve a iniciar, luego intenta de nuevo."
    }
    if (e.code === "P2025") {
      return "No se encontró uno de los registros relacionados."
    }
  }
  return e instanceof Error ? e.message : fallback
}

export async function createVenta(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireCaptura()
  const userExists = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  })
  const actorUserId = userExists?.id ?? null
  const parsed = ventaSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const data = parsed.data

  const lote = await prisma.lote.findUnique({ where: { id: data.loteId } })
  if (!lote) return fail("Lote no encontrado")
  if (lote.estatus !== "DISPONIBLE" && lote.estatus !== "RECUPERADO") {
    return fail(`Lote no está disponible (estatus: ${lote.estatus})`)
  }

  const enganche = toDecimal(data.enganche)
  // Modalidad "Sin enganche": enganche = 0 ⇒ se recarga el precio del lote.
  const precioTotal = calcularPrecioVenta(lote.totalPrecio, enganche)
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

  const proximaFechaPago = fechaVencimientoMensualidad(data.fechaVenta, data.diaPago, 1)
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
          proximaFechaPago,
          saldoMensualidadActual: mensualidad.toFixed(2),
          numeroMensualidadActual: 1,
          saldoCapital: montoFinanciado.toFixed(2),
          comisionPorcentaje: comisionPorcentaje.toFixed(2),
          comisionMonto: comisionMonto.toFixed(2),
          notas: data.notas || null,
          createdById: actorUserId,
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
            registradoPorId: actorUserId,
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
    return fail(toFriendlyDbError(e, "Error al crear venta"))
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
      data: { estatus: "CANCELADO", fechaCierre: parseLocalDate(new Date()) },
    }),
    prisma.lote.update({ where: { id: venta.loteId }, data: { estatus: "DISPONIBLE" } }),
  ])
  revalidatePath("/ventas")
  revalidatePath("/inventario")
  return ok(null)
}

export async function liquidarVenta(ventaId: string): Promise<ActionResult<null>> {
  await requireCaptura()
  const venta = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo ventas activas pueden liquidarse")
  await prisma.venta.update({
    where: { id: ventaId },
    data: { estatus: "LIQUIDADO", fechaCierre: parseLocalDate(new Date()) },
  })
  revalidatePath("/ventas")
  return ok(null)
}

/**
 * Traspaso: cambia el cliente de la venta activa y registra la transacción en `traspasos`.
 */
export async function createTraspaso(input: unknown): Promise<ActionResult<{ traspasoId: string }>> {
  const user = await requireAdmin()
  const userExists = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  })
  const actorUserId = userExists?.id ?? null
  const parsed = traspasoSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const data = parsed.data

  const ventaOriginal = await prisma.venta.findUnique({
    where: { id: data.ventaOriginalId },
  })
  if (!ventaOriginal) return fail("Venta no encontrada")
  if (ventaOriginal.estatus !== "ACTIVO") return fail("Solo se traspasan ventas activas")
  if (ventaOriginal.clienteId === data.clienteNuevoId) return fail("El cliente nuevo es el mismo")

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cambiar el cliente en la venta existente
      await tx.venta.update({
        where: { id: ventaOriginal.id },
        data: { clienteId: data.clienteNuevoId },
      })
      // 2. Registrar traspaso
      const traspaso = await tx.traspaso.create({
        data: {
          ventaOriginalId: ventaOriginal.id,
          ventaNuevaId: ventaOriginal.id,
          clienteAnteriorId: ventaOriginal.clienteId,
          clienteNuevoId: data.clienteNuevoId,
          fechaTraspaso: parseLocalDate(new Date()),
          costoTraspaso: "0",
          notas: data.notas || null,
          createdById: actorUserId,
        },
      })
      return { traspaso }
    })
    revalidatePath("/ventas")
    revalidatePath("/traspasos")
    revalidatePath("/inventario")
    return ok({ traspasoId: result.traspaso.id })
  } catch (e) {
    return fail(toFriendlyDbError(e, "Error al crear traspaso"))
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
        data: { estatus: "CANCELADO", fechaCierre: parseLocalDate(new Date()) },
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

/**
 * Actualizar la fecha de venta de un crédito activo.
 * Esto recalcula la próxima fecha de pago y actualiza la fecha del pago de enganche.
 */
export async function updateDiaPago(ventaId: string, nuevoDiaPago: number): Promise<ActionResult<null>> {
  await requireCaptura()

  if (!Number.isInteger(nuevoDiaPago) || nuevoDiaPago < 1 || nuevoDiaPago > 31) {
    return fail("El día de pago debe ser un número entre 1 y 31.")
  }

  const venta = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo se puede modificar ventas activas")

  const nuevaProximaFechaPago = fechaVencimientoMensualidad(venta.fechaVenta, nuevoDiaPago, venta.numeroMensualidadActual)

  await prisma.venta.update({
    where: { id: ventaId },
    data: {
      diaPago: nuevoDiaPago,
      proximaFechaPago: nuevaProximaFechaPago,
    },
  })

  revalidatePath("/ventas")
  revalidatePath(`/ventas/${ventaId}`)
  return ok(null)
}

export async function updateFechaVenta(ventaId: string, fechaVentaStr: string): Promise<ActionResult<null>> {
  await requireCaptura()

  if (!fechaVentaStr || !/^\d{4}-\d{2}-\d{2}$/.test(fechaVentaStr)) {
    return fail("Fecha inválida. Usa el formato AAAA-MM-DD.")
  }

  const fechaVenta = parseLocalDate(fechaVentaStr)

  const venta = await prisma.venta.findUnique({ where: { id: ventaId } })
  if (!venta) return fail("Venta no encontrada")
  if (venta.estatus !== "ACTIVO") return fail("Solo se puede modificar la fecha de ventas activas")

  const nuevaProximaFechaPago = fechaVencimientoMensualidad(fechaVenta, venta.diaPago, venta.numeroMensualidadActual)

  await prisma.$transaction([
    prisma.venta.update({
      where: { id: ventaId },
      data: {
        fechaVenta,
        proximaFechaPago: nuevaProximaFechaPago,
      },
    }),
    // Actualizar la fecha del pago de enganche para que coincida
    prisma.pago.updateMany({
      where: { ventaId, tipo: "ENGANCHE" },
      data: { fechaRegistro: fechaVenta },
    }),
  ])

  revalidatePath("/ventas")
  revalidatePath(`/ventas/${ventaId}`)
  return ok(null)
}
