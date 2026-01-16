import { createClient } from '@/lib/supabase/server'
import { CalendarYear } from '@/components/calendar/CalendarYear'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
}

interface HolidayRow {
  id: string
  name: string
  date: string
  is_national: boolean
  year: number
}

async function getEvents(): Promise<EventRow[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('event_date')

  return (data || []) as EventRow[]
}

async function getHolidays(): Promise<HolidayRow[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('holidays')
    .select('*')

  return (data || []) as HolidayRow[]
}

export default async function CalendarioPage() {
  const [events, holidays] = await Promise.all([
    getEvents(),
    getHolidays()
  ])

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