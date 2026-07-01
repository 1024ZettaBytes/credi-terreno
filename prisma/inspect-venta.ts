/**
 * Diagnóstico SOLO LECTURA: imprime los campos de fecha de una venta y sus pagos
 * tal como están guardados en la base de datos. No modifica nada.
 *
 * Uso (cualquiera de estas):
 *   VENTA_ID=ckxxx bunx tsx prisma/inspect-venta.ts
 *   CLIENTE=canez   bunx tsx prisma/inspect-venta.ts     (búsqueda por nombre, insensible a mayúsculas)
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function iso(d: Date | null | undefined): string {
  return d ? d.toISOString() : "—"
}

async function main() {
  const ventaId = process.env.VENTA_ID
  const cliente = process.env.CLIENTE

  const ventas = await prisma.venta.findMany({
    where: ventaId
      ? { id: ventaId }
      : cliente
        ? { cliente: { nombre: { contains: cliente, mode: "insensitive" } } }
        : {},
    include: {
      cliente: { select: { nombre: true } },
      lote: { select: { numLote: true, manzana: { select: { nombre: true } } } },
      pagos: { orderBy: [{ fechaRegistro: "desc" }, { createdAt: "desc" }] },
    },
    orderBy: { createdAt: "desc" },
  })

  if (ventas.length === 0) {
    console.log("Sin resultados. Define VENTA_ID o CLIENTE.")
    return
  }

  for (const v of ventas) {
    console.log("\n============================================================")
    console.log(`Venta ${v.id}`)
    console.log(`  ${v.lote.manzana.nombre}-${v.lote.numLote} · ${v.cliente.nombre} · ${v.estatus}`)
    console.log(`  fechaVenta       = ${iso(v.fechaVenta)}`)
    console.log(`  diaPago          = ${v.diaPago}`)
    console.log(`  fechaPrimerPago  = ${iso(v.fechaPrimerPago)}`)
    console.log(`  proximaFechaPago = ${iso(v.proximaFechaPago)}`)
    console.log(`  numeroMensualidadActual = ${v.numeroMensualidadActual}`)
    console.log(`  --- pagos (${v.pagos.length}) ---`)
    console.log(
      `  ${"tipo".padEnd(14)} ${"monto".padEnd(10)} ${"fechaRegistro".padEnd(26)} ${"fechaPeriodo".padEnd(26)} periodo   createdAt`,
    )
    for (const p of v.pagos) {
      const periodo = p.periodoMes ? `${String(p.periodoMes).padStart(2, "0")}/${p.periodoAnio}` : "—"
      console.log(
        `  ${p.tipo.padEnd(14)} ${p.monto.toFixed(2).padEnd(10)} ${iso(p.fechaRegistro).padEnd(26)} ${iso(p.fechaPeriodo).padEnd(26)} ${periodo.padEnd(9)} ${iso(p.createdAt)}`,
      )
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
