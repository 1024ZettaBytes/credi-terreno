"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { FormError } from "@/components/ui/field-error";
import { updateFechaPago } from "@/features/payments/actions";
import { formatDateISO } from "@/lib/date";
import { toast } from "sonner";

export function EditPagoFechaButton({
  pagoId,
  fechaRegistro,
}: {
  pagoId: string;
  fechaRegistro: string;
}) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(formatDateISO(new Date(fechaRegistro)));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await updateFechaPago(pagoId, fecha);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Fecha de pago actualizada");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Editar fecha de pago"
        onClick={() => {
          setFecha(formatDateISO(new Date(fechaRegistro)));
          setError("");
          setOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar fecha de pago</DialogTitle>
            <DialogDescription>
              Solo se modifica la fecha en que se registró el pago.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label>Fecha de pago</Label>
              <DatePicker value={fecha} onChange={setFecha} required />
            </div>
            <FormError error={error} />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
    </>
  );
}
