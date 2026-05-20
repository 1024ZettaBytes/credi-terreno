import { Decimal, toDecimal } from "@/lib/money"

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
 * Construye la fecha de vencimiento de la mensualidad N (1-based).
 * - Si en el mes de la venta el `diaPago` aún no ha pasado, la mensualidad #1 vence ese mismo mes.
 * - Si ya pasó (o es el mismo día), la mensualidad #1 vence al mes siguiente.
 */
export function fechaVencimientoMensualidad(
  fechaVenta: Date,
  diaPago: number,
  numeroMensualidad: number,
): Date {
  const base = new Date(fechaVenta)
  // Get the effective payment day for the sale month (clamped to month's last day)
  const lastDayOfSaleMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const effectiveDiaPago = Math.min(diaPago, lastDayOfSaleMonth)
  // offset = 0 if the effective payment day hasn't passed yet; 1 if it has (or is today)
  const offset = base.getUTCDate() < effectiveDiaPago ? 0 : 1
  const mesObjetivo = base.getUTCMonth() + offset + (numeroMensualidad - 1)
  const fecha = new Date(Date.UTC(base.getUTCFullYear(), mesObjetivo, diaPago, 12, 0, 0))
  // Si el día no existe en el mes (ej. 31 en febrero), usar el último día del mes
  const expectedMonth = ((mesObjetivo % 12) + 12) % 12
  if (fecha.getUTCMonth() !== expectedMonth) {
    fecha.setUTCDate(0)
  }
  return fecha
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
