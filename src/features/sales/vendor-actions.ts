"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { fail, failFromZod, ok, type ActionResult } from "@/lib/action-result"
import { requireAdmin, requireCaptura } from "@/lib/rbac"
import { vendedorSchema } from "./vendor-schemas"
import { getVendedorDetalle as queryVendedorDetalle } from "./vendor-queries"
import type { VendedorDetalleDTO } from "./vendor-queries"

export async function createVendedor(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireCaptura()
  const parsed = vendedorSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const { email, telefono, notas, ...rest } = parsed.data
  const v = await prisma.vendedor.create({
    data: {
      ...rest,
      email: email || null,
      telefono: telefono || null,
      notas: notas || null,
    },
  })
  revalidatePath("/vendedores")
  return ok({ id: v.id })
}

export async function updateVendedor(id: string, input: unknown): Promise<ActionResult<null>> {
  await requireCaptura()
  const parsed = vendedorSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)
  const { email, telefono, notas, ...rest } = parsed.data
  await prisma.vendedor.update({
    where: { id },
    data: {
      ...rest,
      email: email || null,
      telefono: telefono || null,
      notas: notas || null,
    },
  })
  revalidatePath("/vendedores")
  return ok(null)
}

export async function deleteVendedor(id: string): Promise<ActionResult<null>> {
  await requireAdmin()
  const ventas = await prisma.venta.count({ where: { vendedorId: id } })
  if (ventas > 0) {
    // soft-delete
    await prisma.vendedor.update({ where: { id }, data: { activo: false } })
    revalidatePath("/vendedores")
    return ok(null)
  }
  await prisma.vendedor.delete({ where: { id } })
  revalidatePath("/vendedores")
  return ok(null)
}

export async function getVendedorDetalle(
  id: string,
): Promise<ActionResult<VendedorDetalleDTO>> {
  await requireCaptura()
  const detalle = await queryVendedorDetalle(id)
  if (!detalle) return fail("Vendedor no encontrado")
  return ok(detalle)
}
