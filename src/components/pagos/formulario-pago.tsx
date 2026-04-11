"use client"

import { useState } from "react"
import { DollarSign, Calendar, CreditCard, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TipoPago, MetodoPago } from "@/types"

interface FormularioPagoProps {
  terrenoId: string
  contratoId?: string
  onClose: () => void
  onSuccess: () => void
}

const TIPOS_PAGO: { value: TipoPago; label: string }[] = [
  { value: "MENSUALIDAD", label: "Mensualidad" },
  { value: "ENGANCHE", label: "Enganche" },
  { value: "INTERES_MORA", label: "Interés por Mora" },
  { value: "ABONO_CAPITAL", label: "Abono a Capital" },
  { value: "LIQUIDACION", label: "Liquidación Total" },
]

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia Bancaria" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TARJETA", label: "Tarjeta de Crédito/Débito" },
  { value: "OTRO", label: "Otro" },
]

export function FormularioPago({
  terrenoId,
  contratoId,
  onClose,
  onSuccess,
}: FormularioPagoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    monto: "",
    fechaPago: new Date().toISOString().split("T")[0],
    tipo: "MENSUALIDAD" as TipoPago,
    metodoPago: "EFECTIVO" as MetodoPago,
    referencia: "",
    notas: "",
    periodoMes: new Date().getMonth() + 1,
    periodoAnio: new Date().getFullYear(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      newErrors.monto = "El monto debe ser mayor a 0"
    }

    if (!formData.fechaPago) {
      newErrors.fechaPago = "La fecha de pago es requerida"
    }

    if (formData.tipo === "MENSUALIDAD") {
      if (!formData.periodoMes || formData.periodoMes < 1 || formData.periodoMes > 12) {
        newErrors.periodoMes = "Mes inválido"
      }
      if (!formData.periodoAnio || formData.periodoAnio < 2020) {
        newErrors.periodoAnio = "Año inválido"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Aquí iría la llamada a la API para guardar el pago
      const payload = {
        contratoId: contratoId || terrenoId, // Usar contratoId si existe
        monto: parseFloat(formData.monto),
        fechaPago: new Date(formData.fechaPago).toISOString(),
        tipo: formData.tipo,
        metodoPago: formData.metodoPago,
        referencia: formData.referencia || null,
        notas: formData.notas || null,
        periodoMes: formData.tipo === "MENSUALIDAD" ? formData.periodoMes : null,
        periodoAnio: formData.tipo === "MENSUALIDAD" ? formData.periodoAnio : null,
      }

      console.log("Registrando pago:", payload)

      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onSuccess()
    } catch (error) {
      console.error("Error al registrar pago:", error)
      setErrors({ submit: "Error al registrar el pago. Intente nuevamente." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ""
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(num)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Complete los datos del pago para el terreno seleccionado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto del Pago *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-10"
                value={formData.monto}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, monto: e.target.value }))
                }
              />
            </div>
            {formData.monto && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(formData.monto)}
              </p>
            )}
            {errors.monto && (
              <p className="text-sm text-red-500">{errors.monto}</p>
            )}
          </div>

          {/* Fecha de pago */}
          <div className="space-y-2">
            <Label htmlFor="fechaPago">Fecha de Pago *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fechaPago"
                type="date"
                className="pl-10"
                value={formData.fechaPago}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fechaPago: e.target.value }))
                }
              />
            </div>
            {errors.fechaPago && (
              <p className="text-sm text-red-500">{errors.fechaPago}</p>
            )}
          </div>

          {/* Tipo de pago */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Pago *</Label>
            <select
              id="tipo"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.tipo}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  tipo: e.target.value as TipoPago,
                }))
              }
            >
              {TIPOS_PAGO.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Período (solo si es mensualidad) */}
          {formData.tipo === "MENSUALIDAD" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodoMes">Mes del Período *</Label>
                <select
                  id="periodoMes"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.periodoMes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      periodoMes: parseInt(e.target.value),
                    }))
                  }
                >
                  {[
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                  ].map((mes, index) => (
                    <option key={index + 1} value={index + 1}>
                      {mes}
                    </option>
                  ))}
                </select>
                {errors.periodoMes && (
                  <p className="text-sm text-red-500">{errors.periodoMes}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodoAnio">Año del Período *</Label>
                <Input
                  id="periodoAnio"
                  type="number"
                  min="2020"
                  max="2030"
                  value={formData.periodoAnio}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      periodoAnio: parseInt(e.target.value),
                    }))
                  }
                />
                {errors.periodoAnio && (
                  <p className="text-sm text-red-500">{errors.periodoAnio}</p>
                )}
              </div>
            </div>
          )}

          {/* Método de pago */}
          <div className="space-y-2">
            <Label htmlFor="metodoPago">Método de Pago</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                id="metodoPago"
                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.metodoPago}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    metodoPago: e.target.value as MetodoPago,
                  }))
                }
              >
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label htmlFor="referencia">Número de Referencia / Folio</Label>
            <Input
              id="referencia"
              placeholder="Ej: TRF-2026-001234"
              value={formData.referencia}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, referencia: e.target.value }))
              }
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas Adicionales</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                id="notas"
                rows={3}
                placeholder="Observaciones sobre el pago..."
                className="flex w-full rounded-md border border-input bg-background pl-10 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.notas}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notas: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Error general */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.submit}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Guardando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Registrar Pago
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
