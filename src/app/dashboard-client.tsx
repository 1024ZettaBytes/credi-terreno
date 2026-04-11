"use client"

import { useState } from "react"
import { MapaTerrenos } from "@/components/terrenos/mapa-terrenos"
import { FormularioPago } from "@/components/pagos/formulario-pago"
import { Building, DollarSign, Users, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TerrenoConCliente } from "@/types"

interface DashboardClientProps {
  terrenos: TerrenoConCliente[]
}

export function DashboardClient({ terrenos }: DashboardClientProps) {
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [selectedTerrenoId, setSelectedTerrenoId] = useState<string | null>(null)

  // Estadísticas calculadas
  const totalTerrenos = terrenos.length
  const terrenosDisponibles = terrenos.filter(t => t.estado === "DISPONIBLE").length
  const terrenosVendidos = terrenos.filter(t => t.estado === "VENDIDO").length
  const contratosEnMora = terrenos.filter(t => t.contratoActivo?.estado === "EN_MORA").length

  const handleRegistrarPago = (terrenoId: string) => {
    setSelectedTerrenoId(terrenoId)
    setShowPagoForm(true)
  }

  const handleCrearContrato = (terrenoId: string) => {
    // Navegar a la página de crear contrato
    window.location.href = `/contratos?terrenoId=${terrenoId}`
  }

  return (
    <>
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Terrenos</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalTerrenos}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              En el fraccionamiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Disponibles</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{terrenosDisponibles}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Listos para venta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Vendidos</CardTitle>
            <Users className="h-4 w-4 text-red-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">{terrenosVendidos}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Con contrato
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">En Mora</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-orange-600">{contratosEnMora}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa de terrenos */}
      <MapaTerrenos
        terrenos={terrenos}
        onRegistrarPago={handleRegistrarPago}
        onCrearContrato={handleCrearContrato}
      />

      {/* Modal de registro de pago */}
      {showPagoForm && selectedTerrenoId && (
        <FormularioPago
          terrenoId={selectedTerrenoId}
          onClose={() => setShowPagoForm(false)}
          onSuccess={() => {
            setShowPagoForm(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
