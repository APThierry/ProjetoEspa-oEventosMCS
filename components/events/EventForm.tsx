// components/events/EventForm.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Loader2, Users, FileText } from 'lucide-react'
import { InstallmentsForm, InstallmentData } from './InstallmentsForm'
import {
  EVENT_TYPE_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
  RESERVATION_STATUS_OPTIONS,
} from '@/lib/constants'

// Schema de validação
const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  event_date: z.string().min(1, 'Data é obrigatória'),
  event_type: z.string().min(1, 'Selecione um tipo'),
  event_category: z.string().min(1, 'Selecione uma categoria'),
  reservation_status: z.string().min(1, 'Selecione um status'),
  has_contract: z.boolean(),
  estimated_audience: z.number().nullable().optional(),
  observations: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface EventData {
  id: string
  name: string
  event_date: string
  event_type: string
  event_category?: string
  reservation_status: string
  has_contract: boolean
  estimated_audience?: number | null
  observations: string | null
  installments?: InstallmentData[]
}

interface EventFormProps {
  date: Date
  event?: EventData | null
  onCancel: () => void
  onSuccess: () => void
}

export function EventForm({ date, event, onCancel, onSuccess }: EventFormProps) {
  const [loading, setLoading] = useState(false)
  const [loadingInstallments, setLoadingInstallments] = useState(false)
  const [hasContract, setHasContract] = useState(event?.has_contract ?? false)
  const [eventType, setEventType] = useState(event?.event_type ?? 'CEV_502')
  const [eventCategory, setEventCategory] = useState(event?.event_category ?? 'OUTROS')
  const [reservationStatus, setReservationStatus] = useState(event?.reservation_status ?? 'PRE_RESERVA')
  const [estimatedAudience, setEstimatedAudience] = useState<string>(
    event?.estimated_audience?.toString() ?? ''
  )
  const [installments, setInstallments] = useState<InstallmentData[]>([])
  
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!event

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: event?.name ?? '',
      event_date: event?.event_date ?? format(date, 'yyyy-MM-dd'),
      event_type: event?.event_type ?? 'CEV_502',
      event_category: event?.event_category ?? 'OUTROS',
      reservation_status: event?.reservation_status ?? 'PRE_RESERVA',
      has_contract: event?.has_contract ?? false,
      estimated_audience: event?.estimated_audience ?? null,
      observations: event?.observations ?? '',
    }
  })

  // Carregar parcelas existentes ao editar
  const loadInstallments = useCallback(async () => {
    if (!event?.id) return
    
    setLoadingInstallments(true)
    try {
      const { data, error } = await supabase
        .from('contract_installments')
        .select('*')
        .eq('event_id', event.id)
        .order('installment_number', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setInstallments(data.map(inst => ({
          id: inst.id,
          installment_number: inst.installment_number,
          amount: parseFloat(inst.amount) || 0,
          due_date: inst.due_date,
          payment_status: inst.payment_status,
          notes: inst.notes,
        })))
      } else if (event.has_contract) {
        setInstallments([{
          installment_number: 1,
          amount: 0,
          due_date: format(new Date(), 'yyyy-MM-dd'),
          payment_status: 'NAO_PAGO',
        }])
      }
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error)
    } finally {
      setLoadingInstallments(false)
    }
  }, [event?.id, event?.has_contract])

  useEffect(() => {
    if (event?.has_contract) {
      loadInstallments()
    }
  }, [event?.has_contract, loadInstallments])

  useEffect(() => {
    if (hasContract && installments.length === 0) {
      setInstallments([{
        installment_number: 1,
        amount: 0,
        due_date: format(new Date(), 'yyyy-MM-dd'),
        payment_status: 'NAO_PAGO',
      }])
    }
  }, [hasContract, installments.length])

  // =============================================
  // ✅ FIX 1: Verificar autenticação + refresh
  // =============================================

  const getAuthenticatedUser = async () => {
    // Tentar obter o usuário
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (user) return user

    // Se falhou, tentar refresh do token
    console.warn('⚠️ Sessão não encontrada, tentando refresh...')
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError) {
      console.error('❌ Refresh falhou:', refreshError)
      return null
    }

    return refreshData?.user || null
  }

  // =============================================
  // ✅ FIX 2: onInvalid — mostra erro quando validação falha
  // =============================================

  const onInvalid = (validationErrors: any) => {
    console.error('❌ Validação do formulário falhou:', validationErrors)
    
    // Montar mensagem com os campos que falharam
    const fieldNames: Record<string, string> = {
      name: 'Nome do evento',
      event_date: 'Data',
      event_type: 'Tipo de evento',
      event_category: 'Categoria',
      reservation_status: 'Status de reserva',
    }
    
    const failedFields = Object.keys(validationErrors)
      .map(key => fieldNames[key] || key)
      .join(', ')

    toast({
      title: 'Campos obrigatórios',
      description: `Verifique: ${failedFields}`,
      variant: 'destructive',
    })
  }

  // =============================================
  // ✅ FIX 3: onSubmit com auth check e created_by
  // =============================================

  const onSubmit = async (data: FormValues) => {
    setLoading(true)

    try {
      // ✅ FIX: Verificar autenticação ANTES de qualquer operação
      const user = await getAuthenticatedUser()
      
      if (!user) {
        toast({
          title: 'Sessão expirada',
          description: 'Sua sessão expirou. Recarregue a página e tente novamente.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      console.log('✅ Usuário autenticado:', user.id)

      // Validar público estimado
      const audience = estimatedAudience ? parseInt(estimatedAudience, 10) : null
      if (estimatedAudience && (isNaN(audience!) || audience! < 0)) {
        toast({
          title: 'Erro',
          description: 'Público estimado deve ser um número válido.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Validar parcelas
      if (hasContract) {
        const invalidInstallments = installments.filter(
          inst => !inst.due_date || inst.amount < 0
        )
        if (invalidInstallments.length > 0) {
          toast({
            title: 'Erro',
            description: 'Verifique os dados das parcelas. Data e valor são obrigatórios.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      }

      // ✅ FIX: Payload com created_by explícito
      const eventPayload = {
        name: data.name,
        event_date: data.event_date,
        event_type: eventType,
        event_category: eventCategory,
        reservation_status: reservationStatus,
        has_contract: hasContract,
        estimated_audience: audience,
        observations: data.observations || null,
      }

      let eventId = event?.id
      
      if (isEditing && event) {
        // ── UPDATE ──
        console.log('📝 Atualizando evento:', event.id, eventPayload)
        
        const { data: updatedEvent, error } = await supabase
          .from('events')
          .update(eventPayload)
          .eq('id', event.id)
          .select('id')
          .single()

        if (error) {
          console.error('❌ Erro ao atualizar evento:', error)
          throw new Error(error.message)
        }

        if (!updatedEvent) {
          throw new Error('Evento não foi atualizado. Verifique suas permissões.')
        }
        
        console.log('✅ Evento atualizado:', updatedEvent.id)

      } else {
        // ── INSERT ──
        const insertPayload = {
          ...eventPayload,
          created_by: user.id,  // ✅ FIX: Sempre incluir o user ID
        }

        console.log('📝 Criando evento:', insertPayload)

        const { data: newEvent, error } = await supabase
          .from('events')
          .insert([insertPayload])
          .select('id')
          .single()

        if (error) {
          console.error('❌ Erro ao criar evento:', error)
          throw new Error(error.message)
        }

        if (!newEvent?.id) {
          throw new Error('Evento não foi criado. Verifique suas permissões.')
        }

        eventId = newEvent.id
        console.log('✅ Evento criado:', eventId)
      }

      // Salvar parcelas
      if (hasContract && eventId) {
        await saveInstallments(eventId)
      } else if (!hasContract && eventId && isEditing) {
        await supabase
          .from('contract_installments')
          .delete()
          .eq('event_id', eventId)
      }

      toast({
        title: isEditing ? 'Evento atualizado' : 'Evento criado',
        description: isEditing 
          ? 'As alterações foram salvas com sucesso.'
          : 'O evento foi adicionado ao calendário.',
      })

      router.refresh()
      onSuccess()

    } catch (err: any) {
      console.error('❌ Erro ao salvar evento:', err)
      
      // ✅ FIX: Mensagem de erro mais detalhada
      const errorMessage = err?.message || 'Erro desconhecido'
      
      let description = 'Não foi possível salvar o evento.'
      if (errorMessage.includes('row-level security')) {
        description = 'Sem permissão. Verifique suas credenciais e tente novamente.'
      } else if (errorMessage.includes('duplicate')) {
        description = 'Já existe um evento com esses dados.'
      } else if (errorMessage.includes('violates')) {
        description = `Erro de validação: ${errorMessage}`
      } else {
        description = errorMessage
      }

      toast({
        title: 'Erro ao salvar',
        description,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // =============================================
  // SALVAR PARCELAS
  // =============================================

  const saveInstallments = async (eventId: string) => {
    try {
      // Deletar parcelas existentes
      await supabase
        .from('contract_installments')
        .delete()
        .eq('event_id', eventId)

      // Inserir novas parcelas
      const installmentsPayload = installments.map(inst => ({
        event_id: eventId,
        installment_number: inst.installment_number,
        amount: inst.amount,
        due_date: inst.due_date,
        payment_status: inst.payment_status,
        notes: inst.notes || null,
      }))

      const { error } = await supabase
        .from('contract_installments')
        .insert(installmentsPayload)

      if (error) {
        console.error('❌ Erro ao salvar parcelas:', error)
        throw error
      }

      console.log('✅ Parcelas salvas:', installmentsPayload.length)
    } catch (error) {
      console.error('Erro ao salvar parcelas:', error)
      toast({
        title: 'Aviso',
        description: 'Evento salvo, mas houve um problema ao salvar as parcelas.',
        variant: 'destructive',
      })
    }
  }

  // =============================================
  // RENDER
  // =============================================

  return (
    // ✅ FIX: Adicionado onInvalid para capturar erros de validação
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
      
      {/* Nome do evento */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Evento *</Label>
        <Input
          id="name"
          placeholder="Ex: Show de Stand Up - João Silva"
          disabled={loading}
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Data e Público Estimado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_date">Data *</Label>
          <Input
            id="event_date"
            type="date"
            disabled={loading}
            {...register('event_date')}
            className={errors.event_date ? 'border-red-500' : ''}
          />
          {errors.event_date && (
            <p className="text-sm text-red-500">{errors.event_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated_audience">Público Estimado</Label>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="estimated_audience"
              type="number"
              min="0"
              placeholder="Ex: 500"
              className="pl-10"
              value={estimatedAudience}
              onChange={(e) => setEstimatedAudience(e.target.value)}
              disabled={loading}
            />
          </div>
          <p className="text-xs text-gray-500">Número estimado de pessoas</p>
        </div>
      </div>

      {/* Tipo e Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Evento *</Label>
          <Select
            value={eventType}
            onValueChange={setEventType}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select
            value={eventCategory}
            onValueChange={setEventCategory}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status de reserva */}
      <div className="space-y-2">
        <Label>Status de Reserva *</Label>
        <Select
          value={reservationStatus}
          onValueChange={setReservationStatus}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            {RESERVATION_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contrato e Parcelas */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Possui Contrato?
            </Label>
            <p className="text-xs text-gray-500">
              Ative para gerenciar parcelas e pagamentos
            </p>
          </div>
          <Switch
            checked={hasContract}
            onCheckedChange={(checked) => {
              setHasContract(checked)
              if (!checked) {
                setInstallments([])
              }
            }}
            disabled={loading}
          />
        </div>

        {hasContract && (
          <div className="pt-4 border-t">
            {loadingInstallments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Carregando parcelas...</span>
              </div>
            ) : (
              <InstallmentsForm
                installments={installments}
                onChange={setInstallments}
                disabled={loading}
              />
            )}
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          placeholder="Informações adicionais sobre o evento..."
          rows={3}
          disabled={loading}
          {...register('observations')}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : isEditing ? (
            'Salvar Alterações'
          ) : (
            'Criar Evento'
          )}
        </Button>
      </div>
    </form>
  )
}