import { Decimal } from "decimal.js"

// Configuración de Decimal.js para cálculos financieros
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
})

export interface DeudaCalculada {
  saldoCapital: Decimal
  mensualidadesPendientes: number
  mensualidadesPagadas: number
  diasEnMora: number
  interesMoratorio: Decimal
  totalDeuda: Decimal
  proximoVencimiento: Date | null
  estaEnMora: boolean
  detallesMora: {
    fechaVencimiento: Date
    montoMensualidad: Decimal
    diasAtraso: number
    interes: Decimal
  }[]
}

export interface DatosContrato {
  precioVenta: string | number | Decimal
  enganche: string | number | Decimal
  montoMensualidad: string | number | Decimal
  diaPagoMensual: number
  tasaMoraDiaria: string | number | Decimal
  plazoMeses: number
  fechaInicio: Date
  pagos: {
    monto: string | number | Decimal
    tipo: string
    periodoMes?: number | null
    periodoAnio?: number | null
    fechaPago: Date
  }[]
}

/**
 * Calcula la deuda actual de un contrato incluyendo intereses moratorios
 * 
 * @param contrato - Datos del contrato con pagos realizados
 * @param fechaCalculo - Fecha base para el cálculo (default: hoy)
 * @returns DeudaCalculada con todos los detalles financieros
 */
export function calcularDeudaActual(
  contrato: DatosContrato,
  fechaCalculo: Date = new Date()
): DeudaCalculada {
  const precioVenta = new Decimal(contrato.precioVenta.toString())
  const enganche = new Decimal(contrato.enganche.toString())
  const montoMensualidad = new Decimal(contrato.montoMensualidad.toString())
  const tasaMoraDiaria = new Decimal(contrato.tasaMoraDiaria.toString())
  
  // 1. Calcular saldo capital original (precio - enganche)
  const saldoCapitalOriginal = precioVenta.minus(enganche)
  
  // 2. Sumar todos los pagos de mensualidad y abonos a capital
  let totalPagadoCapital = new Decimal(0)
  let totalPagadoEnganche = new Decimal(0)
  let totalPagadoMora = new Decimal(0)
  
  // Mapear pagos por periodo para saber qué meses están cubiertos
  const pagosporPeriodo = new Map<string, Decimal>()
  
  for (const pago of contrato.pagos) {
    const montoPago = new Decimal(pago.monto.toString())
    
    if (pago.tipo === "ENGANCHE") {
      totalPagadoEnganche = totalPagadoEnganche.plus(montoPago)
    } else if (pago.tipo === "MENSUALIDAD" || pago.tipo === "ABONO_CAPITAL") {
      totalPagadoCapital = totalPagadoCapital.plus(montoPago)
      
      // Registrar el periodo cubierto
      if (pago.periodoMes && pago.periodoAnio) {
        const key = `${pago.periodoAnio}-${pago.periodoMes}`
        const existente = pagosporPeriodo.get(key) || new Decimal(0)
        pagosporPeriodo.set(key, existente.plus(montoPago))
      }
    } else if (pago.tipo === "INTERES_MORA") {
      totalPagadoMora = totalPagadoMora.plus(montoPago)
    } else if (pago.tipo === "LIQUIDACION") {
      totalPagadoCapital = totalPagadoCapital.plus(montoPago)
    }
  }
  
  // 3. Calcular saldo capital actual
  const saldoCapital = saldoCapitalOriginal.minus(totalPagadoCapital)
  
  // 4. Calcular mensualidades pagadas
  const mensualidadesPagadas = Math.floor(
    totalPagadoCapital.dividedBy(montoMensualidad).toNumber()
  )
  
  // 5. Calcular mensualidades pendientes
  const mensualidadesPendientes = contrato.plazoMeses - mensualidadesPagadas
  
  // 6. Generar fechas de vencimiento de cada mensualidad
  const vencimientos: Date[] = []
  const fechaInicio = new Date(contrato.fechaInicio)
  
  for (let i = 1; i <= contrato.plazoMeses; i++) {
    const fechaVencimiento = new Date(fechaInicio)
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i)
    fechaVencimiento.setDate(contrato.diaPagoMensual)
    vencimientos.push(fechaVencimiento)
  }
  
  // 7. Calcular mensualidades vencidas no pagadas e interés moratorio
  const detallesMora: DeudaCalculada["detallesMora"] = []
  let totalInteresMoratorio = new Decimal(0)
  let diasEnMoraTotal = 0
  
  for (let i = mensualidadesPagadas; i < vencimientos.length; i++) {
    const fechaVencimiento = vencimientos[i]
    
    // Solo si ya venció
    if (fechaVencimiento < fechaCalculo) {
      const periodoKey = `${fechaVencimiento.getFullYear()}-${fechaVencimiento.getMonth() + 1}`
      const pagadoEnPeriodo = pagosporPeriodo.get(periodoKey) || new Decimal(0)
      
      // Si no se ha pagado completamente este periodo
      if (pagadoEnPeriodo.lessThan(montoMensualidad)) {
        const montoPendiente = montoMensualidad.minus(pagadoEnPeriodo)
        
        // Calcular días de atraso
        const diasAtraso = Math.floor(
          (fechaCalculo.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (diasAtraso > 0) {
          // Fórmula: Monto * (tasaMoraDiaria / 100) * diasTranscurridos
          const interes = montoPendiente
            .times(tasaMoraDiaria.dividedBy(100))
            .times(diasAtraso)
          
          totalInteresMoratorio = totalInteresMoratorio.plus(interes)
          diasEnMoraTotal += diasAtraso
          
          detallesMora.push({
            fechaVencimiento,
            montoMensualidad: montoPendiente,
            diasAtraso,
            interes,
          })
        }
      }
    }
  }
  
  // 8. Encontrar próximo vencimiento
  let proximoVencimiento: Date | null = null
  for (let i = mensualidadesPagadas; i < vencimientos.length; i++) {
    if (vencimientos[i] >= fechaCalculo) {
      proximoVencimiento = vencimientos[i]
      break
    }
  }
  
  // 9. Calcular deuda total
  const totalDeuda = saldoCapital.plus(totalInteresMoratorio)
  
  // 10. Determinar si está en mora
  const estaEnMora = detallesMora.length > 0
  
  return {
    saldoCapital,
    mensualidadesPendientes: Math.max(0, mensualidadesPendientes),
    mensualidadesPagadas,
    diasEnMora: diasEnMoraTotal,
    interesMoratorio: totalInteresMoratorio,
    totalDeuda,
    proximoVencimiento,
    estaEnMora,
    detallesMora,
  }
}

/**
 * Formatea un Decimal a string de moneda MXN
 */
export function formatearMoneda(valor: Decimal | number | string): string {
  const num = new Decimal(valor.toString()).toNumber()
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Calcula el monto de mensualidad basado en precio, enganche y plazo
 */
export function calcularMensualidad(
  precioVenta: Decimal | number | string,
  enganche: Decimal | number | string,
  plazoMeses: number
): Decimal {
  const precio = new Decimal(precioVenta.toString())
  const eng = new Decimal(enganche.toString())
  const saldoFinanciar = precio.minus(eng)
  
  return saldoFinanciar.dividedBy(plazoMeses).toDecimalPlaces(2)
}

/**
 * Valida que el día de pago sea válido (1-28 para evitar problemas con meses cortos)
 */
export function validarDiaPago(dia: number): boolean {
  return dia >= 1 && dia <= 28
}

export { Decimal }
