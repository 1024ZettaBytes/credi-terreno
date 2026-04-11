"use client"

import { useState } from "react"
import { Building, Lock, Mail, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validación básica
      if (!formData.email || !formData.password) {
        setError("Por favor complete todos los campos")
        return
      }

      // Aquí iría la llamada a NextAuth.js signIn
      // import { signIn } from "next-auth/react"
      // const result = await signIn("credentials", {
      //   email: formData.email,
      //   password: formData.password,
      //   redirect: false,
      // })
      
      console.log("Intentando login con:", formData.email)
      
      // Simulación para demo
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Redirigir a dashboard
      window.location.href = "/"
      
    } catch (err) {
      setError("Credenciales inválidas. Intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="bg-primary rounded-full p-3">
              <Building className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold">CrediTerreno</CardTitle>
            <CardDescription className="mt-2">
              Sistema de Gestión de Créditos Inmobiliarios
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@crediterreno.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">
                  Recordarme
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                ¿Olvidó su contraseña?
              </a>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Al iniciar sesión, acepta nuestros{" "}
              <a href="/terms" className="underline hover:text-primary">
                Términos de Servicio
              </a>{" "}
              y{" "}
              <a href="/privacy" className="underline hover:text-primary">
                Política de Privacidad
              </a>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Demo credentials hint */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg px-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Demo: <span className="font-mono">admin@crediterreno.com</span> / <span className="font-mono">admin123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
