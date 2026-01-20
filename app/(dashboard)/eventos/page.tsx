'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  DollarSign, 
  Filter,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock
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
import {
  EVENT_TYPE_OPTIONS,
  RESERVATION_STATUS_OPTIONS,
  EVENT_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
} from '@/lib/constants'

// ✅ ATUALIZADO: Interface do evento
interface Event {
  id: string
  name: string
  event_date: string
  event_type: string
  event_category: string
  reservation_status: string
  has_contract: boolean
  estimated_audience: number | null
  observations: string | null
}

// ✅ NOVO: Interface para evento com dados de pagamento
interface EventWithPayment extends Event {
  totalAmount: number
  paidAmount: number
  isPaid: boolean
  isPartiallyPaid: boolean
  installmentsCount: number
  paidInstallmentsCount: number
}

export default function EventosPage() {
  const [events, setEvents] = useState<EventWithPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingPermissions, setLoadingPermissions] = useState(true)

  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const canCreate = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canDelete = userRole === 'ADMIN' || userRole === 'EDITOR'
  const isViewer = userRole === 'VISUALIZADOR'

  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          setUserRole(profile?.role || 'VISUALIZADOR')
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error)
        setUserRole('VISUALIZADOR')
      } finally {
        setLoadingPermissions(false)
      }
    }
    
    loadUserPermissions()
  }, [supabase])

  // ✅ ATUALIZADO: Carregar eventos com parcelas
  const loadEvents = async () => {
    setLoading(true)
    try {
      // Carregar eventos
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (eventsError) throw eventsError

      const eventList = eventsData || []
      
      if (eventList.length === 0) {
        setEvents([])
        return
      }

      // Carregar parcelas de todos os eventos
      const eventIds = eventList.map(e => e.id)
      const { data: installments } = await supabase
        .from('contract_installments')
        .select('*')
        .in('event_id', eventIds)

      const installmentList = installments || []

      // Calcular status de pagamento para cada evento
      const eventsWithPayment: EventWithPayment[] = eventList.map(event => {
        const eventInstallments = installmentList.filter(i => i.event_id === event.id)
        const totalAmount = eventInstallments.reduce((sum, i) => sum + Number(i.amount), 0)
        const paidInstallments = eventInstallments.filter(i => i.payment_status === 'PAGO')
        const paidAmount = paidInstallments.reduce((sum, i) => sum + Number(i.amount), 0)
        
        const isPaid = eventInstallments.length > 0 && 
          eventInstallments.every(i => i.payment_status === 'PAGO')
        
        const isPartiallyPaid = eventInstallments.some(i => i.payment_status === 'PAGO') && 
          eventInstallments.some(i => i.payment_status === 'NAO_PAGO')

        return {
          ...event,
          totalAmount,
          paidAmount,
          isPaid,
          isPartiallyPaid,
          installmentsCount: eventInstallments.length,
          paidInstallmentsCount: paidInstallments.length,
        }
      })

      setEvents(eventsWithPayment)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os eventos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return

    if (!canDelete) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para excluir eventos.',
        variant: 'destructive',
      })
      return
    }

    setDeleting(true)
    try {
      // Deletar parcelas primeiro
      await supabase
        .from('contract_installments')
        .delete()
        .eq('event_id', deleteId)

      // Depois deletar o evento
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      toast({
        title: 'Evento excluído',
        description: 'O evento foi removido com sucesso.',
      })

      loadEvents()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o evento.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleEdit = (event: EventWithPayment) => {
    if (!canEdit) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para editar eventos.',
        variant: 'destructive',
      })
      return
    }
    setEditingEvent(event)
  }

  const handleCreate = () => {
    if (!canCreate) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para criar eventos.',
        variant: 'destructive',
      })
      return
    }
    setShowCreateModal(true)
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || event.event_type === filterType
    const matchesStatus = filterStatus === 'all' || event.reservation_status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  // ✅ ATUALIZADO: Cores de status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESERVA_CONFIRMADA': return 'bg-green-100 text-green-800'
      case 'RESERVA_EM_ANDAMENTO': return 'bg-amber-100 text-amber-800'
      case 'PRE_RESERVA': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // ✅ ATUALIZADO: Badge de pagamento baseado nas parcelas
  const getPaymentBadge = (event: EventWithPayment) => {
    if (!event.has_contract || event.installmentsCount === 0) {
      return <Badge variant="outline" className="text-gray-500">Sem contrato</Badge>
    }
    
    if (event.isPaid) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      )
    }
    
    if (event.isPartiallyPaid) {
      return (
        <Badge className="bg-amber-100 text-amber-800">
          <Clock className="h-3 w-3 mr-1" />
          {event.paidInstallmentsCount}/{event.installmentsCount} parcelas
        </Badge>
      )
    }
    
    return (
      <Badge className="bg-red-100 text-red-800">
        <FileText className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    )
  }

  if (loadingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-gray-500">
            {isViewer 
              ? 'Visualize todos os eventos do calendário'
              : 'Gerencie todos os eventos do calendário'
            }
          </p>
        </div>
        
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
      </div>

      {isViewer && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-yellow-800 text-sm">
              Você está no modo visualização. Apenas administradores e editores podem criar, editar ou excluir eventos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* ✅ ATUALIZADO: Tipos de evento */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {EVENT_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* ✅ ATUALIZADO: Status de reserva */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {RESERVATION_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>
            {filteredEvents.length} evento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum evento encontrado</p>
              {canCreate && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro evento
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{formatDate(event.event_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(event.reservation_status)}>
                          {RESERVATION_STATUS_LABELS[event.reservation_status] || event.reservation_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPaymentBadge(event)}</TableCell>
                      
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(event)}
                                title="Editar evento"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(event.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Excluir evento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar */}
      {(canCreate || canEdit) && (
        <Dialog 
          open={showCreateModal || !!editingEvent} 
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false)
              setEditingEvent(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </DialogTitle>
              <DialogDescription>
                {editingEvent 
                  ? 'Faça as alterações necessárias no evento.'
                  : 'Preencha os dados para criar um novo evento.'}
              </DialogDescription>
            </DialogHeader>
            <EventForm
              date={editingEvent ? new Date(editingEvent.event_date) : new Date()}
              event={editingEvent}
              onCancel={() => {
                setShowCreateModal(false)
                setEditingEvent(null)
              }}
              onSuccess={() => {
                setShowCreateModal(false)
                setEditingEvent(null)
                loadEvents()
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      {canDelete && (
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
                As parcelas associadas também serão excluídas.
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
      )}
    </div>
  )
}