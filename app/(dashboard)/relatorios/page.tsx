'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Stats {
  totalEvents: number
  marketingEvents: number
  fundoContratoEvents: number
  withContract: number
  paid: number
  pending: number
  semReserva: number
  preReserva: number
  confirmada: number
}

interface MonthData {
  month: string
  count: number
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('year')
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    marketingEvents: 0,
    fundoContratoEvents: 0,
    withContract: 0,
    paid: 0,
    pending: 0,
    semReserva: 0,
    preReserva: 0,
    confirmada: 0
  })
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])

  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate: Date
      let endDate: Date

      switch (period) {
        case 'month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'quarter':
          startDate = subMonths(startOfMonth(now), 2)
          endDate = endOfMonth(now)
          break
        case 'year':
        default:
          startDate = startOfYear(now)
          endDate = endOfYear(now)
      }

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', format(startDate, 'yyyy-MM-dd'))
        .lte('event_date', format(endDate, 'yyyy-MM-dd'))

      if (error) throw error

      const eventList = events || []

      // Calcular estatísticas
      const newStats: Stats = {
        totalEvents: eventList.length,
        marketingEvents: eventList.filter(e => e.event_type === 'MARKETING').length,
        fundoContratoEvents: eventList.filter(e => e.event_type === 'FUNDO_CONTRATO').length,
        withContract: eventList.filter(e => e.has_contract).length,
        paid: eventList.filter(e => e.is_paid).length,
        pending: eventList.filter(e => e.has_contract && !e.is_paid).length,
        semReserva: eventList.filter(e => e.reservation_status === 'SEM_RESERVA').length,
        preReserva: eventList.filter(e => e.reservation_status === 'PRE_RESERVA').length,
        confirmada: eventList.filter(e => e.reservation_status === 'RESERVA_CONFIRMADA').length
      }
      setStats(newStats)

      // Calcular dados mensais
      const monthMap = new Map<string, number>()
      eventList.forEach(event => {
        const month = format(new Date(event.event_date), 'yyyy-MM')
        monthMap.set(month, (monthMap.get(month) || 0) + 1)
      })
      
      const monthlyArray: MonthData[] = Array.from(monthMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
      
      setMonthlyData(monthlyArray)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  const formatMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return format(date, 'MMM/yy', { locale: ptBR })
    } catch {
      return monthStr
    }
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'month': return 'Este Mês'
      case 'quarter': return 'Último Trimestre'
      case 'year': return 'Este Ano'
      default: return ''
    }
  }

  const paymentRate = stats.withContract > 0 
    ? ((stats.paid / stats.withContract) * 100).toFixed(1) 
    : '0'

  // Encontrar melhor mês
  const bestMonth = monthlyData.length > 0 
    ? monthlyData.reduce((prev, curr) => curr.count > prev.count ? curr : prev)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-gray-500">
            Análise e estatísticas dos eventos
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total de Eventos
                </CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Com Contrato
                </CardTitle>
                <FileText className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.withContract}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalEvents > 0 
                    ? `${((stats.withContract / stats.totalEvents) * 100).toFixed(0)}% do total`
                    : '0% do total'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Taxa de Pagamento
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{paymentRate}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.paid} pagos de {stats.withContract}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Pendentes
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
                <p className="text-xs text-gray-500 mt-1">contratos a receber</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Detalhes */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por Tipo de Evento */}
            <Card>
              <CardHeader>
                <CardTitle>Por Tipo de Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Marketing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats.marketingEvents}</span>
                      <Badge variant="outline">
                        {stats.totalEvents > 0 
                          ? `${((stats.marketingEvents / stats.totalEvents) * 100).toFixed(0)}%`
                          : '0%'}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: stats.totalEvents > 0 
                          ? `${(stats.marketingEvents / stats.totalEvents) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>Fundo de Contrato</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats.fundoContratoEvents}</span>
                      <Badge variant="outline">
                        {stats.totalEvents > 0 
                          ? `${((stats.fundoContratoEvents / stats.totalEvents) * 100).toFixed(0)}%`
                          : '0%'}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ 
                        width: stats.totalEvents > 0 
                          ? `${(stats.fundoContratoEvents / stats.totalEvents) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Por Status de Reserva */}
            <Card>
              <CardHeader>
                <CardTitle>Por Status de Reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Confirmadas</span>
                    </div>
                    <span className="font-bold">{stats.confirmada}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>Pré-Reserva</span>
                    </div>
                    <span className="font-bold">{stats.preReserva}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span>Sem Reserva</span>
                    </div>
                    <span className="font-bold">{stats.semReserva}</span>
                  </div>
                </div>

                {bestMonth && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      Melhor mês: <strong>{formatMonthLabel(bestMonth.month)}</strong> com {bestMonth.count} evento(s)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Eventos por Mês */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Eventos por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              ) : (
                <div className="space-y-3">
                  {monthlyData.map((item) => (
                    <div key={item.month} className="flex items-center gap-4">
                      <span className="w-20 text-sm text-gray-500">
                        {formatMonthLabel(item.month)}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div 
                          className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ 
                            width: `${Math.max((item.count / Math.max(...monthlyData.map(d => d.count))) * 100, 10)}%`,
                            minWidth: '40px'
                          }}
                        >
                          <span className="text-white text-xs font-medium">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}