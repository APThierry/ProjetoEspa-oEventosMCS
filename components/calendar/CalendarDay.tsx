'use client'

import { format } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EventData {
  id: string
  name: string
  event_date: string
  event_type: string
  reservation_status: string
  has_contract: boolean
  is_paid: boolean
  isPartiallyPaid?: boolean
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

  // Cor do indicador baseada no status do evento
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

  // ✅ ATUALIZADO: Classes do dia com fundo para feriado
  const dayClasses = [
    'relative w-full aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors cursor-pointer',
    isCurrentMonth ? 'hover:bg-gray-100' : 'text-gray-300',
    isToday ? 'ring-2 ring-blue-500 ring-offset-1' : '',
    // ✅ FERIADO: Fundo vermelho claro quando é feriado
    holiday && isCurrentMonth ? 'bg-red-100 hover:bg-red-200' : '',
    hasEvents && isCurrentMonth ? 'font-semibold' : ''
  ].filter(Boolean).join(' ')

  const dayContent = (
    <button onClick={onClick} className={dayClasses}>
      {/* Número do dia */}
      <span className={`
        ${isToday ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}
        ${holiday && isCurrentMonth && !isToday ? 'text-red-700 font-semibold' : ''}
      `}>
        {dayNumber}
      </span>
      
      {/* Indicadores de eventos (bolinhas) - APENAS para eventos, não feriados */}
      {hasEvents && isCurrentMonth && (
        <div className="absolute bottom-1 flex gap-0.5">
          {events.length <= 3 ? (
            events.map((event, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${getStatusColor(event)}`}
              />
            ))
          ) : (
            <>
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(events[0])}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(events[1])}`} />
              <span className="text-[8px] text-gray-500">+{events.length - 2}</span>
            </>
          )}
        </div>
      )}
    </button>
  )

  // Tooltip com informações
  if ((hasEvents || holiday) && isCurrentMonth) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {dayContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              {/* Info do feriado */}
              {holiday && (
                <p className="text-xs font-medium text-red-600">
                  🎉 {holiday.name}
                  {holiday.is_national && (
                    <span className="text-red-400 ml-1">(Nacional)</span>
                  )}
                </p>
              )}
              {/* Info dos eventos */}
              {events.map((event) => (
                <p key={event.id} className="text-xs">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${getStatusColor(event)}`}
                  />
                  {event.name}
                  {event.is_paid && <span className="text-blue-600 ml-1">✓ Pago</span>}
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