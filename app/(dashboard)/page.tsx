import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CalendarYear } from '@/components/calendar/CalendarYear'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, FileCheck, AlertCircle, DollarSign } from 'lucide-react'

interface EventRow {
  id: string
  name: string
  event_date: string
  event_type: string
  reservation_status: string
  has_contract: boolean
  is_paid: boolean
  contract_due_date: string | null
  observations: string | null
  color_override: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface HolidayRow {
  id: string
  name: string
  date: string
  is_national: boolean
  year: number
  created_at: string
}

interface Stats {
  totalEvents: number
  withContract: number
  paid: number
  pendingPayment: number
}

async function getStats(): Promise<Stats> {
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const endOfYear = `${currentYear}-12-31`

  const { data } = await supabase
    .from('events')
    .select('id, has_contract, is_paid')
    .gte('event_date', startOfYear)
    .lte('event_date', endOfYear)

  const events = (data || []) as Array<{ id: string; has_contract: boolean; is_paid: boolean }>
  
  return {
    totalEvents: events.length,
    withContract: events.filter(e => e.has_contract).length,
    paid: events.filter(e => e.is_paid).length,
    pendingPayment: events.filter(e => e.has_contract && !e.is_paid).length
  }
}

async function getEventsForYear(): Promise<EventRow[]> {
  const supabase = await createClient()
  
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01`
  const endOfYear = `${currentYear}-12-31`

  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startOfYear)
    .lte('event_date', endOfYear)
    .order('event_date')

  return (data || []) as EventRow[]
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