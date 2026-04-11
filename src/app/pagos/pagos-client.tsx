"use client"

import { useState } from "react"
import { Plus, DollarSign, Search, Calendar, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { createPago, deletePago } from "@/app/actions/pagos"

interface Pago {
  id: string
  contratoId: string
  monto: string
  fechaPago: Date
  tipo: "ENGANCHE" | "MENSUALIDAD" | "INTERES_MORA" | "ABONO_CAPITAL" | "LIQUIDACION"
  numeroPago?: number | null
  periodoMes?: number | null
  periodoAnio?: number | null
  metodoPago: string
  referencia?: string | null
  contrato: {
    cliente: { nombreCompleto: string }
    terreno: { identificador: string }
  }
}

interface Contrato {
  id: string
  cliente: { nombreCompleto: string; telefono: string }
  terreno: { identificador: string }
  montoMensualidad: string
}

interface PagosClientProps {
  pagosIniciales: Pago[]
  contratosActivos: Contrato[]
}

const tipoLabels = {
  ENGANCHE: "Enganche",
  MENSUALIDAD: "Mensualidad",
  INTERES_MORA: "Interés Mora",
  ABONO_CAPITAL: "Abono Capital",
  LIQUIDACION: "Liquidación",
}

const tipoColores = {
  ENGANCHE: "secondary" as const,
  MENSUALIDAD: "default" as const,
  INTERES_MORA: "destructive" as const,
  ABONO_CAPITAL: "success" as const,
  LIQUIDACION: "success" as const,
}

const metodoLabels = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
}

function formatearMoneda(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num)
}

function formatearFecha(fecha: Date): string {
  return new Date(fecha).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function PagosClient({ pagosIniciales, contratosActivos }: PagosClientProps) {
  const [pagos, setPagos] = useState(pagosIniciales)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    contratoId: "",
    monto: "",
    fechaPago: new Date().toISOString().split("T")[0],
    tipo: "MENSUALIDAD" as const,
    metodoPago: "EFECTIVO",
    periodoMes: (new Date().getMonth() + 1).toString(),
    periodoAnio: new Date().getFullYear().toString(),
    referencia: "",
    notas: "",
  })

  const filteredPagos = pagos.filter(
    (p) =>
      p.contrato.cliente.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contrato.terreno.identificador.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calcular totales
  const totalHoy = pagos
    .filter((p) => new Date(p.fechaPago).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + parseFloat(p.monto), 0)

  const totalMes = pagos
    .filter((p) => {
      const fecha = new Date(p.fechaPago)
      const hoy = new Date()
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
    })
    .reduce((sum, p) => sum + parseFloat(p.monto), 0)

  const resetForm = () => {
    setFormData({
      contratoId: "",
      monto: "",
      fechaPago: new Date().toISOString().split("T")[0],
      tipo: "MENSUALIDAD",
      metodoPago: "EFECTIVO",
      periodoMes: (new Date().getMonth() + 1).toString(),
      periodoAnio: new Date().getFullYear().toString(),
      referencia: "",
      notas: "",
    })
    setError("")
  }

  const handleContratoChange = (contratoId: string) => {
    const contrato = contratosActivos.find((c) => c.id === contratoId)
    setFormData({
      ...formData,
      contratoId,
      monto: contrato?.montoMensualidad || "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const data = {
      contratoId: formData.contratoId,
      monto: parseFloat(formData.monto),
      fechaPago: new Date(formData.fechaPago),
      tipo: formData.tipo as any,
      metodoPago: formData.metodoPago as any,
      periodoMes: formData.tipo === "MENSUALIDAD" ? parseInt(formData.periodoMes) : undefined,
      periodoAnio: formData.tipo === "MENSUALIDAD" ? parseInt(formData.periodoAnio) : undefined,
      referencia: formData.referencia || undefined,
      notas: formData.notas || undefined,
    }

    try {
      const result = await createPago(data)

      if (result.success) {
        setIsDialogOpen(false)
        window.location.reload()
      } else {
        setError(result.error || "Error al registrar pago")
      }
    } catch (err) {
      setError("Error inesperado")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return

    setIsDeleting(true)
    const result = await deletePago(id)

    if (result.success) {
      setPagos(pagos.filter((p) => p.id !== id))
    } else {
      alert(result.error)
    }
    setIsDeleting(false)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Pagos
          </h1>
          <p className="text-muted-foreground">
            Historial de pagos registrados
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} disabled={contratosActivos.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {contratosActivos.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <p className="text-yellow-800">
            No hay contratos activos para registrar pagos.
          </p>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente o terreno..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pagos.length}</div>
            <p className="text-sm text-muted-foreground">Total de pagos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatearMoneda(totalHoy)}
            </div>
            <p className="text-sm text-muted-foreground">Cobrado hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {formatearMoneda(totalMes)}
            </div>
            <p className="text-sm text-muted-foreground">Cobrado este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de pagos */}
      <div className="grid gap-4">
        {filteredPagos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? "No se encontraron pagos con ese criterio"
                : "No hay pagos registrados."}
            </CardContent>
          </Card>
        ) : (
          filteredPagos.map((pago) => (
            <Card key={pago.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{pago.contrato.terreno.identificador}</h3>
                      <p className="text-sm text-muted-foreground">
                        {pago.contrato.cliente.nombreCompleto}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatearFecha(pago.fechaPago)}
                        </span>
                        {pago.referencia && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {pago.referencia}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatearMoneda(pago.monto)}</p>
                      <p className="text-sm text-muted-foreground">
                        {metodoLabels[pago.metodoPago as keyof typeof metodoLabels]}
                      </p>
                    </div>
                    <Badge variant={tipoColores[pago.tipo]}>
                      {tipoLabels[pago.tipo]}
                      {pago.tipo === "MENSUALIDAD" && pago.numeroPago && ` #${pago.numeroPago}`}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(pago.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de registrar pago */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registra un nuevo pago para un contrato
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contratoId">Contrato *</Label>
              <select
                id="contratoId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.contratoId}
                onChange={(e) => handleContratoChange(e.target.value)}
                required
              >
                <option value="">Selecciona un contrato</option>
                {contratosActivos.map((contrato) => (
                  <option key={contrato.id} value={contrato.id}>
                    {contrato.terreno.identificador} - {contrato.cliente.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaPago">Fecha de Pago *</Label>
                <Input
                  id="fechaPago"
                  type="date"
                  value={formData.fechaPago}
                  onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Pago *</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                >
                  <option value="MENSUALIDAD">Mensualidad</option>
                  <option value="ENGANCHE">Enganche</option>
                  <option value="INTERES_MORA">Interés Mora</option>
                  <option value="ABONO_CAPITAL">Abono a Capital</option>
                  <option value="LIQUIDACION">Liquidación</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metodoPago">Método de Pago</Label>
                <select
                  id="metodoPago"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            {formData.tipo === "MENSUALIDAD" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodoMes">Mes del Período</Label>
                  <select
                    id="periodoMes"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.periodoMes}
                    onChange={(e) => setFormData({ ...formData, periodoMes: e.target.value })}
                  >
                    {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((mes, i) => (
                      <option key={i + 1} value={i + 1}>{mes}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodoAnio">Año</Label>
                  <Input
                    id="periodoAnio"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.periodoAnio}
                    onChange={(e) => setFormData({ ...formData, periodoAnio: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia / Folio</Label>
              <Input
                id="referencia"
                placeholder="Ej: TRF-2026-001234"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
