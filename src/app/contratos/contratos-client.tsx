"use client"

import { useState } from "react"
import { Plus, FileText, Search, Calendar, DollarSign, XCircle, CheckCircle } from "lucide-react"
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
import { createContrato, cancelarContrato, liquidarContrato } from "@/app/actions/contratos"
import { Decimal } from "decimal.js"

interface Contrato {
  id: string
  clienteId: string
  terrenoId: string
  precioVenta: string
  enganche: string
  diaPagoMensual: number
  plazoMeses: number
  montoMensualidad: string
  tasaMoraDiaria: string
  estado: "ACTIVO" | "LIQUIDADO" | "CANCELADO" | "EN_MORA"
  fechaInicio: string
  fechaFin?: string | null
  createdAt: string
  updatedAt: string
  cliente: { id: string; nombreCompleto: string; telefono: string } | null
  terreno: { id: string; identificador: string } | null
  ultimoPago?: { id: string; monto: string; fechaPago: string; tipo: string } | null
}

interface Cliente {
  id: string
  nombreCompleto: string
  telefono: string
}

interface Terreno {
  id: string
  identificador: string
  precioLista: string
}

interface ContratosClientProps {
  contratosIniciales: Contrato[]
  clientes: Cliente[]
  terrenosDisponibles: Terreno[]
}

const estadoLabels = {
  ACTIVO: "Activo",
  LIQUIDADO: "Liquidado",
  CANCELADO: "Cancelado",
  EN_MORA: "En Mora",
}

const estadoColores = {
  ACTIVO: "success" as const,
  LIQUIDADO: "secondary" as const,
  CANCELADO: "outline" as const,
  EN_MORA: "destructive" as const,
}

function formatearMoneda(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num)
}

export function ContratosClient({
  contratosIniciales,
  clientes,
  terrenosDisponibles,
}: ContratosClientProps) {
  const [contratos, setContratos] = useState(contratosIniciales)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    clienteId: "",
    terrenoId: "",
    precioVenta: "",
    enganche: "",
    diaPagoMensual: "15",
    plazoMeses: "24",
    tasaMoraDiaria: "0.5",
  })

  // Calcular mensualidad en tiempo real
  const mensualidadCalculada = formData.precioVenta && formData.enganche && formData.plazoMeses
    ? new Decimal(formData.precioVenta || 0)
        .minus(formData.enganche || 0)
        .dividedBy(parseInt(formData.plazoMeses) || 1)
        .toDecimalPlaces(2)
        .toNumber()
    : 0

  const filteredContratos = contratos.filter(
    (c) =>
      c.cliente?.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.terreno?.identificador.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      clienteId: "",
      terrenoId: "",
      precioVenta: "",
      enganche: "",
      diaPagoMensual: "15",
      plazoMeses: "24",
      tasaMoraDiaria: "0.5",
    })
    setError("")
  }

  const handleTerrenoChange = (terrenoId: string) => {
    const terreno = terrenosDisponibles.find((t) => t.id === terrenoId)
    setFormData({
      ...formData,
      terrenoId,
      precioVenta: terreno?.precioLista || "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const data = {
      clienteId: formData.clienteId,
      terrenoId: formData.terrenoId,
      precioVenta: parseFloat(formData.precioVenta),
      enganche: parseFloat(formData.enganche),
      diaPagoMensual: parseInt(formData.diaPagoMensual),
      plazoMeses: parseInt(formData.plazoMeses),
      tasaMoraDiaria: parseFloat(formData.tasaMoraDiaria) / 100, // Convertir a decimal
    }

    try {
      const result = await createContrato(data)

      if (result.success) {
        setIsDialogOpen(false)
        window.location.reload()
      } else {
        setError(result.error || "Error al crear contrato")
      }
    } catch (err) {
      setError("Error inesperado")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelar = async (id: string) => {
    if (!confirm("¿Estás seguro de cancelar este contrato? El terreno se liberará.")) return

    const result = await cancelarContrato(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error)
    }
  }

  const handleLiquidar = async (id: string) => {
    if (!confirm("¿Confirmas que este contrato está completamente liquidado?")) return

    const result = await liquidarContrato(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Contratos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los contratos de venta
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} disabled={terrenosDisponibles.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contrato
        </Button>
      </div>

      {terrenosDisponibles.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <p className="text-yellow-800">
            No hay terrenos disponibles para crear nuevos contratos.
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {contratos.filter((c) => c.estado === "ACTIVO").length}
            </div>
            <p className="text-sm text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {contratos.filter((c) => c.estado === "EN_MORA").length}
            </div>
            <p className="text-sm text-muted-foreground">En Mora</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {contratos.filter((c) => c.estado === "LIQUIDADO").length}
            </div>
            <p className="text-sm text-muted-foreground">Liquidados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-400">
              {contratos.filter((c) => c.estado === "CANCELADO").length}
            </div>
            <p className="text-sm text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de contratos */}
      <div className="grid gap-4">
        {filteredContratos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? "No se encontraron contratos con ese criterio"
                : "No hay contratos registrados."}
            </CardContent>
          </Card>
        ) : (
          filteredContratos.map((contrato) => (
            <Card key={contrato.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{contrato.terreno?.identificador || "Sin terreno"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {contrato.cliente?.nombreCompleto || "Sin cliente"}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatearMoneda(contrato.precioVenta)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Día {contrato.diaPagoMensual}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatearMoneda(contrato.montoMensualidad)}/mes
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contrato.plazoMeses} meses
                      </p>
                    </div>
                    <Badge variant={estadoColores[contrato.estado]}>
                      {estadoLabels[contrato.estado]}
                    </Badge>
                    {contrato.estado === "ACTIVO" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLiquidar(contrato.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Liquidar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelar(contrato.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de crear contrato */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Contrato</DialogTitle>
            <DialogDescription>
              Crea un nuevo contrato de venta de terreno
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="clienteId">Cliente *</Label>
              <select
                id="clienteId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.clienteId}
                onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                required
              >
                <option value="">Selecciona un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombreCompleto} - {cliente.telefono}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terrenoId">Terreno *</Label>
              <select
                id="terrenoId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.terrenoId}
                onChange={(e) => handleTerrenoChange(e.target.value)}
                required
              >
                <option value="">Selecciona un terreno</option>
                {terrenosDisponibles.map((terreno) => (
                  <option key={terreno.id} value={terreno.id}>
                    {terreno.identificador} - {formatearMoneda(terreno.precioLista)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precioVenta">Precio de Venta *</Label>
                <Input
                  id="precioVenta"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precioVenta}
                  onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enganche">Enganche *</Label>
                <Input
                  id="enganche"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.enganche}
                  onChange={(e) => setFormData({ ...formData, enganche: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plazoMeses">Plazo (meses) *</Label>
                <Input
                  id="plazoMeses"
                  type="number"
                  min="1"
                  max="120"
                  value={formData.plazoMeses}
                  onChange={(e) => setFormData({ ...formData, plazoMeses: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diaPagoMensual">Día de Pago *</Label>
                <Input
                  id="diaPagoMensual"
                  type="number"
                  min="1"
                  max="28"
                  value={formData.diaPagoMensual}
                  onChange={(e) => setFormData({ ...formData, diaPagoMensual: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tasaMoraDiaria">Tasa de Mora Diaria (%)</Label>
              <Input
                id="tasaMoraDiaria"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={formData.tasaMoraDiaria}
                onChange={(e) => setFormData({ ...formData, tasaMoraDiaria: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje diario que se cobrará por cada día de atraso
              </p>
            </div>

            {/* Resumen calculado */}
            {mensualidadCalculada > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Mensualidad calculada:</strong> {formatearMoneda(mensualidadCalculada)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Total a financiar: {formatearMoneda(parseFloat(formData.precioVenta) - parseFloat(formData.enganche))}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear Contrato"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
