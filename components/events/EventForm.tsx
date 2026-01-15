'use client'

import { useState } from 'react'
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
import { Loader2 } from 'lucide-react'

// Schema local simplificado
const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  event_date: z.string().min(1, 'Data é obrigatória'),
  event_type: z.string().min(1, 'Selecione um tipo'),
  reservation_status: z.string().min(1, 'Selecione um status'),
  has_contract: z.boolean(),
  is_paid: z.boolean(),
  contract_due_date: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

// Interface do evento (simplificada)
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

interface EventFormProps {
  date: Date
  event?: EventData | null
  onCancel: () => void
  onSuccess: () => void
}

const EVENT_TYPE_OPTIONS = [
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'FUNDO_CONTRATO', label: 'Fundo de Contrato' },
]

const STATUS_OPTIONS = [
  { value: 'SEM_RESERVA', label: 'Sem Reserva' },
  { value: 'PRE_RESERVA', label: 'Pré-Reserva' },
  { value: 'RESERVA_CONFIRMADA', label: 'Reserva Confirmada' },
]

export function EventForm({ date, event, onCancel, onSuccess }: EventFormProps) {
  const [loading, setLoading] = useState(false)
  const [hasContract, setHasContract] = useState(event?.has_contract ?? false)
  const [isPaid, setIsPaid] = useState(event?.is_paid ?? false)
  const [eventType, setEventType] = useState(event?.event_type ?? 'MARKETING')
  const [reservationStatus, setReservationStatus] = useState(event?.reservation_status ?? 'SEM_RESERVA')
  
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
      event_type: event?.event_type ?? 'MARKETING',
      reservation_status: event?.reservation_status ?? 'SEM_RESERVA',
      has_contract: event?.has_contract ?? false,
      is_paid: event?.is_paid ?? false,
      contract_due_date: event?.contract_due_date ?? '',
      observations: event?.observations ?? '',
    }
  })

  const onSubmit = async (data: FormValues) => {
    setLoading(true)

    try {
      const payload = {
        name: data.name,
        event_date: data.event_date,
        event_type: eventType,
        reservation_status: reservationStatus,
        has_contract: hasContract,
        is_paid: hasContract ? isPaid : false,
        contract_due_date: hasContract && data.contract_due_date ? data.contract_due_date : null,
        observations: data.observations || null,
      }

      let error = null

      if (isEditing && event) {
        const result = await supabase
          .from('events')
          .update(payload)
          .eq('id', event.id)
        error = result.error
      } else {
        const result = await supabase
          .from('events')
          .insert([payload])
        error = result.error
      }

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: isEditing ? 'Evento atualizado' : 'Evento criado',
        description: isEditing 
          ? 'As alterações foram salvas com sucesso.'
          : 'O evento foi adicionado ao calendário.',
      })

      router.refresh()
      onSuccess()
    } catch (err) {
      console.error('Erro:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o evento.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nome do evento */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Evento *</Label>
        <Input
          id="name"
          placeholder="Ex: Feira de Marketing 2024"
          disabled={loading}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Data */}
      <div className="space-y-2">
        <Label htmlFor="event_date">Data *</Label>
        <Input
          id="event_date"
          type="date"
          disabled={loading}
          {...register('event_date')}
        />
        {errors.event_date && (
          <p className="text-sm text-red-500">{errors.event_date.message}</p>
        )}
      </div>

      {/* Tipo de evento */}
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
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contrato */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Possui Contrato?</Label>
            <p className="text-xs text-gray-500">
              Marque se este evento possui contrato associado
            </p>
          </div>
          <Switch
            checked={hasContract}
            onCheckedChange={(checked) => {
              setHasContract(checked)
              if (!checked) {
                setIsPaid(false)
              }
            }}
            disabled={loading}
          />
        </div>

        {hasContract && (
          <>
            {/* Data de vencimento */}
            <div className="space-y-2">
              <Label htmlFor="contract_due_date">Data de Vencimento</Label>
              <Input
                id="contract_due_date"
                type="date"
                disabled={loading}
                {...register('contract_due_date')}
              />
            </div>

            {/* Está pago? */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Está Pago?</Label>
                <p className="text-xs text-gray-500">
                  Marque se o contrato já foi pago
                </p>
              </div>
              <Switch
                checked={isPaid}
                onCheckedChange={setIsPaid}
                disabled={loading}
              />
            </div>
          </>
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