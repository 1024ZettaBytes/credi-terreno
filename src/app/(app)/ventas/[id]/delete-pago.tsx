"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePago } from "@/features/payments/actions";
import { toast } from "sonner";

export function DeletePagoButton({ pagoId }: { pagoId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-red-600 hover:text-red-700"
      title="Eliminar pago"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "¿Eliminar este pago? Se recalculará el estado de cuenta de la venta.",
          )
        )
          return;
        startTransition(async () => {
          const r = await deletePago(pagoId);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success("Pago eliminado");
          router.refresh();
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
