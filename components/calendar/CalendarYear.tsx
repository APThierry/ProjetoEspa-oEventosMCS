'use client'

import { useState } from 'react'
import { CalendarMonth } from './CalendarMonth'
import { EventModal } from '../events/EventModal'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Interfaces locais
interface EventData {
  id: string
  name: string
  event_date: string
  event_type: string
  event_category?: string
  reservation_status: string
  has_contract: boolean
  is_paid: boolean
  estimated_audience?: number | null
  contract_due_date: string | null
  observations: string | null
  color_override?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

interface HolidayData {
  id: string
  name: string
  date: string
  is_national: boolean
  year: number
  created_at?: string
}

interface CalendarYearProps {
  events: EventData[]
  holidays: HolidayData[]
}

export function CalendarYear({ events, holidays }: CalendarYearProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const months = Array.from({ length: 12 }, (_, i) => i)

  const handlePrevYear = () => {
    setCurrentYear(prev => prev - 1)
    setExpandedMonth(null)
  }
  
  const handleNextYear = () => {
    setCurrentYear(prev => prev + 1)
    setExpandedMonth(null)
  }
  
  const handleCurrentYear = () => {
    setCurrentYear(new Date().getFullYear())
    setExpandedMonth(null)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  // Handler para clique no evento
  const handleEventClick = (event: EventData) => {
    const eventDateParts = event.event_date.split('-')
    const eventDate = new Date(
      parseInt(eventDateParts[0]),
      parseInt(eventDateParts[1]) - 1,
      parseInt(eventDateParts[2])
    )
    setSelectedDate(eventDate)
    setIsModalOpen(true)
  }

  const handleToggleExpand = (month: number) => {
    setExpandedMonth(prev => prev === month ? null : month)
  }

  // Filtrar eventos do ano atual
  const yearEvents = events.filter(event => {
    const eventYear = new Date(event.event_date).getFullYear()
    return eventYear === currentYear
  })

  // Filtrar feriados do ano atual
  const yearHolidays = holidays.filter(holiday => {
    return holiday.year === currentYear
  })

  return (
    <div className="space-y-4">
      {/* Navegação do ano */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevYear}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{currentYear}</h2>
          {currentYear !== new Date().getFullYear() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCurrentYear}
            >
              Hoje
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextYear}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Pago</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Com Contrato</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>Pré-reserva</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-200" />
          <span>Feriado</span>
        </div>
      </div>

      {/* Dica */}
      <p className="text-sm text-gray-500 italic">
        💡 Clique no nome do mês para expandir e ver detalhes dos eventos
      </p>

      {/* Grid de meses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((month) => {
          const isExpanded = expandedMonth === month

          return (
            <CalendarMonth
              key={month}
              year={currentYear}
              month={month}
              events={yearEvents}
              holidays={yearHolidays}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
              isExpanded={isExpanded}
              onToggleExpand={() => handleToggleExpand(month)}
            />
          )
        })}
      </div>

      {/* Modal de eventos */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedDate(null)
        }}
        selectedDate={selectedDate}
        events={yearEvents}
        holidays={yearHolidays}
      />
    </div>
  )
}