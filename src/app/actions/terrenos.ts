"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { EstadoTerreno } from "@prisma/client"

export interface TerrenoInput {
  identificador: string
  descripcion?: string
  precioLista: number
  estado: EstadoTerreno
  coordenadaX: number
  coordenadaY: number
  superficie?: number
  frente?: number
  fondo?: number
}

export async function getTerrenos() {
  const terrenos = await prisma.terreno.findMany({
    include: {
      contratos: {
        where: { estado: { in: ["ACTIVO", "EN_MORA"] } },
        include: {
          cliente: true,
          pagos: {
            orderBy: { fechaPago: "desc" },
            take: 5,
          },
        },
      },
    },
    orderBy: { identificador: "asc" },
  })

  return terrenos.map((terreno) => {
    const contratoActivo = terreno.contratos[0] || null
    return {
      ...terreno,
      precioLista: terreno.precioLista.toString(),
      clienteActual: contratoActivo?.cliente || null,
      contratoActivo: contratoActivo
        ? {
            ...contratoActivo,
            precioVenta: contratoActivo.precioVenta.toString(),
            enganche: contratoActivo.enganche.toString(),
            montoMensualidad: contratoActivo.montoMensualidad.toString(),
            tasaMoraDiaria: contratoActivo.tasaMoraDiaria.toString(),
          }
        : null,
    }
  })
}

export async function getTerrenoById(id: string) {
  const terreno = await prisma.terreno.findUnique({
    where: { id },
    include: {
      contratos: {
        include: {
          cliente: true,
          pagos: {
            orderBy: { fechaPago: "desc" },
          },
        },
      },
    },
  })

  if (!terreno) return null

  return {
    ...terreno,
    precioLista: terreno.precioLista.toString(),
  }
}

export async function createTerreno(data: TerrenoInput) {
  try {
    const terreno = await prisma.terreno.create({
      data: {
        identificador: data.identificador,
        descripcion: data.descripcion,
        precioLista: data.precioLista,
        estado: data.estado,
        coordenadaX: data.coordenadaX,
        coordenadaY: data.coordenadaY,
        superficie: data.superficie,
        frente: data.frente,
        fondo: data.fondo,
      },
    })

    revalidatePath("/")
    revalidatePath("/terrenos")

    return { success: true, data: terreno }
  } catch (error) {
    console.error("Error creating terreno:", error)
    return { success: false, error: "Error al crear el terreno" }
  }
}

export async function updateTerreno(id: string, data: Partial<TerrenoInput>) {
  try {
    const terreno = await prisma.terreno.update({
      where: { id },
      data: {
        ...data,
        precioLista: data.precioLista,
      },
    })

    revalidatePath("/")
    revalidatePath("/terrenos")
    revalidatePath(`/terrenos/${id}`)

    return { success: true, data: terreno }
  } catch (error) {
    console.error("Error updating terreno:", error)
    return { success: false, error: "Error al actualizar el terreno" }
  }
}

export async function deleteTerreno(id: string) {
  try {
    // Verificar que no tenga contratos activos
    const contratos = await prisma.contrato.count({
      where: { terrenoId: id, estado: { in: ["ACTIVO", "EN_MORA"] } },
    })

    if (contratos > 0) {
      return { success: false, error: "No se puede eliminar un terreno con contratos activos" }
    }

    await prisma.terreno.delete({ where: { id } })

    revalidatePath("/")
    revalidatePath("/terrenos")

    return { success: true }
  } catch (error) {
    console.error("Error deleting terreno:", error)
    return { success: false, error: "Error al eliminar el terreno" }
  }
}
