"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { Decimal } from "@/lib/money"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireAdmin, requireUser } from "@/lib/rbac"
import { manzanaSchema, loteSchema } from "./schemas"

export async function createManzana(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()
  const parsed = manzanaSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  try {
    const m = await prisma.manzana.create({ data: parsed.data })
    revalidatePath("/inventario")
    return ok({ id: m.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    if (msg.includes("Unique")) return fail("Ya existe una manzana con ese nombre")
    return fail(msg)
  }
}

export async function updateManzana(id: string, input: unknown): Promise<ActionResult<null>> {
  await requireAdmin()
  const parsed = manzanaSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  await prisma.manzana.update({ where: { id }, data: parsed.data })
  revalidatePath("/inventario")
  return ok(null)
}

export async function deleteManzana(id: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const lotes = await prisma.lote.count({ where: { manzanaId: id } })
  if (lotes > 0) return fail("No se puede eliminar: la manzana tiene lotes asociados")
  await prisma.manzana.delete({ where: { id } })
  revalidatePath("/inventario")
  return ok(null)
}

export async function createLote(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser()
  const parsed = loteSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const { superficieM2, precioM2, ...rest } = parsed.data
  const total = new Decimal(superficieM2).times(precioM2).toDecimalPlaces(2)
  try {
    const l = await prisma.lote.create({
      data: {
        ...rest,
        superficieM2: new Decimal(superficieM2).toFixed(2),
        precioM2: new Decimal(precioM2).toFixed(2),
        totalPrecio: total.toFixed(2),
      },
    })
    revalidatePath("/inventario")
    return ok({ id: l.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    if (msg.includes("Unique")) return fail("Ya existe ese lote en la manzana")
    return fail(msg)
  }
}

export async function updateLote(id: string, input: unknown): Promise<ActionResult<null>> {
  await requireUser()
  const parsed = loteSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const { superficieM2, precioM2, ...rest } = parsed.data
  const total = new Decimal(superficieM2).times(precioM2).toDecimalPlaces(2)
  await prisma.lote.update({
    where: { id },
    data: {
      ...rest,
      superficieM2: new Decimal(superficieM2).toFixed(2),
      precioM2: new Decimal(precioM2).toFixed(2),
      totalPrecio: total.toFixed(2),
    },
  })
  revalidatePath("/inventario")
  return ok(null)
}

export async function deleteLote(id: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const ventas = await prisma.venta.count({ where: { loteId: id } })
  if (ventas > 0) return fail("No se puede eliminar: el lote tiene ventas registradas")
  await prisma.lote.delete({ where: { id } })
  revalidatePath("/inventario")
  return ok(null)
}
