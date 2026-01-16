'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  DollarSign, 
  Edit, 
  Trash2,
  Clock,
  User
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EventForm } from '@/components/events/EventForm'

interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  reservation_status: string
  has_contract: boolean
  is_paid: boolean
  contract_due_date: string | null
  observations: string | null
  created_at: string
  updated_at: string
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

export default function EventoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const eventId = params.id as string

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) throw error
      setEvent(data)
    } catch (error) {
      console.error('Erro ao carregar evento:', error)
      toast({
        title: 'Erro',
        description: 'Evento não encontrado.',
        variant: 'destructive',
      })
      router.push('/eventos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [eventId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      toast({
        title: 'Evento excluído',
        description: 'O evento foi removido com sucesso.',
      })

      router.push('/eventos')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o evento.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESERVA_CONFIRMADA': return 'bg-green-100 text-green-800'
      case 'PRE_RESERVA': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = event.has_contract && 
    !event.is_paid && 
    event.contract_due_date && 
    new Date(event.contract_due_date) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-gray-500">Detalhes do evento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Data do Evento</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {formatDate(event.event_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Evento</p>
                  <Badge variant="outline" className="mt-1">
                    {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status da Reserva</p>
                  <Badge className={`mt-1 ${getStatusColor(event.reservation_status)}`}>
                    {STATUS_LABELS[event.reservation_status] || event.reservation_status}
                  </Badge>
                </div>
              </div>

              {event.observations && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Observações</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{event.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Informações de Registro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-gray-500">
                  Criado em: <span className="text-gray-700">{formatDateTime(event.created_at)}</span>
                </p>
                <p className="text-gray-500">
                  Última atualização: <span className="text-gray-700">{formatDateTime(event.updated_at)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contrato */}
        <div className="space-y-6">
          <Card className={isOverdue ? 'border-red-300 bg-red-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {event.has_contract ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status:</span>
                    {event.is_paid ? (
                      <Badge className="bg-green-100 text-green-800">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Pago
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  
                  {event.contract_due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Vencimento:</span>
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {formatDate(event.contract_due_date)}
                      </span>
                    </div>
                  )}

                  {isOverdue && (
                    <div className="p-3 bg-red-100 rounded-lg text-red-700 text-sm">
                      ⚠️ Este contrato está vencido!
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Este evento não possui contrato
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias no evento.
            </DialogDescription>
          </DialogHeader>
          <EventForm
            date={new Date(event.event_date)}
            event={event}
            onCancel={() => setShowEditDialog(false)}
            onSuccess={() => {
              setShowEditDialog(false)
              loadEvent()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{event.name}"? Esta ação não pode ser desfeita.
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
    </div>
  )
}