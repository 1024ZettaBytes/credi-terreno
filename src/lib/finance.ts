import { Decimal, toDecimal } from "@/lib/money"
import type { TipoPago } from "@prisma/client"

/**
 * Recargo aplicado a las ventas "Sin enganche" (enganche = 0): el precio total
 * del lote se incrementa en esta cantidad. Ver `calcularPrecioVenta`.
 */
export const RECARGO_SIN_ENGANCHE = 20000

/**
 * Precio total efectivo de la venta a partir del precio base del lote.
 * Si la venta es sin enganche (enganche = 0), se suma `RECARGO_SIN_ENGANCHE`.
 */
export function calcularPrecioVenta(
  precioBaseLote: Decimal | string | number,
  enganche: Decimal | string | number,
): Decimal {
  const base = toDecimal(precioBaseLote)
  return toDecimal(enganche).lessThanOrEqualTo(0)
    ? base.plus(RECARGO_SIN_ENGANCHE)
    : base
}

/** Calcula la mensualidad base = (precio - enganche) / plazo */
export function calcularMensualidadBase(
  precioTotal: Decimal | string | number,
  enganche: Decimal | string | number,
  plazoMeses: number,
): Decimal {
  if (plazoMeses <= 0) return new Decimal(0)
  const fin = toDecimal(precioTotal).minus(toDecimal(enganche))
  return fin.dividedBy(plazoMeses).toDecimalPlaces(2)
}

/** Calcula la comisión del vendedor sobre el precio total */
export function calcularComision(
  precioTotal: Decimal | string | number,
  porcentaje: Decimal | string | number,
): Decimal {
  return toDecimal(precioTotal).times(toDecimal(porcentaje)).dividedBy(100).toDecimalPlaces(2)
}

/**
 * LEGADO (solo migración/ajustes): reconstruye la ancla histórica de la
 * mensualidad #1 con la regla antigua (fechaVenta + diaPago + offset), usada
 * antes de capturar `fechaPrimerPago` explícitamente. Sirve para ubicar a qué
 * mensualidad pertenece cada pago de una venta heredada.
 */
export function anclaPrimerPagoHistorica(fechaVenta: Date, diaPago: number): Date {
  const base = new Date(fechaVenta)
  const lastDayOfSaleMonth = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const effectiveDiaPago = Math.min(diaPago, lastDayOfSaleMonth)
  const offset = base.getUTCDate() < effectiveDiaPago ? 0 : 1
  const mesObjetivo = base.getUTCMonth() + offset
  const fecha = new Date(Date.UTC(base.getUTCFullYear(), mesObjetivo, diaPago, 12, 0, 0))
  const expectedMonth = ((mesObjetivo % 12) + 12) % 12
  if (fecha.getUTCMonth() !== expectedMonth) {
    fecha.setUTCDate(0)
  }
  return fecha
}

/**
 * Construye la fecha de vencimiento de la mensualidad N (1-based).
 * El calendario se ancla en `fechaPrimerPago` (vencimiento de la mensualidad #1,
 * capturado explícitamente por el usuario al crear la venta):
 *   mensualidad N  =  fechaPrimerPago + (N - 1) meses
 * `diaPago` es el día canónico del mes (= día de `fechaPrimerPago`); se usa para
 * recortar al último día cuando el mes objetivo tiene menos días (ej. 31 en febrero).
 */
export function fechaVencimientoMensualidad(
  fechaPrimerPago: Date,
  diaPago: number,
  numeroMensualidad: number,
): Date {
  const base = new Date(fechaPrimerPago)
  const mesObjetivo = base.getUTCMonth() + (numeroMensualidad - 1)
  const fecha = new Date(Date.UTC(base.getUTCFullYear(), mesObjetivo, diaPago, 12, 0, 0))
  // Si el día no existe en el mes (ej. 31 en febrero), usar el último día del mes
  const expectedMonth = ((mesObjetivo % 12) + 12) % 12
  if (fecha.getUTCMonth() !== expectedMonth) {
    fecha.setUTCDate(0)
  }
  return fecha
}

/* ============================================================
 * RECÁLCULO DEL ESTADO VIVO (replay) — usado al eliminar pagos.
 * Reconstruye los campos vivos de la venta reproduciendo, en orden
 * cronológico, el efecto de las filas `Pago` restantes. Reproduce
 * paso a paso la misma matemática que `simularDistribucion`.
 * ============================================================ */

export interface VentaInmutable {
  fechaVenta: Date
  diaPago: number
  /** Ancla del calendario: vencimiento de la mensualidad #1. */
  fechaPrimerPago: Date
  plazoMeses: number
  /** Capital financiado original (precioTotal − enganche). */
  montoFinanciado: Decimal | string | number
}

export interface PagoParaRecalculo {
  tipo: TipoPago
  monto: Decimal | string | number
}

export interface EstadoVentaRecalculado {
  mensualidadBase: Decimal
  saldoMensualidadActual: Decimal
  saldoCapital: Decimal
  numeroMensualidadActual: number
  proximaFechaPago: Date
  liquidado: boolean
}

/**
 * Reconstruye el estado vivo de una venta a partir de sus datos inmutables y
 * de los pagos restantes (deben venir ordenados cronológicamente).
 * MORATORIO y ENGANCHE no afectan el estado vivo.
 */
export function recalcularEstadoVenta(
  v: VentaInmutable,
  pagos: PagoParaRecalculo[],
): EstadoVentaRecalculado {
  const montoFinanciado = toDecimal(v.montoFinanciado)
  let mensualidadBase = calcularMensualidadBase(montoFinanciado, 0, v.plazoMeses)
  let saldoCapital = montoFinanciado
  let saldoMens = mensualidadBase
  let numMes = 1
  let proximaFechaPago = fechaVencimientoMensualidad(v.fechaPrimerPago, v.diaPago, 1)

  const recalcMensualidad = () => {
    const mesesRestantes = v.plazoMeses - (numMes - 1)
    if (mesesRestantes <= 0 || saldoCapital.lessThanOrEqualTo(0)) {
      saldoMens = new Decimal(0)
      return
    }
    const pagadoEsteMes = mensualidadBase.minus(saldoMens)
    const nuevaMens = saldoCapital.dividedBy(mesesRestantes).toDecimalPlaces(2)
    mensualidadBase = nuevaMens
    saldoMens = Decimal.max(nuevaMens.minus(pagadoEsteMes), new Decimal(0))
  }

  for (const p of pagos) {
    const monto = toDecimal(p.monto)
    if (p.tipo === "MENSUALIDAD") {
      saldoCapital = saldoCapital.minus(monto)
      saldoMens = saldoMens.minus(monto)
      if (saldoMens.lessThanOrEqualTo(0)) {
        numMes += 1
        if (numMes <= v.plazoMeses) {
          saldoMens = mensualidadBase
          proximaFechaPago = fechaVencimientoMensualidad(v.fechaPrimerPago, v.diaPago, numMes)
        } else {
          saldoMens = new Decimal(0)
        }
      }
    } else if (p.tipo === "ABONO_CAPITAL") {
      saldoCapital = saldoCapital.minus(monto)
      recalcMensualidad()
    } else if (p.tipo === "LIQUIDACION") {
      saldoCapital = saldoCapital.minus(monto)
      saldoMens = new Decimal(0)
    }
    // MORATORIO y ENGANCHE: no modifican el estado vivo.
  }

  saldoCapital = Decimal.max(saldoCapital, new Decimal(0))
  return {
    mensualidadBase,
    saldoMensualidadActual: Decimal.max(saldoMens, new Decimal(0)),
    saldoCapital,
    numeroMensualidadActual: Math.min(numMes, v.plazoMeses + 1),
    proximaFechaPago,
    liquidado: saldoCapital.lessThanOrEqualTo(0),
  }
}

/**
 * Mora diaria: tasa mensual / 30 × días de atraso, sobre el saldo del mes en curso.
 *   mora = saldoMensualidadActual × (interesMensual/100) / 30 × diasAtraso
 */
export function calcularMoraDiaria(
  saldoMensualidadActual: Decimal | string | number,
  interesMoratorioPorcentaje: Decimal | string | number,
  diasAtraso: number,
): Decimal {
  if (diasAtraso <= 0) return new Decimal(0)
  return toDecimal(saldoMensualidadActual)
    .times(toDecimal(interesMoratorioPorcentaje))
    .dividedBy(100)
    .dividedBy(30)
    .times(diasAtraso)
    .toDecimalPlaces(2)
}

export interface VentaParaCalculo {
  fechaVenta: Date
  diaPago: number
  plazoMeses: number
  mensualidadBase: Decimal | string | number
  interesMoratorioPorcentaje: Decimal | string | number
  proximaFechaPago: Date
  saldoMensualidadActual: Decimal | string | number
  numeroMensualidadActual: number
  saldoCapital: Decimal | string | number
}

export interface EstadoCuenta {
  saldoCapital: Decimal
  saldoMensualidadActual: Decimal
  numeroMensualidadActual: number
  proximaFechaPago: Date
  diasAtraso: number
  moraPendiente: Decimal
  totalDeuda: Decimal
  estaEnMora: boolean
  liquidado: boolean
  mensualidadesPagadas: number
  mensualidadesPendientes: number
}

/** Calcula el estado de cuenta a partir de los campos vivos de la venta. */
export function calcularEstadoCuenta(
  v: VentaParaCalculo,
  fechaCalculo: Date = new Date(),
): EstadoCuenta {
  const saldoCapital = toDecimal(v.saldoCapital)
  const saldoMensualidadActual = toDecimal(v.saldoMensualidadActual)
  const liquidado = saldoCapital.lessThanOrEqualTo(0)

  const diasAtraso = liquidado
    ? 0
    : Math.max(
        0,
        Math.floor((fechaCalculo.getTime() - v.proximaFechaPago.getTime()) / 86_400_000),
      )

  const moraPendiente = liquidado
    ? new Decimal(0)
    : calcularMoraDiaria(saldoMensualidadActual, v.interesMoratorioPorcentaje, diasAtraso)

  const mensualidadesPagadas = Math.max(0, v.numeroMensualidadActual - 1)
  const mensualidadesPendientes = Math.max(0, v.plazoMeses - mensualidadesPagadas)

  return {
    saldoCapital,
    saldoMensualidadActual,
    numeroMensualidadActual: v.numeroMensualidadActual,
    proximaFechaPago: v.proximaFechaPago,
    diasAtraso,
    moraPendiente,
    totalDeuda: saldoCapital.plus(moraPendiente),
    estaEnMora: diasAtraso > 0 && !liquidado,
    liquidado,
    mensualidadesPagadas,
    mensualidadesPendientes,
  }
}

export type SemaforoColor = "VERDE" | "AMARILLO" | "ROJO"

/** Verde: al corriente. Amarillo: vence pronto o atraso leve. Rojo: 30+ días vencido. */
export function semaforoCobranza(estado: EstadoCuenta, hoy: Date = new Date()): SemaforoColor {
  if (estado.liquidado) return "VERDE"
  if (estado.diasAtraso >= 30) return "ROJO"
  if (estado.diasAtraso > 0) return "AMARILLO"
  const dias = Math.floor(
    (estado.proximaFechaPago.getTime() - hoy.getTime()) / 86_400_000,
  )
  if (dias <= 5) return "AMARILLO"
  return "VERDE"
}
