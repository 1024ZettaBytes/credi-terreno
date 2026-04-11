"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Decimal } from "decimal.js"

export interface ContratoInput {
  clienteId: string
  terrenoId: string
  precioVenta: number
  enganche: number
  diaPagoMensual: number
  plazoMeses: number
  tasaMoraDiaria?: number
}

export async function getContratos() {
  const contratos = await prisma.contrato.findMany({
    include: {
      cliente: true,
      terreno: true,
      pagos: {
        orderBy: { fechaPago: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return contratos.map((contrato) => ({
    ...contrato,
    precioVenta: contrato.precioVenta.toString(),
    enganche: contrato.enganche.toString(),
    montoMensualidad: contrato.montoMensualidad.toString(),
    tasaMoraDiaria: contrato.tasaMoraDiaria.toString(),
    ultimoPago: contrato.pagos[0] || null,
  }))
}

export async function getContratoById(id: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: true,
      terreno: true,
      pagos: {
        orderBy: { fechaPago: "desc" },
      },
    },
  })

  if (!contrato) return null

  return {
    ...contrato,
    precioVenta: contrato.precioVenta.toString(),
    enganche: contrato.enganche.toString(),
    montoMensualidad: contrato.montoMensualidad.toString(),
    tasaMoraDiaria: contrato.tasaMoraDiaria.toString(),
  }
}

export async function getContratoByTerrenoId(terrenoId: string) {
  const contrato = await prisma.contrato.findFirst({
    where: {
      terrenoId,
      estado: { in: ["ACTIVO", "EN_MORA"] },
    },
    include: {
      cliente: true,
      terreno: true,
      pagos: {
        orderBy: { fechaPago: "desc" },
      },
    },
  })

  if (!contrato) return null

  return {
    ...contrato,
    precioVenta: contrato.precioVenta.toString(),
    enganche: contrato.enganche.toString(),
    montoMensualidad: contrato.montoMensualidad.toString(),
    tasaMoraDiaria: contrato.tasaMoraDiaria.toString(),
  }
}

export async function createContrato(data: ContratoInput) {
  try {
    // Verificar que el terreno esté disponible
    const terreno = await prisma.terreno.findUnique({
      where: { id: data.terrenoId },
    })

    if (!terreno) {
      return { success: false, error: "Terreno no encontrado" }
    }

    if (terreno.estado !== "DISPONIBLE") {
      return { success: false, error: "El terreno no está disponible" }
    }

    // Calcular mensualidad
    const saldoFinanciar = new Decimal(data.precioVenta).minus(data.enganche)
    const montoMensualidad = saldoFinanciar.dividedBy(data.plazoMeses).toDecimalPlaces(2)

    // Crear contrato en transacción
    const contrato = await prisma.$transaction(async (tx) => {
      // Crear contrato
      const nuevoContrato = await tx.contrato.create({
        data: {
          clienteId: data.clienteId,
          terrenoId: data.terrenoId,
          precioVenta: data.precioVenta,
          enganche: data.enganche,
          diaPagoMensual: data.diaPagoMensual,
          plazoMeses: data.plazoMeses,
          montoMensualidad: montoMensualidad.toNumber(),
          tasaMoraDiaria: data.tasaMoraDiaria || 0.005,
          estado: "ACTIVO",
        },
      })

      // Actualizar estado del terreno
      await tx.terreno.update({
        where: { id: data.terrenoId },
        data: { estado: "VENDIDO" },
      })

      return nuevoContrato
    })

    revalidatePath("/")
    revalidatePath("/terrenos")
    revalidatePath("/contratos")

    return { success: true, data: contrato }
  } catch (error: any) {
    console.error("Error creating contrato:", error)
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe un contrato para este cliente y terreno" }
    }
    return { success: false, error: "Error al crear el contrato" }
  }
}

export async function cancelarContrato(id: string) {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: { terreno: true },
    })

    if (!contrato) {
      return { success: false, error: "Contrato no encontrado" }
    }

    await prisma.$transaction(async (tx) => {
      // Cancelar contrato
      await tx.contrato.update({
        where: { id },
        data: {
          estado: "CANCELADO",
          fechaFin: new Date(),
        },
      })

      // Liberar terreno
      await tx.terreno.update({
        where: { id: contrato.terrenoId },
        data: { estado: "DISPONIBLE" },
      })
    })

    revalidatePath("/")
    revalidatePath("/terrenos")
    revalidatePath("/contratos")
    revalidatePath(`/contratos/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error canceling contrato:", error)
    return { success: false, error: "Error al cancelar el contrato" }
  }
}

export async function liquidarContrato(id: string) {
  try {
    await prisma.contrato.update({
      where: { id },
      data: {
        estado: "LIQUIDADO",
        fechaFin: new Date(),
      },
    })

    revalidatePath("/")
    revalidatePath("/contratos")
    revalidatePath(`/contratos/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error liquidating contrato:", error)
    return { success: false, error: "Error al liquidar el contrato" }
  }
}
