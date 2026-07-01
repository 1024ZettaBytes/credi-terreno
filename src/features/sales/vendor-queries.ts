import "server-only"
import prisma from "@/lib/prisma"
import { formatDateISO } from "@/lib/date"
import type { VendedorDTO, VentaDTO, LoteDTO, ClienteDTO } from "@/types"
import { EstatusVenta } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
export interface VendedorDetalleDTO extends VendedorDTO {
  totalVentas: number
  ventasActivas: number
  ventasCerradas: number
  totalComision: string
  promedioPorVenta: string
  ventas: VentaDetalleDTO[]
}

export interface VentaDetalleDTO extends VentaDTO {
  cliente?: ClienteDTO | null
  lote?: LoteDTO | null
}

export async function listVendedores(soloActivos = false): Promise<VendedorDTO[]> {
  const items = await prisma.vendedor.findMany({
    where: soloActivos ? { activo: true } : {},
    orderBy: { nombre: "asc" },
  })
  return items.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    telefono: v.telefono,
    email: v.email,
    comisionPorcentaje: v.comisionPorcentaje.toFixed(2),
    notas: v.notas,
    activo: v.activo,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }))
}

export async function getVendedorDetalle(vendedorId: string): Promise<VendedorDetalleDTO | null> {
  const vendedor = await prisma.vendedor.findUnique({
    where: { id: vendedorId },
    include: {
      ventas: {
        include: {
          cliente: true,
          lote: true,
        },
        orderBy: { fechaVenta: "desc" },
      },
    },
  })

  if (!vendedor) return null

  const totalVentas = vendedor.ventas.length
  const ventasActivas = vendedor.ventas.filter((v) => v.estatus === EstatusVenta.ACTIVO).length
  const ventasCerradas = vendedor.ventas.filter((v) => v.estatus === EstatusVenta.LIQUIDADO).length
  const totalComision = vendedor.ventas.reduce((sum, v) => new Decimal(sum).add(v.comisionMonto), new Decimal(0))
  const promedioPorVenta =
    totalVentas > 0 ? (Number(totalComision) / totalVentas).toFixed(2) : "0"

  return {
    id: vendedor.id,
    nombre: vendedor.nombre,
    telefono: vendedor.telefono,
    email: vendedor.email,
    comisionPorcentaje: vendedor.comisionPorcentaje.toFixed(2),
    notas: vendedor.notas,
    activo: vendedor.activo,
    createdAt: vendedor.createdAt.toISOString(),
    updatedAt: vendedor.updatedAt.toISOString(),
    totalVentas,
    ventasActivas,
    ventasCerradas,
    totalComision: totalComision.toString(),
    promedioPorVenta,
    ventas: vendedor.ventas.map((v) => ({
      id: v.id,
      loteId: v.loteId,
      clienteId: v.clienteId,
      vendedorId: v.vendedorId,
      fechaVenta: formatDateISO(v.fechaVenta),
      precioTotal: v.precioTotal.toFixed(2),
      enganche: v.enganche.toFixed(2),
      montoFinanciado: v.montoFinanciado.toFixed(2),
      mensualidadBase: v.mensualidadBase.toFixed(2),
      plazoMeses: v.plazoMeses,
      diaPago: v.diaPago,
      fechaPrimerPago: v.fechaPrimerPago ? formatDateISO(v.fechaPrimerPago) : null,
      modalidadPago: v.modalidadPago,
      fechaLimitePago: v.fechaLimitePago ? formatDateISO(v.fechaLimitePago) : null,
      interesMoratorioPorcentaje: v.interesMoratorioPorcentaje.toFixed(2),
      comisionPorcentaje: v.comisionPorcentaje.toFixed(2),
      comisionMonto: v.comisionMonto.toFixed(2),
      estatus: v.estatus,
      fechaCierre: v.fechaCierre ? formatDateISO(v.fechaCierre) : null,
      notas: v.notas,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      cliente: v.cliente
        ? {
            id: v.cliente.id,
            nombre: v.cliente.nombre,
            telefono: v.cliente.telefono,
            domicilio: v.cliente.domicilio,
            email: v.cliente.email,
            curp: v.cliente.curp,
            rfc: v.cliente.rfc,
            expediente: v.cliente.expediente,
            notas: v.cliente.notas,
            createdAt: v.cliente.createdAt.toISOString(),
            updatedAt: v.cliente.updatedAt.toISOString(),
          }
        : null,
      lote: v.lote
        ? {
            id: v.lote.id,
            manzanaId: v.lote.manzanaId,
            numLote: v.lote.numLote,
            superficieM2: v.lote.superficieM2.toFixed(2),
            precioM2: v.lote.precioM2.toFixed(2),
            totalPrecio: v.lote.totalPrecio.toFixed(2),
            estatus: v.lote.estatus,
            notas: v.lote.notas,
            createdAt: v.lote.createdAt.toISOString(),
            updatedAt: v.lote.updatedAt.toISOString(),
          }
        : null,
    })),
  }
}
