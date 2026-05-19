import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onQuery: () => void
  disabled?: boolean
}

function toDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function DateRangePicker({ from, to, onFromChange, onToChange, onQuery, disabled }: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)

  const fromDate = toDate(from)
  const toDate_ = toDate(to)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-36 justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
            {fromDate ? toStr(fromDate) : "开始日期"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={(d) => {
              if (d) { onFromChange(toStr(d)); setFromOpen(false) }
            }}
            disabled={(d) => toDate_ ? d > toDate_ : false}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-sm text-muted-foreground">～</span>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-36 justify-start text-left font-normal", !toDate_ && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
            {toDate_ ? toStr(toDate_) : "结束日期"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={toDate_}
            onSelect={(d) => {
              if (d) { onToChange(toStr(d)); setToOpen(false) }
            }}
            disabled={(d) => fromDate ? d < fromDate : false}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Button size="sm" onClick={onQuery} disabled={disabled || !from || !to}>
        查询
      </Button>
    </div>
  )
}
