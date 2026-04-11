"use client"

import { useState } from "react"
import { MapPin, User, Home, DollarSign, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TerrenoConCliente, EstadoTerreno } from "@/types"

interface MapaTerrenosProps {
  terrenos: TerrenoConCliente[]
  onRegistrarPago?: (terrenoId: string) => void
  onCrearContrato?: (terrenoId: string) => void
}

// Colores según estado del terreno
const estadoColores: Record<EstadoTerreno, { bg: string; hoverBg: string; border: string; text: string }> = {
  DISPONIBLE: {
    bg: "bg-green-500",
    hoverBg: "hover:bg-green-600",
    border: "border-green-600",
    text: "text-white",
  },
  APARTADO: {
    bg: "bg-yellow-500",
    hoverBg: "hover:bg-yellow-600",
    border: "border-yellow-600",
    text: "text-white",
  },
  VENDIDO: {
    bg: "bg-red-500",
    hoverBg: "hover:bg-red-600",
    border: "border-red-600",
    text: "text-white",
  },
}

const estadoLabels: Record<EstadoTerreno, string> = {
  DISPONIBLE: "Disponible",
  APARTADO: "Apartado",
  VENDIDO: "Vendido",
}

function formatearMoneda(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num)
}

export function MapaTerrenos({ 
  terrenos, 
  onRegistrarPago, 
  onCrearContrato 
}: MapaTerrenosProps) {
  const [selectedTerreno, setSelectedTerreno] = useState<TerrenoConCliente | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleTerrenoClick = (terreno: TerrenoConCliente) => {
    setSelectedTerreno(terreno)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedTerreno(null)
  }

  // Ordenar terrenos por fecha de creación (los más antiguos primero, nuevos al final)
  const terrenosOrdenados = [...terrenos].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <MapPin className="h-5 w-5" />
          Mapa de Terrenos
        </CardTitle>
        <div className="flex flex-wrap gap-3 md:gap-4 mt-2">
          {(Object.keys(estadoLabels) as EstadoTerreno[]).map((estado) => (
            <div key={estado} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-3 h-3 md:w-4 md:h-4 rounded-full",
                  estadoColores[estado].bg
                )}
              />
              <span className="text-xs md:text-sm text-muted-foreground">
                {estadoLabels[estado]}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Grid responsivo de terrenos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {terrenosOrdenados.map((terreno) => {
            const colores = estadoColores[terreno.estado]
            const enMora = terreno.contratoActivo?.estado === "EN_MORA"
            
            return (
              <button
                key={terreno.id}
                onClick={() => handleTerrenoClick(terreno)}
                className={cn(
                  "relative flex flex-col items-center p-3 md:p-4 rounded-xl border-2 transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  colores.bg,
                  colores.hoverBg,
                  colores.border,
                  colores.text
                )}
              >
                {/* Indicador de mora */}
                {enMora && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                    <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                )}
                
                {/* Icono */}
                <Home className="h-6 w-6 md:h-8 md:w-8 mb-1" />
                
                {/* Identificador */}
                <span className="font-semibold text-xs md:text-sm text-center leading-tight">
                  {terreno.identificador}
                </span>
                
                {/* Cliente si existe */}
                {terreno.clienteActual && (
                  <span className="text-[10px] md:text-xs opacity-90 mt-1 truncate max-w-full text-center">
                    {terreno.clienteActual.nombreCompleto.split(' ')[0]}
                  </span>
                )}
              </button>
            )
          })}

          {/* Mensaje si no hay terrenos */}
          {terrenos.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No hay terrenos registrados
              </p>
              <p className="text-sm text-muted-foreground/70">
                Agrega terrenos desde la sección de Terrenos
              </p>
            </div>
          )}
        </div>

        {/* Resumen de terrenos */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6">
          <div className="bg-green-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xl md:text-2xl font-bold text-green-600">
              {terrenos.filter((t) => t.estado === "DISPONIBLE").length}
            </p>
            <p className="text-xs md:text-sm text-green-700">Disponibles</p>
          </div>
          <div className="bg-yellow-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xl md:text-2xl font-bold text-yellow-600">
              {terrenos.filter((t) => t.estado === "APARTADO").length}
            </p>
            <p className="text-xs md:text-sm text-yellow-700">Apartados</p>
          </div>
          <div className="bg-red-100 p-3 md:p-4 rounded-lg text-center">
            <p className="text-xl md:text-2xl font-bold text-red-600">
              {terrenos.filter((t) => t.estado === "VENDIDO").length}
            </p>
            <p className="text-xs md:text-sm text-red-700">Vendidos</p>
          </div>
        </div>
      </CardContent>

      {/* Dialog de información del terreno */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selectedTerreno && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  {selectedTerreno.identificador}
                </DialogTitle>
                <DialogDescription>
                  Información detallada del terreno
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Estado y precio */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Badge
                    variant={
                      selectedTerreno.estado === "DISPONIBLE"
                        ? "success"
                        : selectedTerreno.estado === "APARTADO"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {estadoLabels[selectedTerreno.estado]}
                  </Badge>
                  <span className="text-lg font-bold">
                    {formatearMoneda(selectedTerreno.precioLista)}
                  </span>
                </div>

                {/* Detalles del terreno */}
                {selectedTerreno.descripcion && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTerreno.descripcion}
                  </p>
                )}

                {/* Dimensiones si existen */}
                {selectedTerreno.superficie && (
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">Dimensiones</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Superficie:</span>
                        <p className="font-medium">{selectedTerreno.superficie} m²</p>
                      </div>
                      {selectedTerreno.frente && (
                        <div>
                          <span className="text-muted-foreground text-xs">Frente:</span>
                          <p className="font-medium">{selectedTerreno.frente} m</p>
                        </div>
                      )}
                      {selectedTerreno.fondo && (
                        <div>
                          <span className="text-muted-foreground text-xs">Fondo:</span>
                          <p className="font-medium">{selectedTerreno.fondo} m</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Información del cliente si está vendido o apartado */}
                {selectedTerreno.clienteActual && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">
                        Cliente Asignado
                      </p>
                    </div>
                    <p className="font-semibold text-sm md:text-base">
                      {selectedTerreno.clienteActual.nombreCompleto}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTerreno.clienteActual.telefono}
                    </p>
                  </div>
                )}

                {/* Información del contrato si existe */}
                {selectedTerreno.contratoActivo && (
                  <div className="bg-purple-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-800">
                        Contrato Activo
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Precio Venta:</span>
                        <p className="font-medium text-xs md:text-sm">
                          {formatearMoneda(selectedTerreno.contratoActivo.precioVenta)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Enganche:</span>
                        <p className="font-medium text-xs md:text-sm">
                          {formatearMoneda(selectedTerreno.contratoActivo.enganche)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Mensualidad:</span>
                        <p className="font-medium text-xs md:text-sm">
                          {formatearMoneda(selectedTerreno.contratoActivo.montoMensualidad)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Día de pago:</span>
                        <p className="font-medium text-xs md:text-sm">
                          Día {selectedTerreno.contratoActivo.diaPagoMensual}
                        </p>
                      </div>
                    </div>
                    
                    {/* Alerta de mora si aplica */}
                    {selectedTerreno.contratoActivo.estado === "EN_MORA" && (
                      <div className="flex items-center gap-2 text-red-600 mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Contrato en mora</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {selectedTerreno.estado === "DISPONIBLE" && onCrearContrato && (
                    <Button
                      onClick={() => {
                        onCrearContrato(selectedTerreno.id)
                        handleCloseDialog()
                      }}
                      className="flex-1"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Crear Contrato
                    </Button>
                  )}
                  
                  {selectedTerreno.contratoActivo && onRegistrarPago && (
                    <Button
                      onClick={() => {
                        onRegistrarPago(selectedTerreno.id)
                        handleCloseDialog()
                      }}
                      variant="secondary"
                      className="flex-1"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Registrar Pago
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={handleCloseDialog} className="sm:w-auto">
                    Cerrar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
