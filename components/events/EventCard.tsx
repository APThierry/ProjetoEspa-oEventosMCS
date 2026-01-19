'use client'

import { useState, useEffect } from 'react'
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
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import {
  EVENT_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  formatCurrency
} from '@/lib/constants'

interface EventData {
  id: string
  name: string
  event_date: string
  event_type: string
  event_category?: string
  reservation_status: string
  has_contract: boolean
  is_paid?: boolean
  estimated_audience?: number | null
  contract_due_date?: string | null
  observations: string | null
}

interface InstallmentInfo {
  total: number
  paid: number
  totalValue: number
  paidValue: number
}

interface EventCardProps {
  event: EventData
  onEdit: () => void
  showDate?: boolean
}

export function EventCard({ event, onEdit, showDate = false }: EventCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [installmentInfo, setInstallmentInfo] = useState<InstallmentInfo | null>(null)
  
  const { canEditEvent, canDeleteEvent } = usePermissions()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Carregar informações das parcelas
  useEffect(() => {
    const loadInstallments = async () => {
      if (!event.has_contract) {
        setInstallmentInfo(null)
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('contract_installments')
          .select('amount, payment_status')
          .eq('event_id', event.id)

        if (error) {
          console.error('Erro ao carregar parcelas:', error)
          return
        }

        if (data && data.length > 0) {
          const total = data.length
          const paid = data.filter(i => i.payment_status === 'PAGO').length
          const totalValue = data.reduce((sum, i) => sum + parseFloat(String(i.amount || 0)), 0)
          const paidValue = data
            .filter(i => i.payment_status === 'PAGO')
            .reduce((sum, i) => sum + parseFloat(String(i.amount || 0)), 0)

          setInstallmentInfo({ total, paid, totalValue, paidValue })
        }
      } catch (error) {
        console.error('Erro ao carregar parcelas:', error)
      }
    }

    loadInstallments()
  }, [event.id, event.has_contract, supabase])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESERVA_CONFIRMADA': return 'bg-green-100 text-green-800'
      case 'RESERVA_EM_ANDAMENTO': return 'bg-yellow-100 text-yellow-800'
      case 'PRE_RESERVA': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Determinar status de pagamento baseado nas parcelas
  const getPaymentStatus = () => {
    if (!event.has_contract) {
      return null // Não mostrar badge de pagamento
    }

    // Se temos info das parcelas, usar ela
    if (installmentInfo) {
      if (installmentInfo.total === 0) {
        return {
          label: 'Sem Parcelas',
          color: 'bg-gray-100 text-gray-600',
          icon: FileText
        }
      }
      
      if (installmentInfo.paid === installmentInfo.total) {
        return {
          label: 'Contrato Pago',
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle2,
          detail: formatCurrency(installmentInfo.totalValue)
        }
      }
      
      if (installmentInfo.paid > 0) {
        return {
          label: 'Pagamento Parcial',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          detail: `${installmentInfo.paid}/${installmentInfo.total} parcelas`
        }
      }
      
      return {
        label: 'Pendente',
        color: 'bg-red-100 text-red-800',
        icon: FileText,
        detail: formatCurrency(installmentInfo.totalValue)
      }
    }

    // Fallback para o campo antigo is_paid (compatibilidade)
    if (event.is_paid) {
      return {
        label: 'Pago',
        color: 'bg-blue-100 text-blue-800',
        icon: DollarSign
      }
    }

    return {
      label: 'Pendente',
      color: 'bg-red-100 text-red-800',
      icon: FileText
    }
  }

  const paymentStatus = getPaymentStatus()
  const PaymentIcon = paymentStatus?.icon || FileText

  // Verificar se tem parcela vencida (simplificado)
  const isOverdue = event.has_contract && 
    !event.is_paid && 
    installmentInfo && 
    installmentInfo.paid < installmentInfo.total &&
    event.contract_due_date && 
    new Date(event.contract_due_date) < new Date()

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
                  {RESERVATION_STATUS_LABELS[event.reservation_status] || event.reservation_status}
                </Badge>
                
                {/* Badge de pagamento - só mostra se tem contrato */}
                {paymentStatus && (
                  <Badge className={`text-xs ${paymentStatus.color}`}>
                    <PaymentIcon className="h-3 w-3 mr-1" />
                    {paymentStatus.label}
                  </Badge>
                )}
              </div>

              {/* Detalhes do pagamento */}
              {paymentStatus?.detail && (
                <p className="text-xs text-gray-500 mt-1">
                  {paymentStatus.detail}
                </p>
              )}

              {/* Info de vencimento (se pendente) */}
              {event.has_contract && event.contract_due_date && installmentInfo && installmentInfo.paid < installmentInfo.total && (
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