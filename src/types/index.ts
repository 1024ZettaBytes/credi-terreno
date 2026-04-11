import { Decimal } from "decimal.js"

// Tipos base para la aplicación

export type EstadoTerreno = "DISPONIBLE" | "APARTADO" | "VENDIDO"
export type EstadoContrato = "ACTIVO" | "LIQUIDADO" | "CANCELADO" | "EN_MORA"
export type TipoPago = "ENGANCHE" | "MENSUALIDAD" | "INTERES_MORA" | "ABONO_CAPITAL" | "LIQUIDACION"
export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "CHEQUE" | "TARJETA" | "OTRO"
export type UserRole = "ADMIN" | "VENDEDOR" | "CONTADOR"

// Interfaces para uso en componentes (con strings para serialización JSON)

export interface ClienteDTO {
  id: string
  nombreCompleto: string
  domicilio: string
  telefono: string
  email?: string | null
  curp?: string | null
  rfc?: string | null
  createdAt: string
  updatedAt: string
}

export interface TerrenoDTO {
  id: string
  identificador: string
  descripcion?: string | null
  precioLista: string // Decimal serializado
  estado: EstadoTerreno
  coordenadaX: number
  coordenadaY: number
  superficie?: number | null
  frente?: number | null
  fondo?: number | null
  createdAt: string
  updatedAt: string
  // Relaciones opcionales
  contratos?: ContratoDTO[]
}

export interface ContratoDTO {
  id: string
  clienteId: string
  terrenoId: string
  precioVenta: string
  enganche: string
  diaPagoMensual: number
  plazoMeses: number
  montoMensualidad: string
  tasaMoraDiaria: string
  estado: EstadoContrato
  fechaInicio: string
  fechaFin?: string | null
  createdAt: string
  updatedAt: string
  // Relaciones opcionales
  cliente?: ClienteDTO
  terreno?: TerrenoDTO
  pagos?: PagoDTO[]
}

export interface PagoDTO {
  id: string
  contratoId: string
  monto: string
  fechaPago: string
  tipo: TipoPago
  numeroPago?: number | null
  periodoMes?: number | null
  periodoAnio?: number | null
  diasMora?: number | null
  metodoPago: MetodoPago
  referencia?: string | null
  comprobante?: string | null
  notas?: string | null
  registradoPorId?: string | null
  createdAt: string
  updatedAt: string
}

// Tipos para formularios

export interface ClienteFormData {
  nombreCompleto: string
  domicilio: string
  telefono: string
  email?: string
  curp?: string
  rfc?: string
}

export interface TerrenoFormData {
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

export interface ContratoFormData {
  clienteId: string
  terrenoId: string
  precioVenta: number
  enganche: number
  diaPagoMensual: number
  plazoMeses: number
  tasaMoraDiaria: number
}

export interface PagoFormData {
  contratoId: string
  monto: number
  fechaPago: Date
  tipo: TipoPago
  numeroPago?: number
  periodoMes?: number
  periodoAnio?: number
  metodoPago: MetodoPago
  referencia?: string
  notas?: string
}

// Tipos para el mapa de terrenos

export interface TerrenoMapaProps {
  terrenos: TerrenoDTO[]
  onTerrenoClick: (terreno: TerrenoDTO) => void
  selectedId?: string
}

// Tipo para terreno con información extendida (cliente asociado si existe)
export interface TerrenoConCliente extends TerrenoDTO {
  clienteActual?: ClienteDTO | null
  contratoActivo?: ContratoDTO | null
}
