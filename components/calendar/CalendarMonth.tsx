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
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Calendar, Users, DollarSign, FileText } from 'lucide-react'
import { EVENT_TYPE_LABELS, EVENT_CATEGORY_LABELS, formatCurrency } from '@/lib/constants'

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
  onEventClick?: (event: EventData) => void  // NOVO
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function CalendarMonth({
  year,
  month,
  events,
  holidays,
  onDayClick,
  onEventClick,  // NOVO
  isExpanded = false,
  onToggleExpand
}: CalendarMonthProps) {
  const monthDate = new Date(year, month, 1)
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [year, month])

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const weekDaysFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  // Filtrar eventos do mês atual
  const monthEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate.getMonth() === month && eventDate.getFullYear() === year
    }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
  }, [events, month, year])

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

  // Obter cor do status
  const getStatusColor = (event: EventData) => {
    if (event.is_paid) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (event.has_contract) return 'bg-green-100 text-green-800 border-green-200'
    if (event.reservation_status === 'PRE_RESERVA') return 'bg-gray-100 text-gray-800 border-gray-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const getStatusLabel = (event: EventData) => {
    if (event.is_paid) return 'Pago'
    if (event.has_contract) return 'Com Contrato'
    if (event.reservation_status === 'PRE_RESERVA') return 'Pré-reserva'
    if (event.reservation_status === 'RESERVA_CONFIRMADA') return 'Confirmado'
    return 'Sem reserva'
  }

  // Versão compacta (não expandida)
  if (!isExpanded) {
    return (
      <div className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
        {/* Nome do mês - clicável */}
        <button
          onClick={onToggleExpand}
          className="w-full flex items-center justify-center gap-2 mb-2 hover:bg-gray-50 rounded py-1 transition-colors"
        >
          <h3 className="text-sm font-semibold capitalize">
            {format(monthDate, 'MMMM', { locale: ptBR })}
          </h3>
          {monthEvents.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {monthEvents.length}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

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

  // Versão expandida
  return (
    <div className="col-span-full border rounded-lg bg-white shadow-lg overflow-hidden">
      {/* Header do mês expandido */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold capitalize text-gray-800">
            {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          {monthEvents.length > 0 && (
            <Badge className="bg-blue-600">
              {monthEvents.length} evento{monthEvents.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <ChevronUp className="h-5 w-5 text-gray-500" />
      </button>

      <div className="p-6">
        {/* Calendário expandido */}
        <div className="mb-6">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDaysFull.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-gray-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dias do mês - versão expandida */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDate.get(dateKey) || []
              const holiday = holidaysByDate.get(dateKey)
              const isCurrentMonth = isSameMonth(day, monthDate)
              const dayNumber = format(day, 'd')

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    relative min-h-[80px] p-2 rounded-lg border transition-all text-left
                    ${isCurrentMonth 
                      ? 'bg-white hover:bg-gray-50 hover:border-blue-300 cursor-pointer' 
                      : 'bg-gray-50 text-gray-300 cursor-default'}
                    ${isToday(day) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
                    ${holiday && isCurrentMonth ? 'bg-red-50' : ''}
                  `}
                >
                  {/* Número do dia */}
                  <span className={`
                    text-sm font-semibold
                    ${isToday(day) ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                  `}>
                    {dayNumber}
                  </span>

                  {/* Feriado */}
                  {holiday && isCurrentMonth && (
                    <div className="mt-1">
                      <span className="text-[10px] text-red-600 font-medium truncate block">
                        🎉 {holiday.name}
                      </span>
                    </div>
                  )}

                  {/* Eventos do dia */}
                  {dayEvents.length > 0 && isCurrentMonth && (
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${
                            event.is_paid
                              ? 'bg-blue-100 text-blue-700'
                              : event.has_contract
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {event.name}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-gray-500">
                          +{dayEvents.length - 2} mais
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de eventos do mês */}
        {monthEvents.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Eventos de {format(monthDate, 'MMMM', { locale: ptBR })}
            </h4>
            
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {monthEvents.map((event) => {
                // Extrair dia e mês diretamente da string (evita problemas de timezone)
                // event.event_date = "2026-01-15" → dia = "15", mes = "01"
                const [ano, mes, dia] = event.event_date.split('-')
                const dataFormatada = `${dia}/${mes}`
                
                // Criar data para o onClick (sem problema porque é só para navegar)
                const eventDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))

                return (
                  <Card
                    key={event.id}
                    className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                      event.is_paid
                        ? 'border-l-blue-500'
                        : event.has_contract
                        ? 'border-l-green-500'
                        : event.reservation_status === 'PRE_RESERVA'
                        ? 'border-l-gray-400'
                        : 'border-l-gray-300'
                    }`}
                    onClick={() => onEventClick ? onEventClick(event) : onDayClick(eventDate)}
                  >
                    <div className="space-y-2">
                      {/* Nome e data */}
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-gray-800 truncate flex-1">
                          {event.name}
                        </h5>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {dataFormatada}
                        </Badge>
                      </div>

                      {/* Tipo e Categoria */}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                        </Badge>
                        {event.event_category && (
                          <Badge variant="outline" className="text-xs">
                            {EVENT_CATEGORY_LABELS[event.event_category] || event.event_category}
                          </Badge>
                        )}
                      </div>

                      {/* Status e Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <Badge className={`${getStatusColor(event)} text-xs`}>
                          {getStatusLabel(event)}
                        </Badge>
                        
                        {event.estimated_audience && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.estimated_audience.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Mensagem se não há eventos */}
        {monthEvents.length === 0 && (
          <div className="border-t pt-6 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Nenhum evento neste mês</p>
            <p className="text-sm">Clique em um dia para adicionar</p>
          </div>
        )}
      </div>
    </div>
  )
}