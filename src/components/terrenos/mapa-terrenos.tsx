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
const estadoColores: Record<EstadoTerreno, { bg: string; border: string; text: string }> = {
  DISPONIBLE: {
    bg: "bg-green-500",
    border: "border-green-600",
    text: "text-white",
  },
  APARTADO: {
    bg: "bg-yellow-500",
    border: "border-yellow-600",
    text: "text-white",
  },
  VENDIDO: {
    bg: "bg-red-500",
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa de Terrenos
        </CardTitle>
        <div className="flex gap-4 mt-2">
          {(Object.keys(estadoLabels) as EstadoTerreno[]).map((estado) => (
            <div key={estado} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-4 h-4 rounded-full",
                  estadoColores[estado].bg
                )}
              />
              <span className="text-sm text-muted-foreground">
                {estadoLabels[estado]}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Contenedor del mapa con posición relativa */}
        <div 
          className="relative w-full h-[600px] bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        >
          {/* Etiqueta del mapa */}
          <div className="absolute top-2 left-2 bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">
            Fraccionamiento - Vista Aérea
          </div>

          {/* Pins de terrenos */}
          {terrenos.map((terreno) => {
            const colores = estadoColores[terreno.estado]
            
            return (
              <button
                key={terreno.id}
                onClick={() => handleTerrenoClick(terreno)}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2",
                  "flex flex-col items-center gap-1",
                  "transition-all duration-200 hover:scale-110 hover:z-10",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1"
                )}
                style={{
                  left: `${terreno.coordenadaX}%`,
                  top: `${terreno.coordenadaY}%`,
                }}
              >
                {/* Pin/Cuadro del terreno */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 flex items-center justify-center shadow-lg",
                    colores.bg,
                    colores.border,
                    colores.text,
                    "font-bold text-xs"
                  )}
                >
                  <Home className="h-5 w-5" />
                </div>
                
                {/* Etiqueta del identificador */}
                <div className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-xs font-semibold shadow-md whitespace-nowrap">
                  {terreno.identificador}
                </div>
              </button>
            )
          })}

          {/* Mensaje si no hay terrenos */}
          {terrenos.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-500 dark:text-slate-400">
                No hay terrenos registrados
              </p>
            </div>
          )}
        </div>

        {/* Resumen de terrenos */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {terrenos.filter((t) => t.estado === "DISPONIBLE").length}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">Disponibles</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {terrenos.filter((t) => t.estado === "APARTADO").length}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Apartados</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {terrenos.filter((t) => t.estado === "VENDIDO").length}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">Vendidos</p>
          </div>
        </div>
      </CardContent>

      {/* Dialog de información del terreno */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
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
                <div className="flex items-center justify-between">
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
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm font-medium">Dimensiones</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Superficie:</span>
                        <p className="font-medium">{selectedTerreno.superficie} m²</p>
                      </div>
                      {selectedTerreno.frente && (
                        <div>
                          <span className="text-muted-foreground">Frente:</span>
                          <p className="font-medium">{selectedTerreno.frente} m</p>
                        </div>
                      )}
                      {selectedTerreno.fondo && (
                        <div>
                          <span className="text-muted-foreground">Fondo:</span>
                          <p className="font-medium">{selectedTerreno.fondo} m</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Información del cliente si está vendido o apartado */}
                {selectedTerreno.clienteActual && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Cliente Asignado
                      </p>
                    </div>
                    <p className="font-semibold">
                      {selectedTerreno.clienteActual.nombreCompleto}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTerreno.clienteActual.telefono}
                    </p>
                  </div>
                )}

                {/* Información del contrato si existe */}
                {selectedTerreno.contratoActivo && (
                  <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        Contrato Activo
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Precio Venta:</span>
                        <p className="font-medium">
                          {formatearMoneda(selectedTerreno.contratoActivo.precioVenta)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Enganche:</span>
                        <p className="font-medium">
                          {formatearMoneda(selectedTerreno.contratoActivo.enganche)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mensualidad:</span>
                        <p className="font-medium">
                          {formatearMoneda(selectedTerreno.contratoActivo.montoMensualidad)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Día de pago:</span>
                        <p className="font-medium">
                          Día {selectedTerreno.contratoActivo.diaPagoMensual}
                        </p>
                      </div>
                    </div>
                    
                    {/* Alerta de mora si aplica */}
                    {selectedTerreno.contratoActivo.estado === "EN_MORA" && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Contrato en mora</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
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
                  
                  <Button variant="outline" onClick={handleCloseDialog}>
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
