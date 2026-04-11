"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { TipoPago, MetodoPago } from "@prisma/client"

export interface PagoInput {
  contratoId: string
  monto: number
  fechaPago?: Date
  tipo: TipoPago
  numeroPago?: number
  periodoMes?: number
  periodoAnio?: number
  diasMora?: number
  metodoPago?: MetodoPago
  referencia?: string
  notas?: string
}

export async function getPagos(contratoId?: string) {
  const where = contratoId ? { contratoId } : {}

  const pagos = await prisma.pago.findMany({
    where,
    include: {
      contrato: {
        include: {
          cliente: true,
          terreno: true,
        },
      },
    },
    orderBy: { fechaPago: "desc" },
  })

  return pagos.map((pago) => ({
    id: pago.id,
    contratoId: pago.contratoId,
    monto: pago.monto.toString(),
    fechaPago: pago.fechaPago.toISOString(),
    tipo: pago.tipo,
    numeroPago: pago.numeroPago,
    periodoMes: pago.periodoMes,
    periodoAnio: pago.periodoAnio,
    diasMora: pago.diasMora,
    metodoPago: pago.metodoPago,
    referencia: pago.referencia,
    comprobante: pago.comprobante,
    notas: pago.notas,
    registradoPorId: pago.registradoPorId,
    createdAt: pago.createdAt.toISOString(),
    updatedAt: pago.updatedAt.toISOString(),
    contrato: pago.contrato
      ? {
          id: pago.contrato.id,
          estado: pago.contrato.estado,
          montoMensualidad: pago.contrato.montoMensualidad.toString(),
          cliente: pago.contrato.cliente
            ? {
                id: pago.contrato.cliente.id,
                nombreCompleto: pago.contrato.cliente.nombreCompleto,
              }
            : null,
          terreno: pago.contrato.terreno
            ? {
                id: pago.contrato.terreno.id,
                identificador: pago.contrato.terreno.identificador,
              }
            : null,
        }
      : null,
  }))
}

export async function getPagoById(id: string) {
  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      contrato: {
        include: {
          cliente: true,
          terreno: true,
        },
      },
    },
  })

  if (!pago) return null

  return {
    ...pago,
    monto: pago.monto.toString(),
  }
}

export async function createPago(data: PagoInput) {
  try {
    // Verificar que el contrato existe y está activo
    const contrato = await prisma.contrato.findUnique({
      where: { id: data.contratoId },
    })

    if (!contrato) {
      return { success: false, error: "Contrato no encontrado" }
    }

    if (contrato.estado === "LIQUIDADO" || contrato.estado === "CANCELADO") {
      return { success: false, error: "El contrato ya está cerrado" }
    }

    // Obtener número de pago si es mensualidad
    let numeroPago = data.numeroPago
    if (data.tipo === "MENSUALIDAD" && !numeroPago) {
      const ultimoPago = await prisma.pago.findFirst({
        where: { contratoId: data.contratoId, tipo: "MENSUALIDAD" },
        orderBy: { numeroPago: "desc" },
      })
      numeroPago = (ultimoPago?.numeroPago || 0) + 1
    }

    const pago = await prisma.pago.create({
      data: {
        contratoId: data.contratoId,
        monto: data.monto,
        fechaPago: data.fechaPago || new Date(),
        tipo: data.tipo,
        numeroPago,
        periodoMes: data.periodoMes,
        periodoAnio: data.periodoAnio,
        diasMora: data.diasMora,
        metodoPago: data.metodoPago || "EFECTIVO",
        referencia: data.referencia,
        notas: data.notas,
      },
    })

    // Verificar si el contrato debe liquidarse
    if (data.tipo === "LIQUIDACION") {
      await prisma.contrato.update({
        where: { id: data.contratoId },
        data: {
          estado: "LIQUIDADO",
          fechaFin: new Date(),
        },
      })
    }

    revalidatePath("/")
    revalidatePath("/pagos")
    revalidatePath("/contratos")
    revalidatePath(`/contratos/${data.contratoId}`)

    return { success: true, data: pago }
  } catch (error) {
    console.error("Error creating pago:", error)
    return { success: false, error: "Error al registrar el pago" }
  }
}

export async function deletePago(id: string) {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id },
    })

    if (!pago) {
      return { success: false, error: "Pago no encontrado" }
    }

    await prisma.pago.delete({ where: { id } })

    revalidatePath("/pagos")
    revalidatePath(`/contratos/${pago.contratoId}`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting pago:", error)
    return { success: false, error: "Error al eliminar el pago" }
  }
}

export async function getResumenPagos(contratoId: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: {
      pagos: true,
    },
  })

  if (!contrato) return null

  const totalPagado = contrato.pagos.reduce(
    (sum, pago) => sum + Number(pago.monto),
    0
  )

  const totalEnganchePagado = contrato.pagos
    .filter((p) => p.tipo === "ENGANCHE")
    .reduce((sum, pago) => sum + Number(pago.monto), 0)

  const totalMensualidadesPagadas = contrato.pagos
    .filter((p) => p.tipo === "MENSUALIDAD")
    .reduce((sum, pago) => sum + Number(pago.monto), 0)

  const totalMoraPagada = contrato.pagos
    .filter((p) => p.tipo === "INTERES_MORA")
    .reduce((sum, pago) => sum + Number(pago.monto), 0)

  const mensualidadesCompletadas = contrato.pagos.filter(
    (p) => p.tipo === "MENSUALIDAD"
  ).length

  return {
    totalPagado,
    totalEnganchePagado,
    totalMensualidadesPagadas,
    totalMoraPagada,
    mensualidadesCompletadas,
    mensualidadesPendientes: contrato.plazoMeses - mensualidadesCompletadas,
    saldoPendiente: Number(contrato.precioVenta) - totalPagado,
  }
}
