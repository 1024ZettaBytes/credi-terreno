"use client"

import * as React from "react"
import * as Popover from "@radix-ui/react-popover"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
}

function toDateValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fromDateValue(s: string): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function DatePicker({ value, onChange, required, disabled, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = fromDateValue(value)

  const displayText = selected
    ? selected.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
    : "Selecciona fecha"

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">{displayText}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
        >
          <DayPicker
            mode="single"
            locale={es}
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(toDateValue(day))
                setOpen(false)
              }
            }}
            defaultMonth={selected}
            classNames={{
              months: "flex flex-col sm:flex-row gap-2",
              month: "flex flex-col gap-2",
              month_caption: "flex justify-center items-center h-7",
              caption_label: "text-sm font-medium capitalize",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-1 top-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center",
              button_next: "absolute right-1 top-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center",
              month_grid: "border-collapse",
              weekdays: "flex",
              weekday: "text-muted-foreground w-9 font-normal text-[0.8rem] text-center",
              week: "flex mt-1",
              day: "h-9 w-9 text-center text-sm relative flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer",
              day_button: "h-9 w-9 p-0 font-normal inline-flex items-center justify-center",
              selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              today: "bg-accent text-accent-foreground font-semibold",
              outside: "text-muted-foreground opacity-50",
              disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
            }}
          />
          {required && <input type="text" required value={value} readOnly className="sr-only" tabIndex={-1} />}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
