import "server-only"
import prisma from "@/lib/prisma"
import type { ClienteDTO } from "@/types"

function toDTO(c: {
  id: string
  nombre: string
  telefono: string
  domicilio: string
  email: string | null
  curp: string | null
  rfc: string | null
  expediente: string[]
  notas: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { ventas: number }
}): ClienteDTO {
  return {
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    domicilio: c.domicilio,
    email: c.email,
    curp: c.curp,
    rfc: c.rfc,
    expediente: c.expediente,
    notas: c.notas,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    ventasActivas: c._count?.ventas,
  }
}

export async function listClientes(): Promise<ClienteDTO[]> {
  const items = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { ventas: { where: { estatus: "ACTIVO" } } } } },
  })
  return items.map(toDTO)
}

export async function getCliente(id: string): Promise<ClienteDTO | null> {
  const c = await prisma.cliente.findUnique({ where: { id } })
  return c ? toDTO(c) : null
}
