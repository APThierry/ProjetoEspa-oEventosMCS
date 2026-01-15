'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  FileText, 
  DollarSign,
  Calendar,
  AlertCircle
} from 'lucide-react'

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

interface EventCardProps {
  event: EventData
  onEdit: () => void
  showDate?: boolean
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  FUNDO_CONTRATO: 'Fundo de Contrato'
}

const STATUS_LABELS: Record<string, string> = {
  SEM_RESERVA: 'Sem Reserva',
  PRE_RESERVA: 'Pré-Reserva',
  RESERVA_CONFIRMADA: 'Reserva Confirmada'
}

export function EventCard({ event, onEdit, showDate = false }: EventCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { canEditEvent, canDeleteEvent } = usePermissions()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      if (error) throw error

      toast({
        title: 'Evento excluído',
        description: 'O evento foi removido com sucesso.',
      })

      router.refresh()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o evento.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const formatEventDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  // Verificar se contrato está vencido
  const isOverdue = event.has_contract && 
    !event.is_paid && 
    event.contract_due_date && 
    new Date(event.contract_due_date) < new Date()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESERVA_CONFIRMADA': return 'bg-green-100 text-green-800'
      case 'PRE_RESERVA': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentColor = () => {
    if (!event.has_contract) return 'bg-gray-100 text-gray-600'
    if (event.is_paid) return 'bg-green-100 text-green-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <>
      <Card className={isOverdue ? 'border-red-300 bg-red-50/50' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Nome e alerta */}
              <div className="flex items-start gap-2 mb-2">
                <h4 className="font-semibold truncate">{event.name}</h4>
                {isOverdue && (
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
              </div>

              {/* Data */}
              {showDate && (
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatEventDate(event.event_date)}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                </Badge>
                <Badge className={`text-xs ${getStatusColor(event.reservation_status)}`}>
                  {STATUS_LABELS[event.reservation_status] || event.reservation_status}
                </Badge>
                
                {event.has_contract && (
                  <Badge className={`text-xs ${getPaymentColor()}`}>
                    {event.is_paid ? (
                      <>
                        <DollarSign className="h-3 w-3 mr-1" />
                        Pago
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        Pendente
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {/* Info de vencimento */}
              {event.has_contract && event.contract_due_date && !event.is_paid && (
                <p className={`text-xs mt-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {isOverdue ? '⚠️ Vencido em ' : 'Vence em '}
                  {formatEventDate(event.contract_due_date)}
                </p>
              )}

              {/* Observações */}
              {event.observations && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {event.observations}
                </p>
              )}
            </div>

            {/* Menu de ações */}
            {(canEditEvent || canDeleteEvent) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEditEvent && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDeleteEvent && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{event.name}&quot;? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}