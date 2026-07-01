import "server-only"
import prisma from "@/lib/prisma"
import { formatDateISO } from "@/lib/date"
import { calcularEstadoCuenta, semaforoCobranza, type SemaforoColor, type EstadoCuenta } from "@/lib/finance"
import type { VentaDTO } from "@/types"

function toVentaDTO(v: Awaited<ReturnType<typeof prisma.venta.findUniqueOrThrow>> & {
  cliente?: { id: string; nombre: string; telefono: string; domicilio: string; email: string | null; curp: string | null; rfc: string | null; expediente: string[]; notas: string | null; createdAt: Date; updatedAt: Date }
  lote?: { id: string; manzanaId: string; numLote: string; superficieM2: import("decimal.js").Decimal; precioM2: import("decimal.js").Decimal; totalPrecio: import("decimal.js").Decimal; estatus: import("@prisma/client").EstatusLote; notas: string | null; createdAt: Date; updatedAt: Date; manzana?: { id: string; nombre: string } }
  vendedor?: { id: string; nombre: string; telefono: string | null; email: string | null; comisionPorcentaje: import("decimal.js").Decimal; notas: string | null; activo: boolean; createdAt: Date; updatedAt: Date } | null
  pagos?: Array<{ id: string; ventaId: string; monto: import("decimal.js").Decimal; fechaRegistro: Date; fechaPeriodo: Date | null; tipo: import("@prisma/client").TipoPago; periodoMes: number | null; periodoAnio: number | null; diasMora: number | null; comprobanteUrl: string | null; notas: string | null; registradoPorId: string | null; createdAt: Date; updatedAt: Date }>
}): VentaDTO {
  return {
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
    interesMoratorioPorcentaje: v.interesMoratorioPorcentaje.toFixed(2),
    comisionPorcentaje: v.comisionPorcentaje.toFixed(2),
    comisionMonto: v.comisionMonto.toFixed(2),
    estatus: v.estatus,
    fechaCierre: v.fechaCierre ? formatDateISO(v.fechaCierre) : null,
    notas: v.notas,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    cliente: v.cliente && {
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
    },
    lote: v.lote && {
      id: v.lote.id,
      manzanaId: v.lote.manzanaId,
      manzana: v.lote.manzana,
      numLote: v.lote.numLote,
      superficieM2: v.lote.superficieM2.toFixed(2),
      precioM2: v.lote.precioM2.toFixed(2),
      totalPrecio: v.lote.totalPrecio.toFixed(2),
      estatus: v.lote.estatus,
      notas: v.lote.notas,
      createdAt: v.lote.createdAt.toISOString(),
      updatedAt: v.lote.updatedAt.toISOString(),
    },
    vendedor: v.vendedor
      ? {
          id: v.vendedor.id,
          nombre: v.vendedor.nombre,
          telefono: v.vendedor.telefono,
          email: v.vendedor.email,
          comisionPorcentaje: v.vendedor.comisionPorcentaje.toFixed(2),
          notas: v.vendedor.notas,
          activo: v.vendedor.activo,
          createdAt: v.vendedor.createdAt.toISOString(),
          updatedAt: v.vendedor.updatedAt.toISOString(),
        }
      : null,
    pagos: v.pagos?.map((p) => ({
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
    })),
  }
}

export async function listVentas(filtros?: { estatus?: import("@prisma/client").EstatusVenta }) {
  const items = await prisma.venta.findMany({
    where: filtros?.estatus ? { estatus: filtros.estatus } : {},
    include: { cliente: true, lote: { include: { manzana: true } }, vendedor: true, pagos: true },
    orderBy: { fechaVenta: "desc" },
  })
  return items.map((v) => {
    const dto = toVentaDTO(v)
    if (v.estatus === "ACTIVO") {
      ;(dto as VentaDTOConProximoPago).proximoPago = formatDateISO(v.proximaFechaPago)
    }
    return dto
  })
}

export interface VentaDTOConProximoPago extends VentaDTO {
  proximoPago?: string | null
}

export async function getVenta(id: string) {
  const v = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      lote: { include: { manzana: true } },
      vendedor: true,
      pagos: { orderBy: [{ fechaRegistro: "desc" }, { createdAt: "desc" }] },
    },
  })
  return v ? toVentaDTO(v) : null
}

export interface VentaConSemaforo {
  venta: VentaDTO
  estado: EstadoCuenta
  semaforo: SemaforoColor
}

/** Devuelve todas las ventas ACTIVAS con su estado de cuenta y semáforo. */
export async function listVentasConSemaforo(hoy: Date = new Date()): Promise<VentaConSemaforo[]> {
  const items = await prisma.venta.findMany({
    where: { estatus: "ACTIVO" },
    include: {
      cliente: true,
      lote: { include: { manzana: true } },
      vendedor: true,
      pagos: true,
    },
    orderBy: { fechaVenta: "desc" },
  })
  return items.map((v) => {
    const estado = calcularEstadoCuenta(
      {
        fechaVenta: v.fechaVenta,
        diaPago: v.diaPago,
        plazoMeses: v.plazoMeses,
        mensualidadBase: v.mensualidadBase,
        interesMoratorioPorcentaje: v.interesMoratorioPorcentaje,
        proximaFechaPago: v.proximaFechaPago,
        saldoMensualidadActual: v.saldoMensualidadActual,
        numeroMensualidadActual: v.numeroMensualidadActual,
        saldoCapital: v.saldoCapital,
      },
      hoy,
    )
    return {
      venta: toVentaDTO(v),
      estado,
      semaforo: semaforoCobranza(estado, hoy),
    }
  })
}

export async function listTraspasos() {
  const items = await prisma.traspaso.findMany({
    include: {
      clienteAnterior: true,
      clienteNuevo: true,
      ventaOriginal: { include: { lote: { include: { manzana: true } } } },
    },
    orderBy: { fechaTraspaso: "desc" },
  })
  return items.map((t) => ({
    id: t.id,
    fechaTraspaso: formatDateISO(t.fechaTraspaso),
    costoTraspaso: t.costoTraspaso.toFixed(2),
    clienteAnterior: { id: t.clienteAnterior.id, nombre: t.clienteAnterior.nombre },
    clienteNuevo: { id: t.clienteNuevo.id, nombre: t.clienteNuevo.nombre },
    lote: `${t.ventaOriginal.lote.manzana.nombre}-${t.ventaOriginal.lote.numLote}`,
    notas: t.notas,
  }))
}

export async function listRecuperaciones() {
  const items = await prisma.recuperacion.findMany({
    include: {
      venta: { include: { cliente: true, lote: { include: { manzana: true } } } },
    },
    orderBy: { fechaRecuperacion: "desc" },
  })
  return items.map((r) => ({
    id: r.id,
    fechaRecuperacion: formatDateISO(r.fechaRecuperacion),
    totalPagadoCliente: r.totalPagadoCliente.toFixed(2),
    porcentajeDevolucion: r.porcentajeDevolucion.toFixed(2),
    montoDevolucion: r.montoDevolucion.toFixed(2),
    motivo: r.motivo,
    cliente: r.venta.cliente.nombre,
    lote: `${r.venta.lote.manzana.nombre}-${r.venta.lote.numLote}`,
  }))
}
