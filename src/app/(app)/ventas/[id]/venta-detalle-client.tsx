"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ArrowRightLeft,
  RotateCcw,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
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
import {
  registerPayment,
  uploadComprobante,
  previewPago,
  type DistribucionPago,
} from "@/features/payments/actions";
import {
  createTraspaso,
  recuperarLote,
  cancelarVenta,
  liquidarVenta,
  updateFechaVenta,
  updateDiaPago,
  convertirAFechaLimite,
} from "@/features/sales/actions";
import { FieldError, FieldHint, FormError } from "@/components/ui/field-error";
import { DatePicker } from "@/components/ui/date-picker";
import { formatearMoneda, formatearFecha } from "@/lib/money";
import { parseLocalDate, todayLocal, formatDateISO } from "@/lib/date";
import { toast } from "sonner";
import type { VentaDTO, ClienteDTO, VendedorDTO, UserRole } from "@/types";

interface EstadoSerializado {
  saldoCapital: string;
  totalDeuda: string;
  moraPendiente: string;
  saldoMensualidadActual: string;
  numeroMensualidadActual: number;
  mensualidadesPagadas: number;
  mensualidadesPendientes: number;
  proximaFechaPago: string;
  diasAtraso: number;
  estaEnMora: boolean;
  liquidado: boolean;
}

interface Props {
  venta: VentaDTO;
  estado: EstadoSerializado | null;
  clientes: ClienteDTO[];
  vendedores: VendedorDTO[];
  userRole?: UserRole;
}

export function VentaDetalleClient({
  venta,
  estado,
  clientes,
  userRole,
}: Props) {
  const [openPago, setOpenPago] = useState(false);
  const [openTraspaso, setOpenTraspaso] = useState(false);
  const [openRecuperacion, setOpenRecuperacion] = useState(false);
  const [openEditFecha, setOpenEditFecha] = useState(false);
  const [openEditDiaPago, setOpenEditDiaPago] = useState(false);
  const [openConvertir, setOpenConvertir] = useState(false);
  const isAdmin = userRole === "ADMIN";
  const canEdit = userRole === "ADMIN" || userRole === "CAPTURA";
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isActiva = venta.estatus === "ACTIVO";
  const esFechaLimite = venta.modalidadPago === "FECHA_LIMITE";

  return (
    <>
      {estado && estado.estaEnMora && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              Pago vencido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>
                {esFechaLimite
                  ? `Fecha límite vencida (${formatearFecha(estado.proximaFechaPago)})`
                  : `Mensualidad #${estado.numeroMensualidadActual} (vencida ${formatearFecha(estado.proximaFechaPago)})`}
              </span>
              <span className="font-semibold">{estado.diasAtraso} día(s)</span>
            </div>
            <div className="flex justify-between">
              <span>{esFechaLimite ? "Saldo restante" : "Saldo del mes"}</span>
              <span className="font-semibold">
                {formatearMoneda(
                  esFechaLimite ? estado.saldoCapital : estado.saldoMensualidadActual,
                )}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span>Mora acumulada</span>
              <span className="font-semibold text-red-700">
                {formatearMoneda(estado.moraPendiente)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {isActiva && canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenPago(true)}>
            <DollarSign className="h-4 w-4" /> Registrar pago
          </Button>
          <Button variant="outline" onClick={() => setOpenEditFecha(true)}>
            <CalendarDays className="h-4 w-4" /> Editar fecha de venta
          </Button>
          {!esFechaLimite && (
            <Button variant="outline" onClick={() => setOpenEditDiaPago(true)}>
              <CalendarDays className="h-4 w-4" /> Cambiar día de pago
            </Button>
          )}
          {isAdmin && (
            <>
              {!esFechaLimite && (
                <Button variant="outline" onClick={() => setOpenConvertir(true)}>
                  <CalendarClock className="h-4 w-4" /> Cambiar a fecha límite
                </Button>
              )}
              <Button variant="outline" onClick={() => setOpenTraspaso(true)}>
                <ArrowRightLeft className="h-4 w-4" /> Traspasar
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpenRecuperacion(true)}
              >
                <RotateCcw className="h-4 w-4" /> Recuperar lote
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (!confirm("¿Marcar como liquidada?")) return;
                  startTransition(async () => {
                    const r = await liquidarVenta(venta.id);
                    if (!r.ok) alert(r.error);
                    router.refresh();
                  });
                }}
              >
                Liquidar
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  if (!confirm("¿Cancelar venta? Lote volverá a Disponible."))
                    return;
                  startTransition(async () => {
                    const r = await cancelarVenta(venta.id);
                    if (!r.ok) alert(r.error);
                    router.refresh();
                  });
                }}
              >
                Cancelar venta
              </Button>
            </>
          )}
        </div>
      )}

      {openPago && (
        <PagoDialog
          key={openPago ? "open" : "closed"}
          open={openPago}
          onOpenChange={setOpenPago}
          venta={venta}
          estado={estado}
          onDone={() => router.refresh()}
        />
      )}
      {openTraspaso && (
      <TraspasoDialog
        open={openTraspaso}
        onOpenChange={setOpenTraspaso}
        venta={venta}
        clientes={clientes.filter((c) => c.id !== venta.clienteId)}
        onDone={() => router.refresh()}
      />
      )}
      {openRecuperacion && (
      <RecuperacionDialog
        open={openRecuperacion}
        onOpenChange={setOpenRecuperacion}
        venta={venta}
        onDone={() => router.refresh()}
      />
      )}
      {openEditFecha && (
        <EditFechaDialog
          open={openEditFecha}
          onOpenChange={setOpenEditFecha}
          venta={venta}
          onDone={() => router.refresh()}
        />
      )}
      {openEditDiaPago && (
        <EditDiaPagoDialog
          open={openEditDiaPago}
          onOpenChange={setOpenEditDiaPago}
          venta={venta}
          onDone={() => router.refresh()}
        />
      )}
      {openConvertir && (
        <ConvertirFechaLimiteDialog
          open={openConvertir}
          onOpenChange={setOpenConvertir}
          venta={venta}
          estado={estado}
          onDone={() => router.refresh()}
        />
      )}
    </>
  );
}

function ConvertirFechaLimiteDialog({
  open,
  onOpenChange,
  venta,
  estado,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venta: VentaDTO;
  estado: EstadoSerializado | null;
  onDone: () => void;
}) {
  const [fechaLimitePago, setFechaLimitePago] = useState(todayLocal());
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await convertirAFechaLimite({ ventaId: venta.id, fechaLimitePago: parseLocalDate(fechaLimitePago) });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Venta convertida a pago único a fecha límite");
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar a fecha límite</DialogTitle>
          <DialogDescription>
            El saldo restante ({formatearMoneda(estado?.saldoCapital ?? venta.montoFinanciado)}) se
            liquidará en una o varias exhibiciones a más tardar en la fecha límite. Los pagos
            ya registrados no se modifican.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Fecha límite de pago</Label>
            <DatePicker value={fechaLimitePago} onChange={setFechaLimitePago} required />
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Convertir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PagoDialog({
  open,
  onOpenChange,
  venta,
  estado,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venta: VentaDTO;
  estado: EstadoSerializado | null;
  onDone: () => void;
}) {
  type TipoPago = "MENSUALIDAD" | "ABONO_CAPITAL" | "MORATORIO" | "LIQUIDACION";
  const esFechaLimite = venta.modalidadPago === "FECHA_LIMITE";
  const [form, setForm] = useState({
    // En fecha límite el monto sugerido es el saldo restante y el pago es un abono.
    monto: esFechaLimite ? (estado?.saldoCapital ?? venta.mensualidadBase) : venta.mensualidadBase,
    tipo: (esFechaLimite ? "ABONO_CAPITAL" : "MENSUALIDAD") as TipoPago,
    fechaRegistro: todayLocal(),
    notas: "",
    cobrarMoraAutomatica: false,
  });
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<DistribucionPago | null>(null);

  // Live distribution preview
  const montoValido =
    Number.isFinite(Number(form.monto)) && Number(form.monto) > 0;
  useEffect(() => {
    if (!open || !montoValido) return;
    let cancelled = false;
    const fechaReg = parseLocalDate(form.fechaRegistro);
    previewPago(
      venta.id,
      Number(form.monto),
      fechaReg,
      form.tipo,
      form.cobrarMoraAutomatica,
    ).then((r) => {
      if (!cancelled) setPreview(r);
    });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    montoValido,
    form.monto,
    form.fechaRegistro,
    form.tipo,
    form.cobrarMoraAutomatica,
    venta.id,
  ]);
  const previewToShow = montoValido ? preview : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    startTransition(async () => {
      const r = await registerPayment({
        ventaId: venta.id,
        monto: Number(form.monto),
        tipo: form.tipo,
        fechaRegistro: parseLocalDate(form.fechaRegistro),
        comprobanteUrl,
        notas: form.notas,
        cobrarMoraAutomatica: form.cobrarMoraAutomatica,
      });
      if (!r.ok) {
        setError(r.error);
        if (r.fieldErrors) setFieldErrors(r.fieldErrors);
        return;
      }
      onOpenChange(false);
      onDone();
      const dist = r.data.distribucion;
      if (dist.liquidaCredito) {
        toast.success("Crédito liquidado", {
          description: `Pago aplicado: ${formatearMoneda(dist.totalAplicado)}`,
        });
      } else if (dist.diasAtraso > 0 && Number(dist.moraDebida) > 0) {
        toast.warning("Pago aplicado con mora", {
          description: `${dist.items.length} movimiento(s) registrado(s).`,
        });
      } else {
        toast.success("Pago registrado", {
          description: `${dist.items.length} movimiento(s) registrado(s).`,
        });
      }
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await uploadComprobante(venta.id, file);
    if (r.ok) setComprobanteUrl(r.data.url);
    else setError(r.error);
  };

  const tipoLabel: Record<TipoPago, string> = {
    MENSUALIDAD: "MENSUALIDAD",
    ABONO_CAPITAL: "ABONO A CAPITAL",
    MORATORIO: "MORATORIO",
    LIQUIDACION: "LIQUIDACIÓN",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {esFechaLimite ? (
              <>
                Saldo restante: {formatearMoneda(estado?.saldoCapital ?? venta.montoFinanciado)}
                {venta.fechaLimitePago && (
                  <span className="block mt-1">
                    Fecha límite:{" "}
                    <span className="font-semibold">
                      {formatearFecha(venta.fechaLimitePago)}
                    </span>
                    {estado && estado.diasAtraso > 0 && (
                      <span className="text-red-600"> · {estado.diasAtraso} día(s) de atraso</span>
                    )}
                  </span>
                )}
              </>
            ) : (
              <>
                Mensualidad: {formatearMoneda(venta.mensualidadBase)} · Día{" "}
                {venta.diaPago}
                {estado && (
                  <span className="block mt-1">
                    Próximo vencimiento:{" "}
                    <span className="font-semibold">
                      {formatearFecha(estado.proximaFechaPago)}
                    </span>
                    {estado.diasAtraso > 0 && (
                      <span className="text-red-600">
                        {" "}
                        · {estado.diasAtraso} día(s) de atraso
                      </span>
                    )}
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {!esFechaLimite && (
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => {
                const tipo = v as TipoPago;
                setForm((f) => ({
                  ...f,
                  tipo,
                  monto:
                    tipo === "LIQUIDACION"
                      ? (estado?.totalDeuda ?? venta.mensualidadBase)
                      : venta.mensualidadBase,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSUALIDAD">
                  Mensualidad (cascada)
                </SelectItem>
                <SelectItem value="ABONO_CAPITAL">Abono a capital</SelectItem>
                <SelectItem value="MORATORIO">Solo moratorio</SelectItem>
                <SelectItem value="LIQUIDACION">Liquidación total</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.tipo === "MENSUALIDAD" &&
                "Cubre mora (si aplica), luego mensualidades; el sobrante abona a capital."}
              {form.tipo === "ABONO_CAPITAL" &&
                "Cubre mora (si aplica) + mensualidad actual; el excedente reduce capital y recalcula la mensualidad."}
              {form.tipo === "MORATORIO" &&
                "Cubre solo intereses moratorios pendientes."}
              {form.tipo === "LIQUIDACION" &&
                "Cubre mora + saldo capital total."}
            </p>
          </div>
          )}
          {esFechaLimite && (
            <p className="text-xs text-muted-foreground">
              Abono al saldo restante. Si hay mora tras la fecha límite, marca la casilla para cobrarla.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Monto</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                readOnly={form.tipo === "LIQUIDACION"}
                className={form.tipo === "LIQUIDACION" ? "bg-muted" : ""}
                required
              />
              <FieldError errors={fieldErrors.monto} />
            </div>
            <div className="space-y-1">
              <Label>Fecha</Label>
              <DatePicker
                value={form.fechaRegistro}
                onChange={(v) => setForm({ ...form, fechaRegistro: v })}
                required
              />
            </div>
          </div>
          {(form.tipo === "MENSUALIDAD" ||
            form.tipo === "ABONO_CAPITAL" ||
            form.tipo === "LIQUIDACION") && (
            <div className="flex items-center gap-2">
              <input
                id="mora"
                type="checkbox"
                checked={form.cobrarMoraAutomatica}
                onChange={(e) =>
                  setForm({ ...form, cobrarMoraAutomatica: e.target.checked })
                }
              />
              <Label htmlFor="mora" className="text-xs cursor-pointer">
                Cobrar mora automática si hay atraso
              </Label>
            </div>
          )}

          {/* Vista previa de distribución */}
          {previewToShow && previewToShow.items.length > 0 && (
            <div className="bg-slate-50 border rounded-md p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Vista previa de distribución
              </p>
              {previewToShow.diasAtraso > 0 && (
                <p className="text-xs text-amber-700">
                  ⚠ {previewToShow.diasAtraso} día(s) de atraso · Mora
                  calculada:{" "}
                  <strong>{formatearMoneda(previewToShow.moraDebida)}</strong>
                </p>
              )}
              <div className="space-y-1">
                {previewToShow.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {tipoLabel[it.tipo as TipoPago] ?? it.tipo}
                      </p>
                      <p className="text-muted-foreground truncate">
                        {it.descripcion}
                      </p>
                    </div>
                    <span className="font-semibold whitespace-nowrap">
                      {formatearMoneda(it.monto)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total aplicado</span>
                  <span className="font-semibold">
                    {formatearMoneda(previewToShow.totalAplicado)}
                  </span>
                </div>
                {Number(previewToShow.sobrante) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Sobrante (no aplica)</span>
                    <span className="font-semibold">
                      {formatearMoneda(previewToShow.sobrante)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Saldo capital después
                  </span>
                  <span className="font-semibold">
                    {formatearMoneda(previewToShow.saldoCapitalDespues)}
                  </span>
                </div>
                {previewToShow.mensualidadAntes !==
                  previewToShow.mensualidadDespues && (
                  <div className="flex justify-between text-blue-700">
                    <span>Nueva mensualidad</span>
                    <span className="font-semibold">
                      {formatearMoneda(previewToShow.mensualidadAntes)} →{" "}
                      {formatearMoneda(previewToShow.mensualidadDespues)}
                    </span>
                  </div>
                )}
                {previewToShow.liquidaCredito && (
                  <p className="text-green-700 font-semibold pt-1">
                    ✓ Este pago liquida el crédito
                  </p>
                )}
              </div>
            </div>
          )}
          {previewToShow && previewToShow.items.length === 0 && montoValido && (
            <p className="text-xs text-amber-700">
              El pago no aplica a ningún rubro con el tipo seleccionado.
            </p>
          )}

          <div className="space-y-1">
            <Label>Comprobante (opcional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFile}
            />
            {comprobanteUrl && (
              <p className="text-xs text-green-600">✓ Subido</p>
            )}
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
            <Button
              type="submit"
              disabled={
                pending ||
                !previewToShow ||
                previewToShow.items.length === 0 ||
                Number(previewToShow.sobrante) > 0.005
              }
            >
              {pending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TraspasoDialog({
  open,
  onOpenChange,
  venta,
  clientes,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venta: VentaDTO;
  clientes: ClienteDTO[];
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    clienteNuevoId: "",
    notas: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    startTransition(async () => {
      const r = await createTraspaso({
        ventaOriginalId: venta.id,
        clienteNuevoId: form.clienteNuevoId,
        notas: form.notas,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Traspasar lote</DialogTitle>
          <DialogDescription>
            Se cambiará el titular de esta venta al nuevo cliente. Las
            condiciones del crédito se mantienen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Cliente nuevo</Label>
            <Select
              required
              value={form.clienteNuevoId || ""}
              onValueChange={(v) => setForm({ ...form, clienteNuevoId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.clienteNuevoId} />
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
              {pending ? "Procesando..." : "Confirmar traspaso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecuperacionDialog({
  open,
  onOpenChange,
  venta,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venta: VentaDTO;
  onDone: () => void;
}) {
  const [porcentaje, setPorcentaje] = useState("50");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    startTransition(async () => {
      const r = await recuperarLote({
        ventaId: venta.id,
        porcentajeDevolucion: Number(porcentaje),
        motivo,
      });
      if (!r.ok) {
        setError(r.error);
        if (r.fieldErrors) setFieldErrors(r.fieldErrors);
        return;
      }
      alert(
        `Lote recuperado. Devolución: ${formatearMoneda(r.data.montoDevolucion)}`,
      );
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar lote</DialogTitle>
          <DialogDescription>
            La venta se cancelará y el lote pasará a estatus RECUPERADO. Indica
            el % a devolver al cliente sobre el total pagado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>% Devolución sobre total pagado</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              required
            />
            <FieldError errors={fieldErrors.porcentajeDevolucion} />
            <FieldHint>0% - 100%</FieldHint>
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={1000}
            />
            <FieldError errors={fieldErrors.motivo} />
            <FieldHint>{motivo.length}/1000</FieldHint>
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
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Procesando..." : "Confirmar recuperación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit Fecha de Venta Dialog ─── */
function EditFechaDialog({
  open,
  onOpenChange,
  venta,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venta: VentaDTO;
  onDone: () => void;
}) {
  const [fechaVenta, setFechaVenta] = useState(formatDateISO(new Date(venta.fechaVenta)));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await updateFechaVenta(venta.id, fechaVenta);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Fecha de venta actualizada");
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar fecha de venta</DialogTitle>
          <DialogDescription>
            Al cambiar la fecha se recalcula el calendario de pagos y se actualiza
            la fecha del enganche.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Fecha de venta</Label>
            <DatePicker
              value={fechaVenta}
              onChange={setFechaVenta}
              required
            />
            <FieldHint>Fecha en que se realizó la venta y se pagó el enganche</FieldHint>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

/* ─── Edit Día de Pago Dialog ─── */
function EditDiaPagoDialog({
  open,
  onOpenChange,
  venta,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venta: VentaDTO;
  onDone: () => void;
}) {
  const [diaPago, setDiaPago] = useState(String(venta.diaPago));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await updateDiaPago(venta.id, Number(diaPago));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Día de pago actualizado");
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar día de pago</DialogTitle>
          <DialogDescription>
            Se recalculará la próxima fecha de pago con el nuevo día.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Día de pago (1-31)</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={diaPago}
              onChange={(e) => setDiaPago(e.target.value)}
              required
            />
            <FieldHint>Si el mes tiene menos días, se usará el último día del mes</FieldHint>
          </div>
          <FormError error={error} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
