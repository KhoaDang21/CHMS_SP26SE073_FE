"use client"

import * as React from 'react'
import { CalendarDays } from 'lucide-react'

import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'
import { cn } from './utils'

type BookingDatePickerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  minDate?: Date
  className?: string
}

const toDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const toYmd = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDisplay = (value: string) => {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

export function BookingDatePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Chọn ngày',
  minDate,
  className,
}: BookingDatePickerProps) {
  const selectedDate = React.useMemo(() => toDate(value), [value])
  const today = React.useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange('')
      return
    }
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    onChange(toYmd(normalized))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between px-3 py-2 h-11 rounded-xl border-gray-300 bg-white font-normal text-left hover:bg-gray-50',
            !value && 'text-gray-400',
            className,
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-4 w-4 text-gray-500 shrink-0" />
            <span className="truncate">
              {value ? formatDisplay(value) : placeholder}
            </span>
          </span>
          <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate ?? minDate ?? today}
          disabled={disabled}
          initialFocus
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  )
}