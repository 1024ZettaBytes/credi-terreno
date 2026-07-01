import type {
  EstatusLote,
  EstatusVenta,
  TipoPago,
  UserRole,
  ModalidadPago,
} from "@prisma/client"

export type { EstatusLote, EstatusVenta, TipoPago, UserRole, ModalidadPago }

export interface ManzanaDTO {
  id: string
  nombre: string
  descripcion: string | null
  createdAt: string
  updatedAt: string
  totalLotes?: number
  lotesDisponibles?: number
}

export interface LoteDTO {
  id: string
  manzanaId: string
  manzana?: { id: string; nombre: string } | null
  numLote: string
  superficieM2: string
  precioM2: string
  totalPrecio: string
  estatus: EstatusLote
  notas: string | null
  createdAt: string
  updatedAt: string
  ventaActiva?: { id: string; clienteNombre: string } | null
}

export interface LoteConVentaDTO {
  id: string
  numLote: string
  superficieM2: string
  precioM2: string
  totalPrecio: string
  estatus: EstatusLote
  notas: string | null
  venta: { id: string; estatus: EstatusVenta; clienteId: string; clienteNombre: string } | null
}

export interface ManzanaDetalleDTO {
  id: string
  nombre: string
  descripcion: string | null
  createdAt: string
  updatedAt: string
  totalLotes: number
  lotesDisponibles: number
  lotesVendidos: number
  lotes: LoteConVentaDTO[]
}

export interface ClienteDTO {
  id: string
  nombre: string
  telefono: string
  domicilio: string
  email: string | null
  curp: string | null
  rfc: string | null
  expediente: string[]
  notas: string | null
  createdAt: string
  updatedAt: string
  ventasActivas?: number
}

export interface VendedorDTO {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  comisionPorcentaje: string
  notas: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface PagoDTO {
  id: string
  ventaId: string
  monto: string
  fechaRegistro: string
  fechaPeriodo: string | null
  tipo: TipoPago
  periodoMes: number | null
  periodoAnio: number | null
  diasMora: number | null
  comprobanteUrl: string | null
  notas: string | null
  registradoPorId: string | null
  createdAt: string
  updatedAt: string
}

export interface VentaDTO {
  id: string
  loteId: string
  clienteId: string
  vendedorId: string | null
  fechaVenta: string
  precioTotal: string
  enganche: string
  montoFinanciado: string
  mensualidadBase: string
  plazoMeses: number
  diaPago: number
  fechaPrimerPago: string | null
  modalidadPago: ModalidadPago
  fechaLimitePago: string | null
  interesMoratorioPorcentaje: string
  comisionPorcentaje: string
  comisionMonto: string
  estatus: EstatusVenta
  fechaCierre: string | null
  notas: string | null
  createdAt: string
  updatedAt: string
  cliente?: ClienteDTO | null
  lote?: LoteDTO | null
  vendedor?: VendedorDTO | null
  pagos?: PagoDTO[]
}
