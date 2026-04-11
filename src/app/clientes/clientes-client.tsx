"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Users, Search, Phone, Mail } from "lucide-react"
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
import { createCliente, updateCliente, deleteCliente } from "@/app/actions/clientes"

interface Cliente {
  id: string
  nombreCompleto: string
  domicilio: string
  telefono: string
  email?: string | null
  curp?: string | null
  rfc?: string | null
  contratosActivos: number
}

interface ClientesClientProps {
  clientesIniciales: Cliente[]
}

export function ClientesClient({ clientesIniciales }: ClientesClientProps) {
  const [clientes, setClientes] = useState(clientesIniciales)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    nombreCompleto: "",
    domicilio: "",
    telefono: "",
    email: "",
    curp: "",
    rfc: "",
  })

  const filteredClientes = clientes.filter(
    (c) =>
      c.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.telefono.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      nombreCompleto: "",
      domicilio: "",
      telefono: "",
      email: "",
      curp: "",
      rfc: "",
    })
    setSelectedCliente(null)
    setError("")
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setFormData({
      nombreCompleto: cliente.nombreCompleto,
      domicilio: cliente.domicilio,
      telefono: cliente.telefono,
      email: cliente.email || "",
      curp: cliente.curp || "",
      rfc: cliente.rfc || "",
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const data = {
      nombreCompleto: formData.nombreCompleto,
      domicilio: formData.domicilio,
      telefono: formData.telefono,
      email: formData.email || undefined,
      curp: formData.curp || undefined,
      rfc: formData.rfc || undefined,
    }

    try {
      const result = selectedCliente
        ? await updateCliente(selectedCliente.id, data)
        : await createCliente(data)

      if (result.success) {
        setIsDialogOpen(false)
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
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return

    setIsDeleting(true)
    const result = await deleteCliente(id)

    if (result.success) {
      setClientes(clientes.filter((c) => c.id !== id))
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
            <Users className="h-8 w-8" />
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gestiona los clientes registrados
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Resumen */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{clientes.length}</div>
          <p className="text-sm text-muted-foreground">Clientes registrados</p>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <div className="grid gap-4">
        {filteredClientes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? "No se encontraron clientes con ese criterio"
                : "No hay clientes registrados. Crea el primero."}
            </CardContent>
          </Card>
        ) : (
          filteredClientes.map((cliente) => (
            <Card key={cliente.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cliente.nombreCompleto}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cliente.domicilio}
                      </p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {cliente.telefono}
                        </span>
                        {cliente.email && (
                          <span className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {cliente.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {cliente.contratosActivos > 0 && (
                      <Badge variant="secondary">
                        {cliente.contratosActivos} contrato(s)
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(cliente)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(cliente.id)}
                        disabled={isDeleting || cliente.contratosActivos > 0}
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
              {selectedCliente ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {selectedCliente
                ? "Modifica los datos del cliente"
                : "Ingresa los datos del nuevo cliente"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
              <Input
                id="nombreCompleto"
                placeholder="Juan Pérez López"
                value={formData.nombreCompleto}
                onChange={(e) =>
                  setFormData({ ...formData, nombreCompleto: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domicilio">Domicilio *</Label>
              <Input
                id="domicilio"
                placeholder="Calle Principal #123, Colonia Centro"
                value={formData.domicilio}
                onChange={(e) =>
                  setFormData({ ...formData, domicilio: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  placeholder="614-123-4567"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="curp">CURP</Label>
                <Input
                  id="curp"
                  placeholder="XXXX000000XXXXXX00"
                  value={formData.curp}
                  onChange={(e) =>
                    setFormData({ ...formData, curp: e.target.value.toUpperCase() })
                  }
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  placeholder="XXXX000000XXX"
                  value={formData.rfc}
                  onChange={(e) =>
                    setFormData({ ...formData, rfc: e.target.value.toUpperCase() })
                  }
                  maxLength={13}
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
