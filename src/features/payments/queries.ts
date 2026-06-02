import "server-only"
import prisma from "@/lib/prisma"
import { formatDateISO } from "@/lib/date"
import type { PagoDTO } from "@/types"

export async function listPagos(filtros?: {
  ventaId?: string
  desde?: Date
  hasta?: Date
}): Promise<Array<PagoDTO & { ventaCliente: string; ventaLote: string }>> {
  const items = await prisma.pago.findMany({
    where: {
      ...(filtros?.ventaId ? { ventaId: filtros.ventaId } : {}),
      ...(filtros?.desde || filtros?.hasta
        ? {
            fechaRegistro: {
              ...(filtros.desde ? { gte: filtros.desde } : {}),
              ...(filtros.hasta ? { lte: filtros.hasta } : {}),
            },
          }
        : {}),
    },
    include: {
      venta: {
        include: { cliente: true, lote: { include: { manzana: true } } },
      },
    },
    orderBy: [{ fechaRegistro: "desc" }, { createdAt: "desc" }],
  })
  return items.map((p) => ({
    id: p.id,
    ventaId: p.ventaId,
    monto: p.monto.toFixed(2),
    fechaRegistro: formatDateISO(p.fechaRegistro),
    fechaPeriodo: p.fechaPeriodo ? formatDateISO(p.fechaPeriodo) : null,
    tipo: p.tipo,
    periodoMes: p.periodoMes,
    periodoAnio: p.periodoAnio,
    diasMora: p.diasMora,
    comprobanteUrl: p.comprobanteUrl,
    notas: p.notas,
    registradoPorId: p.registradoPorId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ventaCliente: p.venta.cliente.nombre,
    ventaLote: `${p.venta.lote.manzana.nombre}-${p.venta.lote.numLote}`,
  }))
}
