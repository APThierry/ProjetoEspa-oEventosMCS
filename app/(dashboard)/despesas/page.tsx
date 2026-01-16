'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Search, 
  Receipt,
  Filter,
  Edit,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
  TrendingDown,
  Building2,
  AlertTriangle
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  formatCurrency,
} from '@/lib/constants'

interface Expense {
  id: string
  description: string
  category: string
  amount: number
  expense_date: string
  event_id: string | null
  is_recurring: boolean
  notes: string | null
  created_at: string
  event?: {
    id: string
    name: string
  }
}

interface Event {
  id: string
  name: string
  event_date: string
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    description: '',
    category: 'OUTROS',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    event_id: '',
    is_recurring: false,
    notes: '',
  })

  // Permission states
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingPermissions, setLoadingPermissions] = useState(true)

  const supabase = createClient()
  const { toast } = useToast()

  const canCreate = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canDelete = userRole === 'ADMIN'

  // Carregar permissões
  useEffect(() => {
    const loadPermissions = async () => {
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
    loadPermissions()
  }, [supabase])

  // Carregar despesas
  const loadExpenses = async () => {
    setLoading(true)
    try {
      const startDate = startOfMonth(new Date(filterMonth + '-01'))
      const endDate = endOfMonth(new Date(filterMonth + '-01'))

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          event:events(id, name)
        `)
        .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
        .lte('expense_date', format(endDate, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Erro ao carregar despesas:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as despesas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Carregar eventos para associar
  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date')
        .order('event_date', { ascending: false })
        .limit(100)

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    }
  }

  useEffect(() => {
    loadExpenses()
    loadEvents()
  }, [filterMonth])

  // Filtrar despesas
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Calcular totais
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0)
  const expensesByCategory = EXPENSE_CATEGORY_OPTIONS.reduce((acc, cat) => {
    const total = filteredExpenses
      .filter(exp => exp.category === cat.value)
      .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0)
    if (total > 0) {
      acc.push({ category: cat.value, label: cat.label, total })
    }
    return acc
  }, [] as { category: string; label: string; total: number }[])

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      description: '',
      category: 'OUTROS',
      amount: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      event_id: '',
      is_recurring: false,
      notes: '',
    })
  }

  // Abrir modal de edição
  const handleEdit = (expense: Expense) => {
    if (!canEdit) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para editar despesas.',
        variant: 'destructive',
      })
      return
    }
    setFormData({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      event_id: expense.event_id || '',
      is_recurring: expense.is_recurring,
      notes: expense.notes || '',
    })
    setEditingExpense(expense)
  }

  // Salvar despesa
  const handleSave = async () => {
    if (!formData.description || !formData.amount || !formData.expense_date) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    const amount = parseFloat(formData.amount.replace(',', '.'))
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Erro',
        description: 'Valor inválido.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        description: formData.description,
        category: formData.category,
        amount: amount,
        expense_date: formData.expense_date,
        event_id: formData.event_id || null,
        is_recurring: formData.is_recurring,
        notes: formData.notes || null,
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpense.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([payload])
        if (error) throw error
      }

      toast({
        title: editingExpense ? 'Despesa atualizada' : 'Despesa criada',
        description: editingExpense 
          ? 'As alterações foram salvas.'
          : 'A despesa foi adicionada com sucesso.',
      })

      setShowCreateModal(false)
      setEditingExpense(null)
      resetForm()
      loadExpenses()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a despesa.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Excluir despesa
  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      toast({
        title: 'Despesa excluída',
        description: 'A despesa foi removida com sucesso.',
      })

      loadExpenses()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a despesa.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const getMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return format(date, 'MMMM yyyy', { locale: ptBR })
    } catch {
      return monthStr
    }
  }

  // Gerar opções de meses (últimos 12 meses)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR })
    }
  })

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
          <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
          <p className="text-gray-500">
            Gerencie as despesas do espaço de eventos
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        )}
      </div>

      {/* Aviso para visualizadores */}
      {!canCreate && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-yellow-800 text-sm">
              Você está no modo visualização. Apenas administradores e editores podem gerenciar despesas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total do Mês
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-gray-500 mt-1 capitalize">
              {getMonthLabel(filterMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Quantidade
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredExpenses.length}</div>
            <p className="text-xs text-gray-500 mt-1">despesas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Categorias
            </CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{expensesByCategory.length}</div>
            <p className="text-xs text-gray-500 mt-1">categorias com despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Despesas por Categoria */}
      {expensesByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory
                .sort((a, b) => b.total - a.total)
                .map(({ category, label, total }) => (
                  <div key={category} className="flex items-center gap-4">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[category] || '#6B7280' }}
                    />
                    <span className="flex-1 text-sm">{label}</span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                    <Badge variant="outline" className="text-xs">
                      {((total / totalExpenses) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
            </div>
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
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="capitalize">{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
          <CardDescription>
            {filteredExpenses.length} despesa(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma despesa encontrada</p>
              {canCreate && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    resetForm()
                    setShowCreateModal(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar despesa
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {expense.description}
                        {expense.is_recurring && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Recorrente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: `${EXPENSE_CATEGORY_COLORS[expense.category]}20`,
                            color: EXPENSE_CATEGORY_COLORS[expense.category],
                            borderColor: EXPENSE_CATEGORY_COLORS[expense.category]
                          }}
                          variant="outline"
                        >
                          {EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>
                        {expense.event?.name ? (
                          <span className="text-sm text-blue-600">
                            {expense.event.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Geral</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(expense.id)}
                                className="text-red-600 hover:text-red-700"
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
      <Dialog 
        open={showCreateModal || !!editingExpense} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false)
            setEditingExpense(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense 
                ? 'Faça as alterações necessárias.'
                : 'Preencha os dados da despesa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: Conta de energia elétrica"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={saving}
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="pl-10"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_date">Data *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="expense_date"
                    type="date"
                    className="pl-10"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Evento relacionado */}
            <div className="space-y-2">
              <Label>Evento Relacionado (opcional)</Label>
              <Select
                value={formData.event_id}
                onValueChange={(value) => setFormData({ ...formData, event_id: value })}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum (Despesa Geral)</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {formatDate(event.event_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Associe a despesa a um evento específico ou deixe como despesa geral
              </p>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setEditingExpense(null)
                resetForm()
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingExpense ? (
                'Salvar Alterações'
              ) : (
                'Criar Despesa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
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