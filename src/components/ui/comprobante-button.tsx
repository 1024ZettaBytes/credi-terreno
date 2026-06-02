"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ComprobanteButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  const isPdf = url.toLowerCase().endsWith(".pdf")

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs hover:underline"
      >
        <FileText className="h-3.5 w-3.5" />
        Ver
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Comprobante</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[75vh]">
            {isPdf ? (
              <iframe src={url} className="w-full h-[70vh] rounded border" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="Comprobante de pago" className="max-w-full max-h-[70vh] rounded" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
