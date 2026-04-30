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

/** Construye la fecha de vencimiento de la mensualidad N (1-based) a partir de fechaVenta y diaPago */
export function fechaVencimientoMensualidad(
  fechaVenta: Date,
  diaPago: number,
  numeroMensualidad: number,
): Date {
  const base = new Date(fechaVenta)
  // El primer vencimiento es el siguiente mes después de la venta
  const fecha = new Date(base.getFullYear(), base.getMonth() + numeroMensualidad, diaPago)
  // Si el día no existe en el mes (ej. 31 en febrero), usar el último día
  if (fecha.getMonth() !== (base.getMonth() + numeroMensualidad) % 12 + (fecha.getMonth() < base.getMonth() ? 12 : 0)) {
    fecha.setDate(0)
  }
  return fecha
}

export interface VentaParaCalculo {
  fechaVenta: Date
  diaPago: number
  plazoMeses: number
  mensualidadBase: Decimal | string | number
  enganche: Decimal | string | number
  precioTotal: Decimal | string | number
  interesMoratorioPorcentaje: Decimal | string | number
  pagos: Array<{
    monto: Decimal | string | number
    tipo: "ENGANCHE" | "MENSUALIDAD" | "ABONO_CAPITAL" | "MORATORIO" | "LIQUIDACION"
    fechaRegistro: Date
    periodoMes?: number | null
    periodoAnio?: number | null
  }>
}

export interface EstadoCuenta {
  precioTotal: Decimal
  enganche: Decimal
  montoFinanciado: Decimal
  totalPagadoCapital: Decimal
  totalPagadoMora: Decimal
  saldoCapital: Decimal
  mensualidadesPagadas: number
  mensualidadesPendientes: number
  proximoVencimiento: Date | null
  /** Mensualidades vencidas no pagadas */
  mensualidadesVencidas: Array<{
    numero: number
    fechaVencimiento: Date
    montoPendiente: Decimal
    diasAtraso: number
    interesMora: Decimal
  }>
  totalInteresMora: Decimal
  totalDeuda: Decimal
  estaEnMora: boolean
  liquidado: boolean
}

/**
 * Calcula el estado de cuenta de una venta a una fecha dada.
 * Mora = mensualidad * (interesMoratorioPorcentaje/100) por cada mes (o fracción) de atraso.
 * Esto coincide con la lectura del prompt: "interesMoratorioPorcentaje (ej. 5.0 para 5%)".
 */
export function calcularEstadoCuenta(
  v: VentaParaCalculo,
  fechaCalculo: Date = new Date(),
): EstadoCuenta {
  const precioTotal = toDecimal(v.precioTotal)
  const enganche = toDecimal(v.enganche)
  const mensualidadBase = toDecimal(v.mensualidadBase)
  const tasaMora = toDecimal(v.interesMoratorioPorcentaje).dividedBy(100)
  const montoFinanciado = precioTotal.minus(enganche)

  let totalPagadoCapital = new Decimal(0)
  let totalPagadoMora = new Decimal(0)
  const pagosPorPeriodo = new Map<string, Decimal>()

  for (const p of v.pagos) {
    const m = toDecimal(p.monto)
    if (p.tipo === "ENGANCHE") continue
    if (p.tipo === "MORATORIO") {
      totalPagadoMora = totalPagadoMora.plus(m)
      continue
    }
    // MENSUALIDAD, ABONO_CAPITAL, LIQUIDACION suman a capital
    totalPagadoCapital = totalPagadoCapital.plus(m)
    if (p.periodoMes && p.periodoAnio) {
      const k = `${p.periodoAnio}-${p.periodoMes}`
      pagosPorPeriodo.set(k, (pagosPorPeriodo.get(k) ?? new Decimal(0)).plus(m))
    }
  }

  const saldoCapital = Decimal.max(montoFinanciado.minus(totalPagadoCapital), new Decimal(0))
  const mensualidadesPagadas = mensualidadBase.greaterThan(0)
    ? Math.min(v.plazoMeses, Math.floor(totalPagadoCapital.dividedBy(mensualidadBase).toNumber()))
    : 0
  const mensualidadesPendientes = Math.max(0, v.plazoMeses - mensualidadesPagadas)

  const mensualidadesVencidas: EstadoCuenta["mensualidadesVencidas"] = []
  let totalInteresMora = new Decimal(0)
  let proximoVencimiento: Date | null = null

  for (let n = 1; n <= v.plazoMeses; n++) {
    const venc = fechaVencimientoMensualidad(v.fechaVenta, v.diaPago, n)
    const k = `${venc.getFullYear()}-${venc.getMonth() + 1}`
    const pagadoEnPeriodo = pagosPorPeriodo.get(k) ?? new Decimal(0)
    const pendiente = mensualidadBase.minus(pagadoEnPeriodo)

    if (venc <= fechaCalculo && pendiente.greaterThan(0)) {
      const diasAtraso = Math.max(
        0,
        Math.floor((fechaCalculo.getTime() - venc.getTime()) / 86_400_000),
      )
      // mora por mes (o fracción) de atraso
      const mesesAtraso = Math.ceil(diasAtraso / 30) || 1
      const interes = pendiente.times(tasaMora).times(mesesAtraso).toDecimalPlaces(2)
      totalInteresMora = totalInteresMora.plus(interes)
      mensualidadesVencidas.push({
        numero: n,
        fechaVencimiento: venc,
        montoPendiente: pendiente,
        diasAtraso,
        interesMora: interes,
      })
    } else if (venc > fechaCalculo && proximoVencimiento === null) {
      proximoVencimiento = venc
    }
  }

  // restar lo ya pagado de mora
  const moraPendiente = Decimal.max(totalInteresMora.minus(totalPagadoMora), new Decimal(0))
  const totalDeuda = saldoCapital.plus(moraPendiente)
  const liquidado = saldoCapital.lessThanOrEqualTo(0) && mensualidadesPendientes === 0

  return {
    precioTotal,
    enganche,
    montoFinanciado,
    totalPagadoCapital,
    totalPagadoMora,
    saldoCapital,
    mensualidadesPagadas,
    mensualidadesPendientes,
    proximoVencimiento,
    mensualidadesVencidas,
    totalInteresMora: moraPendiente,
    totalDeuda,
    estaEnMora: mensualidadesVencidas.length > 0,
    liquidado,
  }
}

export type SemaforoColor = "VERDE" | "AMARILLO" | "ROJO"

/** Verde: al corriente. Amarillo: vence en <=5 días o 1 mensualidad vencida. Rojo: 2+ vencidas. */
export function semaforoCobranza(estado: EstadoCuenta, hoy: Date = new Date()): SemaforoColor {
  if (estado.liquidado) return "VERDE"
  if (estado.mensualidadesVencidas.length >= 2) return "ROJO"
  if (estado.mensualidadesVencidas.length === 1) return "AMARILLO"
  if (estado.proximoVencimiento) {
    const dias = Math.floor(
      (estado.proximoVencimiento.getTime() - hoy.getTime()) / 86_400_000,
    )
    if (dias <= 5) return "AMARILLO"
  }
  return "VERDE"
}
