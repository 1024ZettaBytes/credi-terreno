"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit2, Trash2, Layers, MapPin, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FieldError, FieldHint, FormError } from "@/components/ui/field-error";
import { DatePicker } from "@/components/ui/date-picker";
import { formatearMoneda, formatearFecha } from "@/lib/money";
import { RECARGO_SIN_ENGANCHE } from "@/lib/finance";
import { parseLocalDate, todayLocal, formatDateISO } from "@/lib/date";

/** Devuelve la fecha (YYYY-MM-DD) un mes después de la fecha dada, recortando fin de mes. */
function unMesDespues(isoDate: string): string {
  const base = parseLocalDate(isoDate);
  const d = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      12,
      0,
      0,
    ),
  );
  if (d.getUTCDate() !== base.getUTCDate()) d.setUTCDate(0);
  return formatDateISO(d);
}
import {
  createManzana,
  updateManzana,
  deleteManzana,
  createLote,
  updateLote,
  deleteLote,
} from "@/features/inventory/actions";
import {
  manzanaConstraints,
  loteConstraints,
} from "@/features/inventory/schemas";
import { createVenta } from "@/features/sales/actions";
import type {
  ManzanaDTO,
  LoteDTO,
  ClienteDTO,
  VendedorDTO,
  EstatusLote,
} from "@/types";
import type { UserRole } from "@prisma/client";

const estatusColor: Record<
  EstatusLote,
  "success" | "warning" | "destructive" | "secondary"
> = {
  DISPONIBLE: "success",
  VENDIDO: "destructive",
  RECUPERADO: "warning",
  TRASPASADO: "secondary",
};

interface Props {
  manzanas: ManzanaDTO[];
  lotes: LoteDTO[];
  clientes: ClienteDTO[];
  vendedores: VendedorDTO[];
  userRole: UserRole;
}

export function InventarioClient({
  manzanas,
  lotes,
  clientes,
  vendedores,
  userRole,
}: Props) {
  const canEdit = userRole === "ADMIN" || userRole === "CAPTURA";
  const isAdmin = userRole === "ADMIN";
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filtroManzana, setFiltroManzana] = useState<string>("");
  const [filtroEstatus, setFiltroEstatus] = useState<string>("");

  const [openManzana, setOpenManzana] = useState(false);
  const [editManzana, setEditManzana] = useState<ManzanaDTO | null>(null);
  const [openLote, setOpenLote] = useState(false);
  const [editLote, setEditLote] = useState<LoteDTO | null>(null);
  const [openVender, setOpenVender] = useState<LoteDTO | null>(null);

  const lotesFiltrados = lotes.filter((l) => {
    if (filtroManzana && l.manzanaId !== filtroManzana) return false;
    if (filtroEstatus && l.estatus !== filtroEstatus) return false;
    return true;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">Manzanas y lotes</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditManzana(null);
                setOpenManzana(true);
              }}
            >
              <Layers className="h-4 w-4" /> Nueva manzana
            </Button>
            <Button
              onClick={() => {
                setEditLote(null);
                setOpenLote(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo lote
            </Button>
          </div>
        )}
      </div>

      {/* Manzanas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Manzanas ({manzanas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {manzanas.map((m) => (
              <div
                key={m.id}
                className="border rounded-lg p-3 group hover:border-slate-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <Link
                    href={`/inventario/${m.id}`}
                    className="min-w-0 group/link"
                  >
                    <p className="font-semibold truncate group-hover/link:underline">
                      {m.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.totalLotes ?? 0} lotes
                    </p>
                  </Link>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    {canEdit && (
                      <button
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => {
                          setEditManzana(m);
                          setOpenManzana(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (!confirm(`Eliminar manzana ${m.nombre}?`)) return;
                          startTransition(async () => {
                            const r = await deleteManzana(m.id);
                            if (!r.ok) alert(r.error);
                            router.refresh();
                          });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {manzanas.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                Sin manzanas. Crea una para empezar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros + Lotes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">
              Lotes ({lotesFiltrados.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={filtroManzana || "ALL"}
                onValueChange={(v) => setFiltroManzana(v === "ALL" ? "" : v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Manzana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {manzanas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filtroEstatus || "ALL"}
                onValueChange={(v) => setFiltroEstatus(v === "ALL" ? "" : v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="VENDIDO">Vendido</SelectItem>
                  <SelectItem value="RECUPERADO">Recuperado</SelectItem>
                  <SelectItem value="TRASPASADO">Traspasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden sm:table-cell">Sup. m²</TableHead>
                <TableHead className="hidden md:table-cell">$/m²</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotesFiltrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {l.manzana?.nombre}-{l.numLote}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {l.superficieM2}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatearMoneda(l.precioM2)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatearMoneda(l.totalPrecio)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estatusColor[l.estatus]}>{l.estatus}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {l.ventaActiva?.clienteNombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {canEdit &&
                        (l.estatus === "DISPONIBLE" ||
                          l.estatus === "RECUPERADO") && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setOpenVender(l)}
                          >
                            Vender
                          </Button>
                        )}
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditLote(l);
                            setOpenLote(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {lotesFiltrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    Sin lotes con esos filtros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ManzanaDialog
        key={`manzana-${editManzana?.id ?? "new"}`}
        open={openManzana}
        onOpenChange={setOpenManzana}
        editing={editManzana}
        onDone={() => router.refresh()}
      />
      <LoteDialog
        key={`lote-${editLote?.id ?? "new"}`}
        open={openLote}
        onOpenChange={setOpenLote}
        editing={editLote}
        manzanas={manzanas}
        onDone={() => router.refresh()}
      />

      {openVender && (
        <VenderDialog
          lote={openVender}
          onOpenChange={(o) => !o && setOpenVender(null)}
          clientes={clientes}
          vendedores={vendedores}
          onDone={() => router.refresh()}
        />
      )}
    </>
  );
}

function ManzanaDialog({
  open,
  onOpenChange,
  editing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ManzanaDTO | null;
  onDone: () => void;
}) {
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(editing?.descripcion ?? "");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  // reset on open change
  if (open && editing && nombre !== editing.nombre && !pending) {
    // Use effect-less guard: only seed when dialog just opened with new editing data.
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    startTransition(async () => {
      const r = editing
        ? await updateManzana(editing.id, { nombre, descripcion })
        : await createManzana({ nombre, descripcion });
      if (!r.ok) {
        setError(r.error);
        if (r.fieldErrors) setFieldErrors(r.fieldErrors);
        return;
      }
      onOpenChange(false);
      setNombre("");
      setDescripcion("");
      onDone();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setError("");
          setFieldErrors({});
          setNombre(editing?.nombre ?? "");
          setDescripcion(editing?.descripcion ?? "");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar manzana" : "Nueva manzana"}
          </DialogTitle>
          <DialogDescription>Datos generales de la manzana</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={manzanaConstraints.nombre.max}
              required
            />
            <FieldError errors={fieldErrors.nombre} />
            <FieldHint>
              {nombre.length}/{manzanaConstraints.nombre.max}
            </FieldHint>
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea
              value={descripcion ?? ""}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={manzanaConstraints.descripcion.max}
            />
            <FieldError errors={fieldErrors.descripcion} />
            <FieldHint>
              {(descripcion ?? "").length}/{manzanaConstraints.descripcion.max}
            </FieldHint>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoteDialog({
  open,
  onOpenChange,
  editing,
  manzanas,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: LoteDTO | null;
  manzanas: ManzanaDTO[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    manzanaId: editing?.manzanaId ?? manzanas[0]?.id ?? "",
    numLote: editing?.numLote ?? "",
    superficieM2: editing?.superficieM2 ?? "",
    precioM2: editing?.precioM2 ?? "",
    notas: editing?.notas ?? "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const total = (Number(form.superficieM2) || 0) * (Number(form.precioM2) || 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    startTransition(async () => {
      const payload = {
        ...form,
        superficieM2: Number(form.superficieM2),
        precioM2: Number(form.precioM2),
      };
      const r = editing
        ? await updateLote(editing.id, payload)
        : await createLote(payload);
      if (!r.ok) {
        setError(r.error);
        if (r.fieldErrors) setFieldErrors(r.fieldErrors);
        return;
      }
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lote" : "Nuevo lote"}</DialogTitle>
          <DialogDescription>
            Total se calcula: superficie × precio/m²
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {manzanas.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                No hay manzanas registradas.{" "}
                <Link href="/inventario" className="underline font-medium">
                  Crea una manzana
                </Link>{" "}
                primero.
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Manzana</Label>
            <Select
              value={form.manzanaId}
              onValueChange={(v) => setForm({ ...form, manzanaId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {manzanas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.manzanaId} />
          </div>
          <div className="space-y-1">
            <Label>Número de lote</Label>
            <Input
              value={form.numLote}
              onChange={(e) => setForm({ ...form, numLote: e.target.value })}
              maxLength={loteConstraints.numLote.max}
              required
            />
            <FieldError errors={fieldErrors.numLote} />
            <FieldHint>Máx. {loteConstraints.numLote.max} caracteres</FieldHint>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Superficie m²</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.superficieM2}
                onChange={(e) =>
                  setForm({ ...form, superficieM2: e.target.value })
                }
                required
              />
              <FieldError errors={fieldErrors.superficieM2} />
            </div>
            <div className="space-y-1">
              <Label>Precio por m²</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.precioM2}
                onChange={(e) => setForm({ ...form, precioM2: e.target.value })}
                required
              />
              <FieldError errors={fieldErrors.precioM2} />
            </div>
          </div>
          <div className="bg-slate-100 p-2 rounded text-sm">
            Total:{" "}
            <span className="font-semibold">{formatearMoneda(total)}</span>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              value={form.notas ?? ""}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              maxLength={loteConstraints.notas.max}
            />
            <FieldError errors={fieldErrors.notas} />
            <FieldHint>
              {(form.notas ?? "").length}/{loteConstraints.notas.max}
            </FieldHint>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-between">
            <div>
              {editing && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("¿Eliminar lote?")) return;
                    startTransition(async () => {
                      const r = await deleteLote(editing.id);
                      if (!r.ok) {
                        setError(r.error);
                        return;
                      }
                      onOpenChange(false);
                      onDone();
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VenderDialog({
  lote,
  onOpenChange,
  clientes,
  vendedores,
  onDone,
}: {
  lote: LoteDTO | null;
  onOpenChange: (o: boolean) => void;
  clientes: ClienteDTO[];
  vendedores: VendedorDTO[];
  onDone: () => void;
}) {
  const [sinEnganche, setSinEnganche] = useState(false);
  const [form, setForm] = useState({
    clienteId: "",
    vendedorId: "",
    fechaVenta: todayLocal(),
    enganche: "",
    plazoMeses: "12",
    fechaPrimerPago: unMesDespues(todayLocal()),
    interesMoratorioPorcentaje: "10",
    notas: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const precioBase = Number(lote?.totalPrecio ?? 0);
  const engancheCapturado =
    form.enganche.trim() === "" ? null : Number(form.enganche);
  const enganche = sinEnganche ? 0 : (engancheCapturado ?? 0);
  // El recargo aplica cuando la venta es sin enganche (enganche = 0), igual que en el servidor.
  const recargoAplica = sinEnganche || engancheCapturado === 0;
  const precio = recargoAplica ? precioBase + RECARGO_SIN_ENGANCHE : precioBase;
  const plazo = Number(form.plazoMeses || 1);
  const mensualidad = plazo > 0 ? (precio - enganche) / plazo : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote) return;
    setError("");
    setFieldErrors({});
    startTransition(async () => {
      const r = await createVenta({
        ...form,
        loteId: lote.id,
        vendedorId: form.vendedorId || null,
        enganche: sinEnganche ? 0 : Number(form.enganche),
        plazoMeses: Number(form.plazoMeses),
        interesMoratorioPorcentaje: Number(form.interesMoratorioPorcentaje),
        fechaVenta: parseLocalDate(form.fechaVenta),
        fechaPrimerPago: parseLocalDate(form.fechaPrimerPago),
      });
      if (!r.ok) {
        setError(r.error);
        if (r.fieldErrors) setFieldErrors(r.fieldErrors);
        return;
      }
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog
      open={!!lote}
      onOpenChange={(o) => {
        if (!o) setSinEnganche(false);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Vender lote {lote?.numLote} ( {lote?.manzana?.nombre})
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {clientes.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                No hay clientes registrados.{" "}
                <Link href="/clientes" className="underline font-medium">
                  Registra un cliente
                </Link>{" "}
                primero.
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select
              value={form.clienteId}
              onValueChange={(v) => setForm({ ...form, clienteId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.clienteId} />
          </div>
          <div className="space-y-1">
            <Label>Vendedor (opcional)</Label>
            <Select
              value={form.vendedorId || "NONE"}
              onValueChange={(v) =>
                setForm({ ...form, vendedorId: v === "NONE" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Sin vendedor</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fecha de venta</Label>
            <DatePicker
              value={form.fechaVenta}
              onChange={(v) => setForm({ ...form, fechaVenta: v })}
              required
            />
            <FieldError errors={fieldErrors.fechaVenta} />
            <FieldHint>
              Fecha en que se realizó/realizará la venta y se pagó el enganche
            </FieldHint>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="sinEnganche"
              type="checkbox"
              checked={sinEnganche}
              onChange={(e) => {
                const checked = e.target.checked;
                setSinEnganche(checked);
                if (checked) setForm((f) => ({ ...f, enganche: "0" }));
              }}
            />
            <Label htmlFor="sinEnganche" className="text-sm cursor-pointer">
              Sin enganche (se suma {formatearMoneda(RECARGO_SIN_ENGANCHE)} al
              precio)
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Enganche</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={sinEnganche ? "0" : form.enganche}
                onChange={(e) => setForm({ ...form, enganche: e.target.value })}
                disabled={sinEnganche}
                className={sinEnganche ? "bg-muted" : ""}
                required
              />
              <FieldError errors={fieldErrors.enganche} />
            </div>
            <div className="space-y-1">
              <Label>Plazo (meses)</Label>
              <Input
                type="number"
                min="1"
                max="360"
                value={form.plazoMeses}
                onChange={(e) =>
                  setForm({ ...form, plazoMeses: e.target.value })
                }
                required
              />
              <FieldError errors={fieldErrors.plazoMeses} />
              <FieldHint>1-360 meses</FieldHint>
            </div>
            <div className="space-y-1">
              <Label>% mora mensual</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.interesMoratorioPorcentaje}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interesMoratorioPorcentaje: e.target.value,
                  })
                }
                required
              />
              <FieldError errors={fieldErrors.interesMoratorioPorcentaje} />
              <FieldHint>0-100%</FieldHint>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Fecha del primer pago</Label>
            <DatePicker
              value={form.fechaPrimerPago}
              onChange={(v) => setForm({ ...form, fechaPrimerPago: v })}
              required
            />
            <FieldError errors={fieldErrors.fechaPrimerPago} />
            <FieldHint>
              {form.fechaPrimerPago
                ? `Primera mensualidad: ${formatearFecha(parseLocalDate(form.fechaPrimerPago))}. Las siguientes vencen el día ${parseLocalDate(form.fechaPrimerPago).getUTCDate()} de cada mes.`
                : "Selecciona cuándo vence la primera mensualidad. El día de pago mensual se toma de esta fecha."}
            </FieldHint>
          </div>
          <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
            {recargoAplica && (
              <>
                <div className="flex justify-between">
                  <span>Precio del lote:</span>
                  <span className="font-semibold">
                    {formatearMoneda(precioBase)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Recargo sin enganche:</span>
                  <span className="font-semibold">
                    +{formatearMoneda(RECARGO_SIN_ENGANCHE)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Precio total:</span>
              <span className="font-semibold">{formatearMoneda(precio)}</span>
            </div>
            <div className="flex justify-between">
              <span>Enganche:</span>
              <span className="font-semibold">{formatearMoneda(enganche)}</span>
            </div>
            <div className="flex justify-between">
              <span>Monto a financiar:</span>
              <span className="font-semibold">
                {formatearMoneda(precio - enganche)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mensualidad estimada:</span>
              <span className="font-semibold">
                {formatearMoneda(mensualidad)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              maxLength={1000}
            />
            <FieldError errors={fieldErrors.notas} />
            <FieldHint>{form.notas.length}/1000</FieldHint>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando..." : "Crear venta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
