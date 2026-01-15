'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { EventCard } from './EventCard'
import { EventForm } from './EventForm'
import { Plus, Calendar } from 'lucide-react'

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

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  events: EventData[]
  holidays: HolidayData[]
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  events,
  holidays
}: EventModalProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null)
  const { canCreateEvent } = usePermissions()

  // Filtrar eventos e feriados do dia selecionado
  const dayEvents = selectedDate
    ? events.filter(e => e.event_date === format(selectedDate, 'yyyy-MM-dd'))
    : []

  const dayHoliday = selectedDate
    ? holidays.find(h => h.date === format(selectedDate, 'yyyy-MM-dd'))
    : null

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false)
      setEditingEvent(null)
    }
  }, [isOpen])

  const handleCreateNew = () => {
    setEditingEvent(null)
    setShowForm(true)
  }

  const handleEdit = (event: EventData) => {
    setEditingEvent(event)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingEvent(null)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingEvent(null)
  }

  if (!selectedDate) return null

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span className="capitalize">{formattedDate}</span>
          </DialogTitle>
          {dayHoliday && (
            <DialogDescription className="flex items-center gap-2 text-red-600">
              🎉 {dayHoliday.name}
              {dayHoliday.is_national && (
                <Badge variant="outline" className="text-xs">
                  Feriado Nacional
                </Badge>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {showForm ? (
            <EventForm
              date={selectedDate}
              event={editingEvent}
              onCancel={handleFormClose}
              onSuccess={handleFormSuccess}
            />
          ) : (
            <div className="space-y-4">
              {/* Botão de adicionar */}
              {canCreateEvent && (
                <Button
                  onClick={handleCreateNew}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Evento
                </Button>
              )}

              {/* Lista de eventos */}
              {dayEvents.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500">
                    {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''} neste dia
                  </h4>
                  {dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => handleEdit(event)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum evento neste dia</p>
                  {canCreateEvent && (
                    <p className="text-sm">
                      Clique no botão acima para adicionar
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}