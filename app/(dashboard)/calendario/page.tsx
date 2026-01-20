// app/(dashboard)/calendario/page.tsx
import { createClient } from '@/lib/supabase/server'
import { CalendarYear } from '@/components/calendar/CalendarYear'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// ✅ ATUALIZADO: Interface sem is_paid
interface EventRow {
  id: string
  name: string
  event_date: string
  event_type: string
  event_category: string
  reservation_status: string
  has_contract: boolean
  estimated_audience: number | null
  observations: string | null
  created_at: string
  updated_at: string
}

// ✅ NOVO: Interface para parcelas
interface InstallmentRow {
  id: string
  event_id: string
  installment_number: number
  amount: number
  due_date: string
  payment_status: 'PAGO' | 'NAO_PAGO'
}

interface HolidayRow {
  id: string
  name: string
  date: string
  is_national: boolean
  year: number
}

// ✅ NOVO: Interface para evento com dados de pagamento calculados
interface EventWithPayment extends EventRow {
  installments: InstallmentRow[]
  totalAmount: number
  paidAmount: number
  isPaid: boolean
  isPartiallyPaid: boolean
  hasPendingPayment: boolean
}

async function getEventsWithInstallments(): Promise<EventWithPayment[]> {
  const supabase = await createClient()
  
  // Carregar eventos
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('event_date')

  const eventList = (events || []) as EventRow[]
  
  if (eventList.length === 0) {
    return []
  }

  // Carregar todas as parcelas dos eventos
  const eventIds = eventList.map(e => e.id)
  const { data: installments } = await supabase
    .from('contract_installments')
    .select('*')
    .in('event_id', eventIds)

  const installmentList = (installments || []) as InstallmentRow[]

  // Mapear parcelas por evento e calcular status de pagamento
  return eventList.map(event => {
    const eventInstallments = installmentList.filter(i => i.event_id === event.id)
    const totalAmount = eventInstallments.reduce((sum, i) => sum + Number(i.amount), 0)
    const paidAmount = eventInstallments
      .filter(i => i.payment_status === 'PAGO')
      .reduce((sum, i) => sum + Number(i.amount), 0)
    
    const isPaid = eventInstallments.length > 0 && 
      eventInstallments.every(i => i.payment_status === 'PAGO')
    
    const isPartiallyPaid = eventInstallments.some(i => i.payment_status === 'PAGO') && 
      eventInstallments.some(i => i.payment_status === 'NAO_PAGO')
    
    const hasPendingPayment = event.has_contract && 
      eventInstallments.some(i => i.payment_status === 'NAO_PAGO')

    return {
      ...event,
      installments: eventInstallments,
      totalAmount,
      paidAmount,
      isPaid,
      isPartiallyPaid,
      hasPendingPayment,
    }
  })
}

async function getHolidays(): Promise<HolidayRow[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('holidays')
    .select('*')

  return (data || []) as HolidayRow[]
}

export default async function CalendarioPage() {
  const [eventsWithPayment, holidays] = await Promise.all([
    getEventsWithInstallments(),
    getHolidays()
  ])

  // ✅ NOVO: Transformar para o formato que o CalendarYear espera
  const events = eventsWithPayment.map(e => ({
    id: e.id,
    name: e.name,
    event_date: e.event_date,
    event_type: e.event_type,
    event_category: e.event_category,
    reservation_status: e.reservation_status,
    has_contract: e.has_contract,
    is_paid: e.isPaid, // Calculado a partir das parcelas
    observations: e.observations,
    // Dados extras para exibição
    totalAmount: e.totalAmount,
    paidAmount: e.paidAmount,
    isPartiallyPaid: e.isPartiallyPaid,
    installments: e.installments,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
        <p className="text-gray-500">
          Visualização completa do calendário de eventos
        </p>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário Anual</CardTitle>
          <CardDescription>
            Clique em um dia para ver detalhes ou adicionar eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarYear events={events} holidays={holidays} />
        </CardContent>
      </Card>
    </div>
  )
}