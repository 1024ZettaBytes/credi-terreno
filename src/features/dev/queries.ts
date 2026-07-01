import "server-only"
import prisma from "@/lib/prisma"
import { formatDateISO } from "@/lib/date"
import type { EstatusVenta } from "@prisma/client"

export interface VentaAjusteDTO {
  id: string
  etiqueta: string
  estatus: EstatusVenta
  fechaVenta: string
  diaPago: number
  fechaPrimerPago: string | null
  proximaFechaPago: string
  numeroMensualidadActual: number
  plazoMeses: number
  totalPagos: number
}

/** Lista de ventas para las herramientas de ajuste del rol SYSTEM. */
export async function listVentasParaAjuste(): Promise<VentaAjusteDTO[]> {
  const ventas = await prisma.venta.findMany({
    include: {
      cliente: { select: { nombre: true } },
      lote: { select: { numLote: true, manzana: { select: { nombre: true } } } },
      _count: { select: { pagos: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  })
  return ventas.map((v) => ({
    id: v.id,
    etiqueta: `${v.lote.manzana.nombre}-${v.lote.numLote} · ${v.cliente.nombre}`,
    estatus: v.estatus,
    fechaVenta: formatDateISO(v.fechaVenta),
    diaPago: v.diaPago,
    fechaPrimerPago: v.fechaPrimerPago ? formatDateISO(v.fechaPrimerPago) : null,
    proximaFechaPago: formatDateISO(v.proximaFechaPago),
    numeroMensualidadActual: v.numeroMensualidadActual,
    plazoMeses: v.plazoMeses,
    totalPagos: v._count.pagos,
  }))
}
