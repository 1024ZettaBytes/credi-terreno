# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The `@AGENTS.md` import above is mandatory reading: this is **Next.js 16** with breaking
> changes vs. older versions. Consult `node_modules/next/dist/docs/` and the bundled skill
> at `.agents/skills/next-best-practices/` before writing framework code.

## What this is

Credi-Terreno is an admin system (Spanish-language UI) for managing real-estate land credits:
lots (`Lote`) grouped into blocks (`Manzana`) are sold on installment plans (`Venta`) to clients
(`Cliente`), tracked through payments (`Pago`), title transfers (`Traspaso`), and contract
rescissions (`Recuperacion`). All financial math uses `Decimal.js` for precision.

## Commands

Package manager is **Bun** (note: `bun.lock` is gitignored; `package-lock.json` is committed).

```bash
bun dev                    # dev server (http://localhost:3000)
bun run build              # production build
bun run start              # serve production build
bun run lint               # eslint (eslint-config-next)
bunx prisma generate       # regenerate Prisma client after schema changes
bunx prisma db push        # push schema to DB (no migration files in use)
bunx tsx prisma/seed.ts    # seed users
```

There is **no test suite**. Typecheck via `bun run build` (TS `strict` is on, `noEmit`).

## Architecture

### Layered structure (Clean Architecture + feature folders)

- `src/features/<domain>/` — one folder per domain: `clients`, `payments`, `sales`, `inventory`.
  Each contains:
  - `actions.ts` — `"use server"` server actions (mutations). Always `requireRole` first,
    validate input with the Zod schema, do work in `prisma.$transaction`, `revalidatePath`, return `ActionResult`.
  - `queries.ts` — `"server-only"` read functions that map Prisma rows → DTOs (serialized).
  - `schemas.ts` — Zod input schemas + exported constraint objects for UI hints.
  - `sales/` also has `vendor-actions.ts` / `vendor-queries.ts` / `vendor-schemas.ts`.
- `src/lib/` — shared infra (see Key conventions below).
- `src/app/(app)/` — authenticated route group; each page is a server component that calls
  `queries.ts`, then renders a `*-client.tsx` client component for interactivity.
- `src/components/ui/` — Shadcn UI primitives; `src/components/layout/navigation.tsx` is the nav.
- `src/types/index.ts` — all DTO types (the serialized shapes returned by queries).

### Auth & RBAC

- NextAuth v5 (beta) with Credentials provider + Prisma adapter, **JWT** sessions (`src/lib/auth.ts`).
  Role is carried on the JWT/session.
- Three roles (`UserRole`): `ADMIN`, `CAPTURA`, `VISUALIZACION` (read-only).
- `src/middleware.ts` gates everything: redirects unauthenticated users to `/login` and
  restricts `/traspasos`, `/recuperaciones`, `/usuarios`, `/reportes` to `ADMIN`.
- **Every server action must re-check roles server-side** via `src/lib/rbac.ts` helpers
  (`requireAdmin`, `requireCaptura`, `requireUser`). Middleware is not sufficient. Use `canWrite`/`isAdmin`
  in client components only for UI gating.

### Money & dates (critical conventions)

- **Never use `number` for money.** Use `Decimal` from `src/lib/money.ts` (`toDecimal`, `decToString`,
  `formatearMoneda`). Prisma `Decimal` columns are stored as `.toFixed(2)` strings.
- **Serialization boundary:** Prisma `Decimal`/`Date` cannot cross to client components. Queries
  convert Decimals → strings (`.toFixed(2)`) and Dates → ISO strings. `src/lib/serialize.ts` does this
  generically; DTOs in `src/types` reflect the serialized (string) shapes.
- **Date-only handling:** timezone bugs are avoided by normalizing date-only values to **noon UTC**.
  Use `parseLocalDate` / `formatDateISO` / `todayLocal` from `src/lib/date.ts` — do not hand-roll `new Date("YYYY-MM-DD")`.

### Financial domain logic (`src/lib/finance.ts`)

This is the heart of the system — read it before touching credit/payment behavior:
- `calcularMensualidadBase`, `calcularComision`
- `fechaVencimientoMensualidad` — computes due date of installment N (handles month-end clamping).
- `calcularMoraDiaria` — late fee = `saldo × (tasa%/100) / 30 × díasAtraso`.
- `calcularEstadoCuenta` — derives full account state from the **live fields** on `Venta`.
- `semaforoCobranza` — collection traffic light (VERDE/AMARILLO/ROJO).

A `Venta` stores **live credit state** (`proximaFechaPago`, `saldoMensualidadActual`,
`numeroMensualidadActual`, `saldoCapital`) that is mutated transactionally on each payment.
Payment distribution logic (mora → mensualidad → capital) lives in `simularDistribucion` in
`src/features/payments/actions.ts` — the single source of truth for both preview and recording.

### Database

PostgreSQL via Prisma 6 (`prisma/schema.prisma`). Schema-push workflow (no migrations dir).
Lot lifecycle: `DISPONIBLE → VENDIDO`, then `RECUPERADO` (rescinded, reactivatable) or `TRASPASADO`.
Sale lifecycle: `ACTIVO → LIQUIDADO | TRASPASADO | CANCELADO`. `prisma.ts` exports a singleton client.

### File storage

`src/lib/storage.ts` uploads to Google Cloud Storage when `CLOUD_*` env vars are set; otherwise
falls back to a no-op "dummy" mode returning placeholder `/uploads/...` URLs so dev/build work
without secrets. Used for client expedientes and payment comprobantes. Server action body limit is 5mb
(`next.config.ts`); `MAX_UPLOAD_SIZE_MB` is 10.

## Conventions to follow

- Server actions return `ActionResult<T>` (`src/lib/action-result.ts`): `ok(data)` / `fail(msg)` /
  `failFromZod(err)`. Don't throw across the action boundary for expected failures.
- UI strings, comments, and domain terms are in **Spanish** — match the existing language.
- Map DB errors to friendly messages (see `toFriendlyDbError` in `sales/actions.ts`).
