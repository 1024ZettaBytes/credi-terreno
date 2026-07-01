/**
 * Backfill de `Venta.fechaPrimerPago` para ventas creadas antes de capturar
 * explícitamente la fecha del primer pago.
 *
 * Reproduce la lógica HISTÓRICA de `fechaVencimientoMensualidad` (basada en
 * fechaVenta + diaPago + offset) para que el calendario de cada crédito vigente
 * quede EXACTAMENTE igual que antes del cambio. Solo toca filas con
 * fechaPrimerPago = null y es idempotente.
 *
 * Uso:  bunx tsx prisma/backfill-fecha-primer-pago.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/** Lógica histórica: ancla de la mensualidad #1 a partir de fechaVenta + diaPago. */
function anclaHistorica(fechaVenta: Date, diaPago: number): Date {
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

async function main() {
  const ventas = await prisma.venta.findMany({
    where: { fechaPrimerPago: null },
    select: { id: true, fechaVenta: true, diaPago: true },
  })

  console.log(`Ventas a rellenar: ${ventas.length}`)
  let n = 0
  for (const v of ventas) {
    const fechaPrimerPago = anclaHistorica(v.fechaVenta, v.diaPago)
    await prisma.venta.update({
      where: { id: v.id },
      data: { fechaPrimerPago },
    })
    n++
  }
  console.log(`Listo. ${n} ventas actualizadas.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
