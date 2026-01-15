'use client'

import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDay } from './CalendarDay'

interface EventData {
  id: string
  name: string
  event_date: string
  event_type: string
  reservation_status: string
  has_contract: boolean
  is_paid: boolean
  contract_due_date: string | null
  observations: string | null
}

interface HolidayData {
  id: string
  name: string
  date: string
  is_national: boolean
  year: number
}

interface CalendarMonthProps {
  year: number
  month: number
  events: EventData[]
  holidays: HolidayData[]
  onDayClick: (date: Date) => void
}

export function CalendarMonth({
  year,
  month,
  events,
  holidays,
  onDayClick
}: CalendarMonthProps) {
  const monthDate = new Date(year, month, 1)
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [year, month])

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Criar mapa de eventos por data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventData[]>()
    events.forEach(event => {
      const dateKey = event.event_date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(event)
    })
    return map
  }, [events])

  // Criar mapa de feriados por data
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayData>()
    holidays.forEach(holiday => {
      map.set(holiday.date, holiday)
    })
    return map
  }, [holidays])

  return (
    <div className="border rounded-lg p-3 bg-white">
      {/* Nome do mês */}
      <h3 className="text-sm font-semibold text-center mb-2 capitalize">
        {format(monthDate, 'MMMM', { locale: ptBR })}
      </h3>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(dateKey) || []
          const holiday = holidaysByDate.get(dateKey)
          const isCurrentMonth = isSameMonth(day, monthDate)

          return (
            <CalendarDay
              key={day.toISOString()}
              date={day}
              events={dayEvents}
              holiday={holiday}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday(day)}
              onClick={() => onDayClick(day)}
            />
          )
        })}
      </div>
    </div>
  )
}