# CrediTerreno - Sistema de Gestión de Créditos Inmobiliarios

Sistema administrativo avanzado para gestión de créditos inmobiliarios desarrollado con Next.js 16, Prisma, PostgreSQL y Shadcn UI.

## Características

- **Dashboard de Terrenos (Mapa Visual)**: Visualización interactiva de terrenos con colores según estado (verde: disponible, amarillo: apartado, rojo: vendido)
- **Gestión de Clientes**: Registro completo de clientes con información de contacto
- **Contratos de Venta**: Manejo de contratos con enganche, mensualidades y tasas de mora
- **Registro de Pagos**: Sistema de pagos con validación y tipos (mensualidad, enganche, mora)
- **Cálculo de Interés Moratorio**: Lógica financiera precisa usando Decimal.js
- **Autenticación**: Sistema de login con NextAuth.js

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Base de Datos**: PostgreSQL con Prisma ORM
- **UI**: Shadcn UI + Tailwind CSS
- **Autenticación**: NextAuth.js
- **Iconos**: Lucide React
- **Cálculos Financieros**: Decimal.js

## Requisitos Previos

- Node.js 20.10.0 (ver engines en package.json)
- PostgreSQL
- Bun (gestor de paquetes)

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd credi-terreno

# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración de base de datos

# Generar cliente de Prisma
bunx prisma generate

# Ejecutar migraciones
bunx prisma db push

# Iniciar servidor de desarrollo
bun dev
```

## Variables de Entorno

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:password@localhost:5432/credi_terreno?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secreto-super-seguro"
```

## Estructura del Proyecto

```
src/
├── app/                    # Rutas de Next.js (App Router)
│   ├── api/auth/          # API de autenticación
│   ├── login/             # Página de login
│   └── page.tsx           # Dashboard principal
├── components/
│   ├── ui/                # Componentes Shadcn UI
│   ├── terrenos/          # Componentes de terrenos
│   └── pagos/             # Componentes de pagos
├── lib/
│   ├── auth.ts            # Configuración NextAuth
│   ├── financiero.ts      # Lógica de cálculo de deudas/mora
│   ├── prisma.ts          # Cliente Prisma
│   └── utils.ts           # Utilidades
├── types/                 # Tipos TypeScript
└── prisma/
    └── schema.prisma      # Schema de base de datos
```

## Modelos de Datos

### Cliente
- nombreCompleto, domicilio, telefono, email, curp, rfc

### Terreno
- identificador (ej: "Lote 5, Manzana A")
- precioLista, estado (DISPONIBLE, APARTADO, VENDIDO)
- coordenadaX, coordenadaY (para mapa visual)
- superficie, frente, fondo

### Contrato
- relación Cliente-Terreno
- precioVenta, enganche, diaPagoMensual
- plazoMeses, montoMensualidad
- tasaMoraDiaria (porcentaje decimal)

### Pago
- monto, fechaPago
- tipo (ENGANCHE, MENSUALIDAD, INTERES_MORA, ABONO_CAPITAL, LIQUIDACION)
- metodoPago, referencia

## Lógica Financiera

El sistema calcula automáticamente:
- **Interés Moratorio**: `Monto_Mensualidad × (tasaMoraDiaria / 100) × días_transcurridos`
- **Deuda Total**: Saldo capital + intereses acumulados
- **Estado de Mora**: Detecta automáticamente pagos vencidos

## Getting Started

First, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
