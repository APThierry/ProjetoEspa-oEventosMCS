'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  TrendingDown,
  Loader2,
  AlertCircle,
  Users,
  Receipt,
  PieChart
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfQuarter, endOfQuarter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  EVENT_TYPE_LABELS,
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_OPTIONS,
  CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  formatCurrency,
} from '@/lib/constants'

interface Stats {
  totalEvents: number
  cevEvents: number
  fppEvents: number
  withContract: number
  totalRevenue: number
  totalPaid: number
  totalPending: number
  totalExpenses: number
  netResult: number
  totalAudience: number
  semReserva: number
  preReserva: number
  confirmada: number
}

interface CategoryData {
  category: string
  count: number
  revenue: number
  percentage: number
}

interface MonthData {
  month: string
  events: number
  revenue: number
  expenses: number
}

interface ExpenseCategoryData {
  category: string
  total: number
  percentage: number
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('year')
  const [filterType, setFilterType] = useState('all')
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    cevEvents: 0,
    fppEvents: 0,
    withContract: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    totalExpenses: 0,
    netResult: 0,
    totalAudience: 0,
    semReserva: 0,
    preReserva: 0,
    confirmada: 0
  })
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategoryData[]>([])

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
          startDate = startOfQuarter(now)
          endDate = endOfQuarter(now)
          break
        case 'year':
        default:
          startDate = startOfYear(now)
          endDate = endOfYear(now)
      }

      // Carregar eventos
      let eventsQuery = supabase
        .from('events')
        .select('*')
        .gte('event_date', format(startDate, 'yyyy-MM-dd'))
        .lte('event_date', format(endDate, 'yyyy-MM-dd'))

      if (filterType !== 'all') {
        eventsQuery = eventsQuery.eq('event_type', filterType)
      }

      const { data: events, error: eventsError } = await eventsQuery

      if (eventsError) throw eventsError

      const eventList = events || []
      const eventIds = eventList.map(e => e.id)

      // Carregar parcelas dos eventos
      let installments: any[] = []
      if (eventIds.length > 0) {
        const { data: installmentsData, error: installmentsError } = await supabase
          .from('contract_installments')
          .select('*')
          .in('event_id', eventIds)

        if (installmentsError) {
          console.error('Erro ao carregar parcelas:', installmentsError)
        } else {
          installments = installmentsData || []
        }
      }

      // Carregar despesas
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
        .lte('expense_date', format(endDate, 'yyyy-MM-dd'))

      if (expensesError) {
        console.error('Erro ao carregar despesas:', expensesError)
      }

      const expenseList = expenses || []

      // Calcular estatísticas
      const totalRevenue = installments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0)
      const totalPaid = installments
        .filter(inst => inst.payment_status === 'PAGO')
        .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0)
      const totalPending = totalRevenue - totalPaid
      const totalExpenses = expenseList.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

      const newStats: Stats = {
        totalEvents: eventList.length,
        cevEvents: eventList.filter(e => e.event_type === 'CEV_502').length,
        fppEvents: eventList.filter(e => e.event_type === 'FPP_501').length,
        withContract: eventList.filter(e => e.has_contract).length,
        totalRevenue,
        totalPaid,
        totalPending,
        totalExpenses,
        netResult: totalPaid - totalExpenses,
        totalAudience: eventList.reduce((sum, e) => sum + (e.estimated_audience || 0), 0),
        semReserva: eventList.filter(e => e.reservation_status === 'SEM_RESERVA').length,
        preReserva: eventList.filter(e => e.reservation_status === 'PRE_RESERVA').length,
        confirmada: eventList.filter(e => e.reservation_status === 'RESERVA_CONFIRMADA').length
      }
      setStats(newStats)

      // Calcular dados por categoria de evento
      const categoryMap = new Map<string, { count: number; revenue: number }>()
      
      eventList.forEach(event => {
        const cat = event.event_category || 'OUTROS'
        const current = categoryMap.get(cat) || { count: 0, revenue: 0 }
        
        // Somar receita das parcelas pagas deste evento
        const eventRevenue = installments
          .filter(inst => inst.event_id === event.id && inst.payment_status === 'PAGO')
          .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0)
        
        categoryMap.set(cat, {
          count: current.count + 1,
          revenue: current.revenue + eventRevenue
        })
      })

      const categoryArray: CategoryData[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          revenue: data.revenue,
          percentage: totalPaid > 0 ? (data.revenue / totalPaid) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)

      setCategoryData(categoryArray)

      // Calcular dados mensais
      const monthMap = new Map<string, { events: number; revenue: number; expenses: number }>()
      
      eventList.forEach(event => {
        const month = format(new Date(event.event_date), 'yyyy-MM')
        const current = monthMap.get(month) || { events: 0, revenue: 0, expenses: 0 }
        
        const eventRevenue = installments
          .filter(inst => inst.event_id === event.id && inst.payment_status === 'PAGO')
          .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0)
        
        monthMap.set(month, {
          events: current.events + 1,
          revenue: current.revenue + eventRevenue,
          expenses: current.expenses
        })
      })

      // Adicionar despesas aos meses
      expenseList.forEach(expense => {
        const month = format(new Date(expense.expense_date), 'yyyy-MM')
        const current = monthMap.get(month) || { events: 0, revenue: 0, expenses: 0 }
        monthMap.set(month, {
          ...current,
          expenses: current.expenses + parseFloat(expense.amount || 0)
        })
      })
      
      const monthlyArray: MonthData[] = Array.from(monthMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
      
      setMonthlyData(monthlyArray)

      // Calcular despesas por categoria
      const expenseCategoryMap = new Map<string, number>()
      expenseList.forEach(expense => {
        const cat = expense.category || 'OUTROS'
        const current = expenseCategoryMap.get(cat) || 0
        expenseCategoryMap.set(cat, current + parseFloat(expense.amount || 0))
      })

      const expenseCategoryArray: ExpenseCategoryData[] = Array.from(expenseCategoryMap.entries())
        .map(([category, total]) => ({
          category,
          total,
          percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total)

      setExpensesByCategory(expenseCategoryArray)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period, filterType])

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
      case 'quarter': return 'Este Trimestre'
      case 'year': return 'Este Ano'
      default: return ''
    }
  }

  const paymentRate = stats.totalRevenue > 0 
    ? ((stats.totalPaid / stats.totalRevenue) * 100).toFixed(1) 
    : '0'

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
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="CEV_502">CEV – 502</SelectItem>
              <SelectItem value="FPP_501">FPP – 501</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
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
          {/* Cards de Estatísticas Principais */}
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
                  Receita Total
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.totalPaid)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(stats.totalPending)} pendente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Despesas
                </CardTitle>
                <Receipt className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(stats.totalExpenses)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {expensesByCategory.length} categorias
                </p>
              </CardContent>
            </Card>

            <Card className={stats.netResult >= 0 ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Resultado Líquido
                </CardTitle>
                {stats.netResult >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stats.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.netResult)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Receita - Despesas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Secundários */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Com Contrato
                </CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.withContract}</div>
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
                <div className="text-2xl font-bold">{paymentRate}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  do valor contratado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Público Total
                </CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalAudience.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  pessoas estimadas
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
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.totalPending)}
                </div>
                <p className="text-xs text-gray-500 mt-1">a receber</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Detalhes */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por Tipo de Evento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Por Tipo de Evento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>CEV – 502</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats.cevEvents}</span>
                      <Badge variant="outline">
                        {stats.totalEvents > 0 
                          ? `${((stats.cevEvents / stats.totalEvents) * 100).toFixed(0)}%`
                          : '0%'}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all" 
                      style={{ 
                        width: stats.totalEvents > 0 
                          ? `${(stats.cevEvents / stats.totalEvents) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>FPP – 501</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stats.fppEvents}</span>
                      <Badge variant="outline">
                        {stats.totalEvents > 0 
                          ? `${((stats.fppEvents / stats.totalEvents) * 100).toFixed(0)}%`
                          : '0%'}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all" 
                      style={{ 
                        width: stats.totalEvents > 0 
                          ? `${(stats.fppEvents / stats.totalEvents) * 100}%` 
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

                {monthlyData.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      Melhor mês: <strong>
                        {formatMonthLabel(
                          monthlyData.reduce((prev, curr) => 
                            curr.revenue > prev.revenue ? curr : prev
                          ).month
                        )}
                      </strong> com {formatCurrency(
                        monthlyData.reduce((prev, curr) => 
                          curr.revenue > prev.revenue ? curr : prev
                        ).revenue
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Receita por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Receita por Categoria de Evento
              </CardTitle>
              <CardDescription>
                Distribuição da receita recebida por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              ) : (
                <div className="space-y-4">
                  {categoryData.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280' }}
                          />
                          <span className="font-medium">
                            {EVENT_CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.count} evento(s)
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(item.revenue)}</span>
                          <Badge variant="secondary">
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Despesas por Categoria */}
          {expensesByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Despesas por Categoria
                </CardTitle>
                <CardDescription>
                  Distribuição das despesas no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expensesByCategory.slice(0, 8).map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[item.category] || '#6B7280' }}
                          />
                          <span className="font-medium">
                            {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-600">{formatCurrency(item.total)}</span>
                          <Badge variant="outline">
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: EXPENSE_CATEGORY_COLORS[item.category] || '#6B7280'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evolução Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Evolução Mensal
              </CardTitle>
              <CardDescription>
                Eventos, receitas e despesas por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((item) => (
                    <div key={item.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium w-20">
                          {formatMonthLabel(item.month)}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500">
                            {item.events} evento(s)
                          </span>
                          <span className="text-green-600 font-medium">
                            +{formatCurrency(item.revenue)}
                          </span>
                          <span className="text-red-600 font-medium">
                            -{formatCurrency(item.expenses)}
                          </span>
                          <span className={`font-bold ${item.revenue - item.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            = {formatCurrency(item.revenue - item.expenses)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-4">
                        {item.revenue > 0 && (
                          <div 
                            className="bg-green-500 rounded-l"
                            style={{ 
                              width: `${Math.max((item.revenue / (Math.max(...monthlyData.map(d => d.revenue + d.expenses)) || 1)) * 100, 2)}%` 
                            }}
                            title={`Receita: ${formatCurrency(item.revenue)}`}
                          />
                        )}
                        {item.expenses > 0 && (
                          <div 
                            className="bg-red-500 rounded-r"
                            style={{ 
                              width: `${Math.max((item.expenses / (Math.max(...monthlyData.map(d => d.revenue + d.expenses)) || 1)) * 100, 2)}%` 
                            }}
                            title={`Despesas: ${formatCurrency(item.expenses)}`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DRE Simplificada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                DRE Simplificada
              </CardTitle>
              <CardDescription>
                Demonstração do Resultado - {getPeriodLabel()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Receita Bruta (Contratos)</span>
                  <span className="font-bold">{formatCurrency(stats.totalRevenue)}</span>
                </div>
                <div className="flex justify-between py-2 text-green-600">
                  <span className="pl-4">(-) Receita Recebida</span>
                  <span>{formatCurrency(stats.totalPaid)}</span>
                </div>
                <div className="flex justify-between py-2 text-amber-600">
                  <span className="pl-4">(-) A Receber</span>
                  <span>{formatCurrency(stats.totalPending)}</span>
                </div>
                <div className="flex justify-between py-2 border-t text-red-600">
                  <span className="font-medium">(-) Despesas Operacionais</span>
                  <span className="font-bold">{formatCurrency(stats.totalExpenses)}</span>
                </div>
                {expensesByCategory.slice(0, 5).map(cat => (
                  <div key={cat.category} className="flex justify-between py-1 text-sm text-gray-600">
                    <span className="pl-8">{EXPENSE_CATEGORY_LABELS[cat.category] || cat.category}</span>
                    <span>{formatCurrency(cat.total)}</span>
                  </div>
                ))}
                <div className={`flex justify-between py-3 border-t-2 ${stats.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="font-bold text-lg">
                    {stats.netResult >= 0 ? 'LUCRO OPERACIONAL' : 'PREJUÍZO OPERACIONAL'}
                  </span>
                  <span className="font-bold text-lg">{formatCurrency(stats.netResult)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}