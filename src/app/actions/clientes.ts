"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export interface ClienteInput {
  nombreCompleto: string
  domicilio: string
  telefono: string
  email?: string
  curp?: string
  rfc?: string
}

export async function getClientes() {
  const clientes = await prisma.cliente.findMany({
    include: {
      contratos: {
        include: {
          terreno: true,
        },
      },
    },
    orderBy: { nombreCompleto: "asc" },
  })

  return clientes.map((cliente) => ({
    ...cliente,
    contratosActivos: cliente.contratos.filter(
      (c) => c.estado === "ACTIVO" || c.estado === "EN_MORA"
    ).length,
  }))
}

export async function getClienteById(id: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      contratos: {
        include: {
          terreno: true,
          pagos: {
            orderBy: { fechaPago: "desc" },
          },
        },
      },
    },
  })

  return cliente
}

export async function createCliente(data: ClienteInput) {
  try {
    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto: data.nombreCompleto,
        domicilio: data.domicilio,
        telefono: data.telefono,
        email: data.email || null,
        curp: data.curp || null,
        rfc: data.rfc || null,
      },
    })

    revalidatePath("/clientes")

    return { success: true, data: cliente }
  } catch (error: any) {
    console.error("Error creating cliente:", error)
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe un cliente con ese CURP" }
    }
    return { success: false, error: "Error al crear el cliente" }
  }
}

export async function updateCliente(id: string, data: Partial<ClienteInput>) {
  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data,
    })

    revalidatePath("/clientes")
    revalidatePath(`/clientes/${id}`)

    return { success: true, data: cliente }
  } catch (error: any) {
    console.error("Error updating cliente:", error)
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe un cliente con ese CURP" }
    }
    return { success: false, error: "Error al actualizar el cliente" }
  }
}

export async function deleteCliente(id: string) {
  try {
    // Verificar que no tenga contratos
    const contratos = await prisma.contrato.count({
      where: { clienteId: id },
    })

    if (contratos > 0) {
      return { success: false, error: "No se puede eliminar un cliente con contratos" }
    }

    await prisma.cliente.delete({ where: { id } })

    revalidatePath("/clientes")

    return { success: true }
  } catch (error) {
    console.error("Error deleting cliente:", error)
    return { success: false, error: "Error al eliminar el cliente" }
  }
}

export async function searchClientes(query: string) {
  const clientes = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombreCompleto: { contains: query, mode: "insensitive" } },
        { telefono: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { nombreCompleto: "asc" },
  })

  return clientes
}
