import "server-only"
import prisma from "@/lib/prisma"
import { serialize } from "@/lib/serialize"
import type { ManzanaDTO, LoteDTO, ManzanaDetalleDTO } from "@/types"

export async function listManzanas(): Promise<ManzanaDTO[]> {
  const items = await prisma.manzana.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { lotes: true } } },
  })
  return items.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    totalLotes: m._count.lotes,
  }))
}

export async function listLotes(filtros?: { manzanaId?: string; estatus?: import("@prisma/client").EstatusLote }): Promise<LoteDTO[]> {
  const lotes = await prisma.lote.findMany({
    where: {
      ...(filtros?.manzanaId ? { manzanaId: filtros.manzanaId } : {}),
      ...(filtros?.estatus ? { estatus: filtros.estatus } : {}),
    },
    include: {
      manzana: true,
      ventas: {
        where: { estatus: "ACTIVO" },
        include: { cliente: true },
        take: 1,
      },
    },
    orderBy: [{ manzana: { nombre: "asc" } }, { numLote: "asc" }],
  })
  return lotes.map((l) => ({
    id: l.id,
    manzanaId: l.manzanaId,
    manzana: { id: l.manzana.id, nombre: l.manzana.nombre },
    numLote: l.numLote,
    superficieM2: l.superficieM2.toFixed(2),
    precioM2: l.precioM2.toFixed(2),
    totalPrecio: l.totalPrecio.toFixed(2),
    estatus: l.estatus,
    notas: l.notas,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    ventaActiva: l.ventas[0]
      ? {
          id: l.ventas[0].id,
          estatus: l.ventas[0].estatus,
          clienteId: l.ventas[0].clienteId,
          clienteNombre: l.ventas[0].cliente.nombre,
          loteId: l.id,
          loteEtiqueta: `${l.manzana.nombre}-${l.numLote}`,
        }
      : null,
  }))
}

export async function getManzanaDetalle(manzanaId: string): Promise<ManzanaDetalleDTO | null> {
  const m = await prisma.manzana.findUnique({
    where: { id: manzanaId },
    include: {
      lotes: {
        orderBy: { numLote: "asc" },
        include: {
          // Venta vigente que "posee" el lote (no cancelada).
          ventas: {
            where: { estatus: { in: ["ACTIVO", "LIQUIDADO"] } },
            include: { cliente: { select: { id: true, nombre: true } } },
            orderBy: { fechaVenta: "desc" },
            take: 1,
          },
        },
      },
    },
  })
  if (!m) return null

  const lotes = m.lotes.map((l) => {
    const v = l.ventas[0]
    return {
      id: l.id,
      numLote: l.numLote,
      superficieM2: l.superficieM2.toFixed(2),
      precioM2: l.precioM2.toFixed(2),
      totalPrecio: l.totalPrecio.toFixed(2),
      estatus: l.estatus,
      notas: l.notas,
      venta: v
        ? { id: v.id, estatus: v.estatus, clienteId: v.clienteId, clienteNombre: v.cliente.nombre }
        : null,
    }
  })

  return {
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    totalLotes: lotes.length,
    lotesDisponibles: lotes.filter((l) => l.estatus === "DISPONIBLE").length,
    lotesVendidos: lotes.filter((l) => l.estatus === "VENDIDO").length,
    lotes,
  }
}

export async function getLote(id: string): Promise<LoteDTO | null> {
  const l = await prisma.lote.findUnique({
    where: { id },
    include: { manzana: true },
  })
  if (!l) return null
  return serialize({
    id: l.id,
    manzanaId: l.manzanaId,
    manzana: { id: l.manzana.id, nombre: l.manzana.nombre },
    numLote: l.numLote,
    superficieM2: l.superficieM2,
    precioM2: l.precioM2,
    totalPrecio: l.totalPrecio,
    estatus: l.estatus,
    notas: l.notas,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }) as unknown as LoteDTO
}
