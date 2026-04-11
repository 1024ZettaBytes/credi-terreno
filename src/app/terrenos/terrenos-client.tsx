"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { createTerreno, updateTerreno, deleteTerreno } from "@/app/actions/terrenos"
import type { TerrenoConCliente, EstadoTerreno } from "@/types"

interface TerrenosClientProps {
  terrenosIniciales: TerrenoConCliente[]
}

const estadoLabels: Record<EstadoTerreno, string> = {
  DISPONIBLE: "Disponible",
  APARTADO: "Apartado",
  VENDIDO: "Vendido",
}

const estadoColores: Record<EstadoTerreno, "success" | "warning" | "destructive"> = {
  DISPONIBLE: "success",
  APARTADO: "warning",
  VENDIDO: "destructive",
}

function formatearMoneda(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num)
}

export function TerrenosClient({ terrenosIniciales }: TerrenosClientProps) {
  const [terrenos, setTerrenos] = useState(terrenosIniciales)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedTerreno, setSelectedTerreno] = useState<TerrenoConCliente | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    identificador: "",
    descripcion: "",
    precioLista: "",
    estado: "DISPONIBLE" as EstadoTerreno,
    coordenadaX: "50",
    coordenadaY: "50",
    superficie: "",
    frente: "",
    fondo: "",
  })

  const filteredTerrenos = terrenos.filter(
    (t) =>
      t.identificador.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      identificador: "",
      descripcion: "",
      precioLista: "",
      estado: "DISPONIBLE",
      coordenadaX: "50",
      coordenadaY: "50",
      superficie: "",
      frente: "",
      fondo: "",
    })
    setSelectedTerreno(null)
    setError("")
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (terreno: TerrenoConCliente) => {
    setSelectedTerreno(terreno)
    setFormData({
      identificador: terreno.identificador,
      descripcion: terreno.descripcion || "",
      precioLista: terreno.precioLista,
      estado: terreno.estado,
      coordenadaX: terreno.coordenadaX.toString(),
      coordenadaY: terreno.coordenadaY.toString(),
      superficie: terreno.superficie?.toString() || "",
      frente: terreno.frente?.toString() || "",
      fondo: terreno.fondo?.toString() || "",
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const data = {
      identificador: formData.identificador,
      descripcion: formData.descripcion || undefined,
      precioLista: parseFloat(formData.precioLista),
      estado: formData.estado,
      coordenadaX: parseFloat(formData.coordenadaX),
      coordenadaY: parseFloat(formData.coordenadaY),
      superficie: formData.superficie ? parseFloat(formData.superficie) : undefined,
      frente: formData.frente ? parseFloat(formData.frente) : undefined,
      fondo: formData.fondo ? parseFloat(formData.fondo) : undefined,
    }

    try {
      const result = selectedTerreno
        ? await updateTerreno(selectedTerreno.id, data)
        : await createTerreno(data)

      if (result.success) {
        setIsDialogOpen(false)
        // Refrescar página para obtener datos actualizados
        window.location.reload()
      } else {
        setError(result.error || "Error al guardar")
      }
    } catch (err) {
      setError("Error inesperado")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este terreno?")) return

    setIsDeleting(true)
    const result = await deleteTerreno(id)

    if (result.success) {
      setTerrenos(terrenos.filter((t) => t.id !== id))
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
            <MapPin className="h-8 w-8" />
            Terrenos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los terrenos del fraccionamiento
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Terreno
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar terrenos..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {terrenos.filter((t) => t.estado === "DISPONIBLE").length}
            </div>
            <p className="text-sm text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {terrenos.filter((t) => t.estado === "APARTADO").length}
            </div>
            <p className="text-sm text-muted-foreground">Apartados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {terrenos.filter((t) => t.estado === "VENDIDO").length}
            </div>
            <p className="text-sm text-muted-foreground">Vendidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de terrenos */}
      <div className="grid gap-4">
        {filteredTerrenos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? "No se encontraron terrenos con ese criterio"
                : "No hay terrenos registrados. Crea el primero."}
            </CardContent>
          </Card>
        ) : (
          filteredTerrenos.map((terreno) => (
            <Card key={terreno.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${
                        terreno.estado === "DISPONIBLE"
                          ? "bg-green-500"
                          : terreno.estado === "APARTADO"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{terreno.identificador}</h3>
                      <p className="text-sm text-muted-foreground">
                        {terreno.descripcion || "Sin descripción"}
                      </p>
                      {terreno.clienteActual && (
                        <p className="text-sm text-blue-600">
                          Cliente: {terreno.clienteActual.nombreCompleto}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatearMoneda(terreno.precioLista)}
                      </p>
                      {terreno.superficie && (
                        <p className="text-sm text-muted-foreground">
                          {terreno.superficie} m²
                        </p>
                      )}
                    </div>
                    <Badge variant={estadoColores[terreno.estado]}>
                      {estadoLabels[terreno.estado]}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(terreno)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(terreno.id)}
                        disabled={isDeleting || terreno.estado !== "DISPONIBLE"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedTerreno ? "Editar Terreno" : "Nuevo Terreno"}
            </DialogTitle>
            <DialogDescription>
              {selectedTerreno
                ? "Modifica los datos del terreno"
                : "Ingresa los datos del nuevo terreno"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identificador">Identificador *</Label>
              <Input
                id="identificador"
                placeholder="Ej: Lote 5, Manzana A"
                value={formData.identificador}
                onChange={(e) =>
                  setFormData({ ...formData, identificador: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                placeholder="Descripción del terreno"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precioLista">Precio de Lista *</Label>
                <Input
                  id="precioLista"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="350000.00"
                  value={formData.precioLista}
                  onChange={(e) =>
                    setFormData({ ...formData, precioLista: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <select
                  id="estado"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estado: e.target.value as EstadoTerreno,
                    })
                  }
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="APARTADO">Apartado</option>
                  <option value="VENDIDO">Vendido</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coordenadaX">Posición X (%) *</Label>
                <Input
                  id="coordenadaX"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.coordenadaX}
                  onChange={(e) =>
                    setFormData({ ...formData, coordenadaX: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordenadaY">Posición Y (%) *</Label>
                <Input
                  id="coordenadaY"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.coordenadaY}
                  onChange={(e) =>
                    setFormData({ ...formData, coordenadaY: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="superficie">Superficie (m²)</Label>
                <Input
                  id="superficie"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.superficie}
                  onChange={(e) =>
                    setFormData({ ...formData, superficie: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frente">Frente (m)</Label>
                <Input
                  id="frente"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.frente}
                  onChange={(e) =>
                    setFormData({ ...formData, frente: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fondo">Fondo (m)</Label>
                <Input
                  id="fondo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fondo}
                  onChange={(e) =>
                    setFormData({ ...formData, fondo: e.target.value })
                  }
                />
              </div>
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
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
