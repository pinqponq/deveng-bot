import * as React from 'react'
import { format, parse, setHours, setMinutes, isValid, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

type DateTimePickerProps = {
  value: string // YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  placeholder?: string
  min?: Date
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Tarih ve saat seçin',
  min,
  className,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateTime = React.useMemo(() => {
    if (!value || value.length < 16) return null
    const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date())
    return isValid(parsed) ? parsed : null
  }, [value])

  const displayText = dateTime
    ? format(dateTime, 'd MMM yyyy, HH:mm', { locale: tr })
    : ''

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const base = dateTime ?? new Date()
    const next = setMinutes(setHours(date, base.getHours()), base.getMinutes())
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"))
  }

  const handleHourChange = (hour: string) => {
    const base = dateTime ?? new Date()
    const next = setHours(base, parseInt(hour, 10))
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"))
  }

  const handleMinuteChange = (minute: string) => {
    const base = dateTime ?? new Date()
    const next = setMinutes(base, parseInt(minute, 10))
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"))
  }

  const hour = dateTime?.getHours() ?? 12
  const minute = dateTime?.getMinutes() ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-11 w-full min-w-0 items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'dark:bg-input/30',
            !displayText && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-50" />
          <span className="flex-1 truncate">{displayText || placeholder}</span>
          <Clock className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="bg-popover text-popover-foreground rounded-md border p-3">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={dateTime ?? undefined}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (!min) return false
              // Gün bazında karşılaştır: bugün ve sonrası seçilebilsin (takvim günü 00:00, min şu anki saat olmasın)
              return startOfDay(date) < startOfDay(min)
            }}
          />
          <div className="border-t border-border mt-3 flex items-center gap-2 pt-3">
            <span className="text-muted-foreground text-sm">Saat</span>
            <Select
              value={String(hour)}
              onValueChange={handleHourChange}
            >
              <SelectTrigger className="h-9 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={String(minute)}
              onValueChange={handleMinuteChange}
            >
              <SelectTrigger className="h-9 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {String(m).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Sadece tarih (YYYY-MM-DD) – form alanları için, tıklanınca takvim açılır
type DatePickerFieldProps = {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  min?: Date
  max?: Date
  className?: string
  disabled?: boolean
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Tarih seçin',
  min,
  max,
  className,
  disabled,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false)

  const date = React.useMemo(() => {
    if (!value || value.length < 10) return null
    const parsed = parse(value, 'yyyy-MM-dd', new Date())
    return isValid(parsed) ? parsed : null
  }, [value])

  const displayText = date ? format(date, 'd MMM yyyy', { locale: tr }) : ''

  const handleSelect = (d: Date | undefined) => {
    onChange(d ? format(d, 'yyyy-MM-dd') : '')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-11 w-full min-w-0 items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'dark:bg-input/30',
            !displayText && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-50" />
          <span className="flex-1 truncate">{displayText || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="bg-popover text-popover-foreground rounded-md border p-3">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={date ?? undefined}
            onSelect={handleSelect}
            disabled={(d) => {
              if (min && startOfDay(d) < startOfDay(min)) return true
              if (max && startOfDay(d) > startOfDay(max)) return true
              return false
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
