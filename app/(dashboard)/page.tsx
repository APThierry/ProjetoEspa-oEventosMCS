// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CalendarYear } from '@/components/calendar/CalendarYear'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, FileCheck, AlertCircle, DollarSign } from 'lucide-react'

// ✅ ATUALIZADO: Interface do evento do banco
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
  color_override: string | null
  created_by: string | null
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
  created_at: string
}

// ✅ NOVO: Interface para evento com dados de pagamento calculados
interface EventWithPayment extends EventRow {
  is_paid: boolean
  isPartiallyPaid: boolean
  totalAmount: number
  paidAmount: number
  installmentsCount: number
  paidInstallmentsCount: number
}

interface Stats {
  totalEvents: number
  withContract: number
  paid: number           // Eventos com todas as parcelas pagas
  pendingPayment: number // Eventos com pelo menos 1 parcela pendente
}

// ✅ ATUALIZADO: Calcular stats baseado nas parcelas
async function getStats(): Promise<Stats> {
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const endOfYear = `${currentYear}-12-31`

  // Carregar eventos do ano
  const { data: events } = await supabase
    .from('events')
    .select('id, has_contract')
    .gte('event_date', startOfYear)
    .lte('event_date', endOfYear)

  const eventList = events || []
  
  if (eventList.length === 0) {
    return {
      totalEvents: 0,
      withContract: 0,
      paid: 0,
      pendingPayment: 0
    }
  }

  // Carregar todas as parcelas dos eventos
  const eventIds = eventList.map(e => e.id)
  const { data: installments } = await supabase
    .from('contract_installments')
    .select('event_id, payment_status')
    .in('event_id', eventIds)

  const installmentList = installments || []

  // Calcular estatísticas
  let paid = 0
  let pendingPayment = 0

  eventList.forEach(event => {
    const eventInstallments = installmentList.filter(i => i.event_id === event.id)
    
    if (event.has_contract && eventInstallments.length > 0) {
      const allPaid = eventInstallments.every(i => i.payment_status === 'PAGO')
      const hasPending = eventInstallments.some(i => i.payment_status === 'NAO_PAGO')
      
      if (allPaid) {
        paid++
      } else if (hasPending) {
        pendingPayment++
      }
    }
  })

  return {
    totalEvents: eventList.length,
    withContract: eventList.filter(e => e.has_contract).length,
    paid,
    pendingPayment
  }
}

// ✅ ATUALIZADO: Carregar eventos com dados de pagamento calculados
async function getEventsForYear(): Promise<EventWithPayment[]> {
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const endOfYear = `${currentYear}-12-31`

  // Carregar eventos
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startOfYear)
    .lte('event_date', endOfYear)
    .order('event_date')

  const eventList = (events || []) as EventRow[]
  
  if (eventList.length === 0) {
    return []
  }

  // Carregar todas as parcelas
  const eventIds = eventList.map(e => e.id)
  const { data: installments } = await supabase
    .from('contract_installments')
    .select('*')
    .in('event_id', eventIds)

  const installmentList = (installments || []) as InstallmentRow[]

  // Mapear eventos com dados de pagamento
  return eventList.map(event => {
    const eventInstallments = installmentList.filter(i => i.event_id === event.id)
    const paidInstallments = eventInstallments.filter(i => i.payment_status === 'PAGO')
    
    const totalAmount = eventInstallments.reduce((sum, i) => sum + Number(i.amount), 0)
    const paidAmount = paidInstallments.reduce((sum, i) => sum + Number(i.amount), 0)
    
    const is_paid = eventInstallments.length > 0 && 
      eventInstallments.every(i => i.payment_status === 'PAGO')
    
    const isPartiallyPaid = paidInstallments.length > 0 && 
      paidInstallments.length < eventInstallments.length

    return {
      ...event,
      is_paid,
      isPartiallyPaid,
      totalAmount,
      paidAmount,
      installmentsCount: eventInstallments.length,
      paidInstallmentsCount: paidInstallments.length,
    }
  })
}

async function getHolidays(): Promise<HolidayRow[]> {
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()

  const { data } = await supabase
    .from('holidays')
    .select('*')
    .eq('year', currentYear)

  return (data || []) as HolidayRow[]
}

function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: 'Total de Eventos',
      value: stats.totalEvents,
      description: 'eventos este ano',
      icon: CalendarDays,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Com Contrato',
      value: stats.withContract,
      description: 'eventos com contrato',
      icon: FileCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pagos',
      value: stats.paid,
      description: 'contratos pagos',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Pendentes',
      value: stats.pendingPayment,
      description: 'aguardando pagamento',
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{card.value}</div>
            <p className="text-xs text-gray-500 mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function StatsSection() {
  const stats = await getStats()
  return <StatsCards stats={stats} />
}

async function CalendarSection() {
  const [events, holidays] = await Promise.all([
    getEventsForYear(),
    getHolidays()
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário {new Date().getFullYear()}</CardTitle>
        <CardDescription>
          Visualize todos os eventos do ano. Clique em um dia para ver detalhes ou adicionar eventos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CalendarYear events={events} holidays={holidays} />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">
          Visão geral dos eventos e calendário anual
        </p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarSection />
      </Suspense>
    </div>
  )
}