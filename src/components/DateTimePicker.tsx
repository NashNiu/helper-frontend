import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function parse(s: string): { date: Date | undefined; hh: string; mm: string } {
  if (!s) return { date: undefined, hh: '', mm: '' };
  const d = new Date(s);
  if (isNaN(d.getTime())) return { date: undefined, hh: '', mm: '' };
  return {
    date: d,
    hh: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
  };
}

function format(date: Date, hh: number, mm: number): string {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(hh).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${y}-${M}-${D}T${h}:${m}`;
}

function clamp(n: number, max: number): number {
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > max) return max;
  return Math.floor(n);
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = '选择日期时间',
  className,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = parse(value);

  const display = parsed.date
    ? `${parsed.date.getFullYear()}-${String(parsed.date.getMonth() + 1).padStart(2, '0')}-${String(parsed.date.getDate()).padStart(2, '0')} ${parsed.hh}:${parsed.mm}`
    : '';

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) return;
    const hh = parsed.date ? parsed.date.getHours() : 9;
    const mm = parsed.date ? parsed.date.getMinutes() : 0;
    onChange(format(d, hh, mm));
  };

  const handleHourChange = (raw: string) => {
    const base = parsed.date ?? new Date();
    const hh = clamp(Number(raw), 23);
    const mm = parsed.date ? parsed.date.getMinutes() : 0;
    onChange(format(base, hh, mm));
  };

  const handleMinuteChange = (raw: string) => {
    const base = parsed.date ?? new Date();
    const hh = parsed.date ? parsed.date.getHours() : 9;
    const mm = clamp(Number(raw), 59);
    onChange(format(base, hh, mm));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !parsed.date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          {display || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" side="top" align="start" sideOffset={6}>
        <Calendar mode="single" selected={parsed.date} onSelect={handleDateSelect} autoFocus />
        <div className="border-t p-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">时间</span>
          <Input
            type="number"
            min={0}
            max={23}
            value={parsed.hh}
            onChange={(e) => handleHourChange(e.target.value)}
            className="w-16 text-center"
            placeholder="HH"
          />
          <span className="text-sm">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={parsed.mm}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-16 text-center"
            placeholder="MM"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setOpen(false)}
          >
            完成
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
