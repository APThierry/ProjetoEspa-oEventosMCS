'use client'

import { format } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RESERVATION_STATUS_COLORS } from '@/lib/constants'  // ✅ NOVO

interface EventData {
  id: string
  name: string
  event_date: string
  event_type: string
  reservation_status: string
  has_contract: boolean
  is_paid: boolean
}

interface HolidayData {
  id: string
  name: string
  date: string
  is_national: boolean
}

interface CalendarDayProps {
  date: Date
  events: EventData[]
  holiday?: HolidayData
  isCurrentMonth: boolean
  isToday: boolean
  onClick: () => void
}

export function CalendarDay({
  date,
  events,
  holiday,
  isCurrentMonth,
  isToday,
  onClick
}: CalendarDayProps) {
  const dayNumber = format(date, 'd')
  const hasEvents = events.length > 0

  // ✅ ATUALIZADO: Determinar cor do indicador com novos status
  const getIndicatorColor = () => {
    if (events.length === 0) return null
    
    // Prioridade 1: Pago (azul)
    const hasPaid = events.some(e => e.is_paid)
    if (hasPaid) return 'bg-blue-500'
    
    // Prioridade 2: Com contrato (verde)
    const hasContract = events.some(e => e.has_contract)
    if (hasContract) return 'bg-green-500'
    
    // Prioridade 3: Reserva confirmada (verde)
    const hasConfirmed = events.some(e => e.reservation_status === 'RESERVA_CONFIRMADA')
    if (hasConfirmed) return 'bg-green-500'
    
    // ✅ NOVO: Prioridade 4: Reserva em andamento (âmbar/laranja)
    const hasInProgress = events.some(e => e.reservation_status === 'RESERVA_EM_ANDAMENTO')
    if (hasInProgress) return 'bg-amber-500'
    
    // Prioridade 5: Pré-reserva (cinza)
    const hasPreReserve = events.some(e => e.reservation_status === 'PRE_RESERVA')
    if (hasPreReserve) return 'bg-gray-400'
    
    return 'bg-gray-300'
  }

  // ✅ NOVO: Função auxiliar para obter cor do status
  const getStatusColor = (event: EventData) => {
    if (event.is_paid) return 'bg-blue-500'
    if (event.has_contract) return 'bg-green-500'
    
    switch (event.reservation_status) {
      case 'RESERVA_CONFIRMADA':
        return 'bg-green-500'
      case 'RESERVA_EM_ANDAMENTO':
        return 'bg-amber-500'
      case 'PRE_RESERVA':
        return 'bg-gray-400'
      default:
        return 'bg-gray-300'
    }
  }

  const indicatorColor = getIndicatorColor()

  // Classes do dia
  const dayClasses = [
    'relative w-full aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors cursor-pointer',
    isCurrentMonth ? 'hover:bg-gray-100' : 'text-gray-300',
    isToday ? 'ring-2 ring-blue-500 ring-offset-1' : '',
    holiday && isCurrentMonth ? 'bg-red-50' : '',
    hasEvents ? 'font-semibold' : ''
  ].filter(Boolean).join(' ')

  const dayContent = (
    <button onClick={onClick} className={dayClasses}>
      <span className={isToday ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}>
        {dayNumber}
      </span>
      
      {/* Indicadores de eventos */}
      {hasEvents && indicatorColor && isCurrentMonth && (
        <div className="absolute bottom-1 flex gap-0.5">
          {events.length <= 3 ? (
            events.map((event, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full ${getStatusColor(event)}`}
              />
            ))
          ) : (
            <>
              <div className={`w-1 h-1 rounded-full ${getStatusColor(events[0])}`} />
              <div className={`w-1 h-1 rounded-full ${getStatusColor(events[1])}`} />
              <span className="text-[8px] text-gray-500">+{events.length - 2}</span>
            </>
          )}
        </div>
      )}
    </button>
  )

  // Se tem eventos ou feriado, mostrar tooltip
  if ((hasEvents || holiday) && isCurrentMonth) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {dayContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              {holiday && (
                <p className="text-xs font-medium text-red-600">
                  🎉 {holiday.name}
                </p>
              )}
              {events.map((event) => (
                <p key={event.id} className="text-xs">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(event)}`}
                  />
                  {event.name}
                </p>
              ))}
              <p className="text-[10px] text-gray-500 mt-1">
                Clique para ver detalhes
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return dayContent
}