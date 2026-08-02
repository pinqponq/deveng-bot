import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface ColorPickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
}

export function ColorPicker({
  value = '#5865F2',
  onChange,
  className,
  placeholder = '#5865F2',
}: ColorPickerProps) {
  const [color, setColor] = React.useState(value)

  React.useEffect(() => {
    setColor(value || '#5865F2')
  }, [value])

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setColor(newColor)
    onChange?.(newColor)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Hex renk formatını kontrol et
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(inputValue) || inputValue === '') {
      setColor(inputValue || '#5865F2')
      onChange?.(inputValue || '#5865F2')
    }
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-12 h-11 rounded border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex items-center justify-center"
            style={{ backgroundColor: color || '#5865F2' }}
            aria-label="Renk seç"
          >
            <div
              className="w-full h-full rounded"
              style={{ backgroundColor: color || '#5865F2' }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-2">
            <label className="text-sm font-medium">Renk Seç</label>
            <input
              type="color"
              value={color || '#5865F2'}
              onChange={handleColorChange}
              className="w-full h-10 cursor-pointer rounded border"
            />
            <Input
              type="text"
              value={color || '#5865F2'}
              onChange={handleInputChange}
              placeholder={placeholder}
              className="h-9 text-sm"
              pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
            />
          </div>
        </PopoverContent>
      </Popover>
      <Input
        type="text"
        value={color || '#5865F2'}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="h-11 flex-1"
        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
      />
    </div>
  )
}
