// app/(dashboard)/despesas/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  MAIN_EXPENSE_CATEGORIES,
  formatCurrency,
} from '@/lib/constants'

// ============================================
// INTERFACES
// ============================================

interface Expense {
  id: string
  title: string | null
  description: string
  client: string | null
  category: string
  amount: number
  expense_date: string
  payment_date: string | null
  event_id: string | null
  is_recurring: boolean
  notes: string | null
  created_at: string
  event?: {
    id: string
    name: string
  }
}

interface ParsedExpense {
  title: string
  client: string
  amount: number
  paymentDate: string
  status?: string
  selected?: boolean
  detectedCategory?: string
}

interface Event {
  id: string
  name: string
  event_date: string
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function DespesasPage() {
  // Estados de dados
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de filtro
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  
  // Estados de modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Estados de importação
  const [uploadingFile, setUploadingFile] = useState(false)
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([])
  const [showParsedModal, setShowParsedModal] = useState(false)
  const [importCategory, setImportCategory] = useState('MAO_DE_OBRA')
  const [pastedText, setPastedText] = useState('')

  // Estados de formulário
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client: '',
    category: 'MAO_DE_OBRA',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    event_id: 'none',
    is_recurring: false,
    notes: '',
  })

  // Estados de permissão
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  
  // ✅ Estados para exclusão em massa
  const [deletingAll, setDeletingAll] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  const canCreate = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR'
  const canDelete = userRole === 'ADMIN'
  
  const SUPER_ADMIN_ID = '9821e2a2-ef72-4b3b-9b75-2e8c0e59e2c3'

  // ============================================
  // CARREGAR PERMISSÕES
  // ============================================

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
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

  // ============================================
  // CARREGAR DESPESAS
  // ============================================

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const [year, month] = filterMonth.split('-').map(Number)
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data, error } = await supabase
        .from('expenses')
        .select(`*, event:events(id, name)`)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)
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
  }, [filterMonth, supabase, toast])

  // ============================================
  // CARREGAR EVENTOS
  // ============================================

  const loadEvents = useCallback(async () => {
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
  }, [supabase])

  useEffect(() => {
    loadExpenses()
    loadEvents()
  }, [loadExpenses, loadEvents])

  // ============================================
  // FILTROS E CÁLCULOS
  // ============================================

  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.title?.toLowerCase().includes(searchLower) ||
      expense.client?.toLowerCase().includes(searchLower)
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
    return matchesSearch && matchesCategory
  })

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

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      client: '',
      category: 'MAO_DE_OBRA',
      amount: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      event_id: 'none',
      is_recurring: false,
      notes: '',
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number)
      if (y && m && d) {
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      }
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const getMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number)
      const date = new Date(year, month - 1, 1)
      return format(date, 'MMMM yyyy', { locale: ptBR })
    } catch {
      return monthStr
    }
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const monthOptions: { value: string; label: string; year: number; isCurrentMonth: boolean }[] = []
  
  for (let y = currentYear - 3; y <= currentYear + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      const value = `${y}-${String(m).padStart(2, '0')}`
      const date = new Date(y, m - 1, 1)
      monthOptions.push({
        value,
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
        year: y,
        isCurrentMonth: y === currentYear && m === currentMonth,
      })
    }
  }

  // ============================================
  // HANDLERS - CRUD
  // ============================================

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
      title: expense.title || '',
      description: expense.description,
      client: expense.client || '',
      category: expense.category,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      payment_date: expense.payment_date || expense.expense_date,
      event_id: expense.event_id || 'none',
      is_recurring: expense.is_recurring,
      notes: expense.notes || '',
    })
    setEditingExpense(expense)
  }

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
        title: formData.title || null,
        description: formData.description,
        client: formData.client || null,
        category: formData.category,
        amount: amount,
        expense_date: formData.expense_date,
        payment_date: formData.payment_date || null,
        event_id: formData.event_id === 'none' ? null : formData.event_id,
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

  // ============================================
  // ✅ EXCLUIR TODAS AS DESPESAS DO MÊS
  // ============================================

  const handleDeleteAllMonth = async () => {
    if (userId !== SUPER_ADMIN_ID) return

    setDeletingAll(true)
    try {
      const [year, month] = filterMonth.split('-').map(Number)
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { error } = await supabase
        .from('expenses')
        .delete()
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)

      if (error) throw error

      toast({
        title: '🗑️ Despesas excluídas',
        description: `Todas as despesas de ${getMonthLabel(filterMonth)} foram removidas.`,
      })

      setShowDeleteAllConfirm(false)
      loadExpenses()
    } catch (error: any) {
      console.error('Erro ao excluir todas:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir as despesas.',
        variant: 'destructive',
      })
    } finally {
      setDeletingAll(false)
    }
  }

  // ============================================
  // HANDLERS - IMPORTAÇÃO EXCEL
  // ============================================

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos Excel (.xlsx, .xls) são aceitos.',
        variant: 'destructive',
      })
      return
    }

    setUploadingFile(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/expenses/parse-excel', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao processar Excel')
      }

      const expensesWithSelection = data.expenses.map((exp: ParsedExpense & { category?: string }) => ({
        ...exp,
        selected: true,
        detectedCategory: exp.category || importCategory,
      }))

      setParsedExpenses(expensesWithSelection)
      setShowParsedModal(true)
      
      toast({
        title: 'Excel processado!',
        description: `${data.totalFound} despesa(s) encontrada(s) na planilha "${data.sheetName}".`,
      })
    } catch (error: any) {
      console.error('Erro ao processar Excel:', error)
      toast({
        title: 'Erro ao processar Excel',
        description: error.message || 'Verifique se o arquivo está no formato correto.',
        variant: 'destructive',
      })
    } finally {
      setUploadingFile(false)
      event.target.value = ''
    }
  }

  // ============================================
  // HANDLERS - IMPORTAÇÃO TEXTO
  // ============================================

  const handleParseText = async () => {
    if (!pastedText.trim()) {
      toast({
        title: 'Erro',
        description: 'Cole o texto primeiro.',
        variant: 'destructive',
      })
      return
    }

    setUploadingFile(true)
    try {
      const expenses = parseTextToExpenses(pastedText)

      if (expenses.length === 0) {
        toast({
          title: 'Nenhuma despesa encontrada',
          description: 'Verifique se o formato do texto está correto.',
          variant: 'destructive',
        })
        return
      }

      const expensesWithSelection = expenses.map(exp => ({
        ...exp,
        selected: true,
        detectedCategory: importCategory,
      }))

      setParsedExpenses(expensesWithSelection)
      setShowParsedModal(true)
      setPastedText('')
      
      toast({
        title: 'Texto processado!',
        description: `${expenses.length} despesa(s) encontrada(s).`,
      })
    } catch (error: any) {
      console.error('Erro ao processar texto:', error)
      toast({
        title: 'Erro ao processar texto',
        description: error.message || 'Verifique o formato do texto.',
        variant: 'destructive',
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const parseTextToExpenses = (text: string): ParsedExpense[] => {
    const expenses: ParsedExpense[] = []
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      if (
        lowerLine.includes('título') ||
        lowerLine.includes('cliente') ||
        lowerLine.includes('total:') ||
        lowerLine.includes('vencido:') ||
        lowerLine.includes('a vencer:') ||
        lowerLine.includes('classificação') ||
        lowerLine.includes('despesas >') ||
        (lowerLine.includes('valor') && lowerLine.includes('emissão'))
      ) {
        continue
      }

      const match = line.match(/^(\d{5})\s+(.+)/i)
      if (!match) continue
      
      const codigo = match[1]
      const resto = match[2]
      
      const clienteMatch = resto.match(/^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s.]+?)(?=\s*R?\$)/i)
      if (!clienteMatch) continue
      
      const cliente = clienteMatch[1].trim()
      
      const valores = line.match(/R?\$([\d.,]+)/g)
      const datas = line.match(/\d{2}\/\d{2}\/\d{4}/g)
      
      if (!valores || valores.length === 0) continue
      
      const valorStr = valores.length > 1 ? valores[valores.length - 2] : valores[0]
      const amount = parseFloat(
        valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.')
      )
      
      if (amount <= 0) continue
      
      let paymentDate = ''
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      
      if (datas && datas.length >= 3) {
        const [dia, mes, ano] = datas[2].split('/')
        paymentDate = `${ano}-${mes}-${dia}`
      } else if (datas && datas.length > 0) {
        const [dia, mes, ano] = datas[datas.length - 1].split('/')
        paymentDate = `${ano}-${mes}-${dia}`
      } else {
        paymentDate = todayStr
      }
      
      expenses.push({
        title: codigo,
        client: cliente.substring(0, 100),
        amount,
        paymentDate,
        status: lowerLine.includes('quitado') ? 'Quitado' : 'Pendente',
      })
    }
    
    return expenses.filter((exp, index, self) =>
      index === self.findIndex(e => e.title === exp.title)
    )
  }

  // ============================================
  // HANDLERS - IMPORTAÇÃO FINAL
  // ============================================

  const handleImportExpenses = async () => {
    const selectedExpenses = parsedExpenses.filter(exp => exp.selected)
    
    if (selectedExpenses.length === 0) {
      toast({
        title: 'Nenhuma despesa selecionada',
        description: 'Selecione pelo menos uma despesa para importar.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = selectedExpenses.map(exp => ({
        title: exp.title,
        description: `Pagamento - ${exp.client}`,
        client: exp.client,
        category: exp.detectedCategory || importCategory,
        amount: exp.amount,
        expense_date: exp.paymentDate,
        payment_date: exp.paymentDate,
        notes: `Importado do Excel. Status: ${exp.status || 'N/A'}`,
      }))

      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()

      if (error) throw error

      toast({
        title: '✅ Despesas importadas!',
        description: `${selectedExpenses.length} despesa(s) adicionada(s).`,
      })

      setShowParsedModal(false)
      setParsedExpenses([])
      setShowCreateModal(false)
      
      if (selectedExpenses.length > 0 && selectedExpenses[0].paymentDate) {
        const dataImportada = selectedExpenses[0].paymentDate
        const mesAno = dataImportada.substring(0, 7)
        setFilterMonth(mesAno)
      }
      
      setTimeout(() => loadExpenses(), 100)

    } catch (error: any) {
      console.error('Erro ao importar:', error)
      toast({
        title: 'Erro ao importar',
        description: error.message || 'Não foi possível importar as despesas.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleExpenseSelection = (index: number) => {
    setParsedExpenses(prev => 
      prev.map((exp, i) => 
        i === index ? { ...exp, selected: !exp.selected } : exp
      )
    )
  }

  const toggleAllExpenses = (selected: boolean) => {
    setParsedExpenses(prev => prev.map(exp => ({ ...exp, selected })))
  }

  // ============================================
  // RENDER - LOADING
  // ============================================

  if (loadingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // ============================================
  // RENDER - PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
          <p className="text-gray-500">Gerencie as despesas do espaço de eventos</p>
        </div>
        <div className="flex items-center gap-2">
          {userId === SUPER_ADMIN_ID && expenses.length > 0 && (
            <Button 
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAllConfirm(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Todas ({expenses.length})
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowCreateModal(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          )}
        </div>
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
            <CardTitle className="text-sm font-medium text-gray-500">Total do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-gray-500 mt-1 capitalize">{getMonthLabel(filterMonth)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Quantidade</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredExpenses.length}</div>
            <p className="text-xs text-gray-500 mt-1">despesas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Categorias</CardTitle>
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
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* ✅ ATUALIZADO: Apenas 3 categorias */}
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
              <SelectContent className="max-h-[300px]">
                {monthOptions.map((option, idx) => {
                  const showYearHeader = idx === 0 || 
                    option.year !== monthOptions[idx - 1]?.year

                  return (
                    <div key={option.value}>
                      {showYearHeader && (
                        <div className="px-2 py-1.5 text-xs font-bold text-gray-400 bg-gray-50 sticky top-0 border-b">
                          ── {option.year} ──
                        </div>
                      )}
                      <SelectItem value={option.value}>
                        <span className={`capitalize ${option.isCurrentMonth ? 'font-bold text-blue-600' : ''}`}>
                          {option.label}
                        </span>
                      </SelectItem>
                    </div>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
          <CardDescription>{filteredExpenses.length} despesa(s) encontrada(s)</CardDescription>
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
                  onClick={() => { resetForm(); setShowCreateModal(true) }}
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
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.title || expense.description}</TableCell>
                      <TableCell>{expense.client || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: `${EXPENSE_CATEGORY_COLORS[expense.category] || '#6B7280'}20`,
                            color: EXPENSE_CATEGORY_COLORS[expense.category] || '#6B7280',
                          }}
                          variant="outline"
                        >
                          {EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(expense.payment_date || expense.expense_date)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
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

      {/* ============================================ */}
      {/* MODAL: CRIAR/EDITAR DESPESA                  */}
      {/* ✅ ATUALIZADO: Removido Select duplicado      */}
      {/* ============================================ */}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Faça as alterações necessárias.' : 'Preencha os dados ou importe do Excel.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Preencher Manual</TabsTrigger>
              <TabsTrigger value="import" disabled={!!editingExpense}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </TabsTrigger>
            </TabsList>

            {/* Tab: Preencher Manual */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              
              {/* ✅ SIMPLIFICADO: Apenas 3 botões de categoria (sem dropdown extra) */}
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {MAIN_EXPENSE_CATEGORIES.map((cat) => (
                    <Button
                      key={cat.value}
                      type="button"
                      variant={formData.category === cat.value ? 'default' : 'outline'}
                      className={`h-auto py-3 flex flex-col gap-1 ${
                        formData.category === cat.value 
                          ? 'ring-2 ring-offset-1' 
                          : ''
                      }`}
                      style={
                        formData.category === cat.value 
                          ? { 
                              backgroundColor: EXPENSE_CATEGORY_COLORS[cat.value],
                              borderColor: EXPENSE_CATEGORY_COLORS[cat.value],
                              color: 'white',
                            } 
                          : undefined
                      }
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      disabled={saving}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título (código)</Label>
                <Input
                  placeholder="Ex: 28795"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  placeholder="Ex: DAYANE CRISTINA DE P. VENTURA"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  placeholder="Ex: Pagamento de comissão"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Pago *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
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
                  <Label>Data de Pagamento *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        payment_date: e.target.value,
                        expense_date: e.target.value 
                      })}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Informações adicionais..."
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={saving}
                />
              </div>
            </TabsContent>

            {/* Tab: Importar Excel */}
            <TabsContent value="import" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria padrão (se não detectada no Excel)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {MAIN_EXPENSE_CATEGORIES.map((cat) => (
                      <Button
                        key={cat.value}
                        type="button"
                        variant={importCategory === cat.value ? 'default' : 'outline'}
                        className={`h-auto py-3 flex flex-col gap-1 ${
                          importCategory === cat.value 
                            ? 'ring-2 ring-offset-1' 
                            : ''
                        }`}
                                                style={
                          importCategory === cat.value 
                            ? { 
                                backgroundColor: EXPENSE_CATEGORY_COLORS[cat.value],
                                borderColor: EXPENSE_CATEGORY_COLORS[cat.value],
                                color: 'white',
                              } 
                            : undefined
                        }
                        onClick={() => setImportCategory(cat.value)}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-xs font-medium">{cat.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Importar do Excel (Recomendado)
                  </p>
                  <p className="text-sm text-green-700 mb-4">
                    O sistema detecta automaticamente Comissão, Mão de Obra e Manutenção.
                  </p>
                  
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors bg-white">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                      id="excel-upload"
                      disabled={uploadingFile}
                    />
                    <label 
                      htmlFor="excel-upload" 
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
                          <p className="text-green-600 font-medium">Processando...</p>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-gray-700 font-medium">
                              Clique para selecionar o arquivo Excel
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Formatos: .xlsx, .xls
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">ou cole o texto</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-500">Colar texto (alternativa):</Label>
                  <Textarea
                    placeholder="Cole aqui as linhas copiadas do Excel..."
                    rows={5}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button 
                    onClick={handleParseText} 
                    disabled={!pastedText.trim() || uploadingFile}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Processar Texto
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : editingExpense ? (
                'Salvar Alterações'
              ) : (
                'Criar Despesa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* MODAL: PREVIEW DAS DESPESAS IMPORTADAS       */}
      {/* ============================================ */}
      <Dialog open={showParsedModal} onOpenChange={setShowParsedModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Despesas Encontradas
            </DialogTitle>
            <DialogDescription>
              {parsedExpenses.length} despesa(s) encontrada(s). Selecione as que deseja importar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-blue-600">
                  {parsedExpenses.filter(e => e.selected).length}
                </span> de {parsedExpenses.length} selecionada(s)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleAllExpenses(true)}>
                  Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleAllExpenses(false)}>
                  Desmarcar Todas
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedExpenses.map((expense, index) => (
                    <TableRow 
                      key={index} 
                      className={`cursor-pointer transition-colors ${
                        expense.selected ? 'bg-blue-50 hover:bg-blue-100' : 'opacity-50 hover:opacity-75'
                      }`}
                      onClick={() => toggleExpenseSelection(index)}
                    >
                      <TableCell>
                        {expense.selected ? (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{expense.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={expense.client}>
                        {expense.client}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          style={{ 
                            backgroundColor: `${EXPENSE_CATEGORY_COLORS[expense.detectedCategory || importCategory] || '#6B7280'}20`,
                            color: EXPENSE_CATEGORY_COLORS[expense.detectedCategory || importCategory] || '#6B7280',
                          }}
                        >
                          {EXPENSE_CATEGORY_LABELS[expense.detectedCategory || importCategory] || 'Outros'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(expense.paymentDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Total Selecionado:</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  parsedExpenses
                    .filter(e => e.selected)
                    .reduce((sum, e) => sum + e.amount, 0)
                )}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { 
                setShowParsedModal(false)
                setParsedExpenses([]) 
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImportExpenses} 
              disabled={saving || parsedExpenses.filter(e => e.selected).length === 0}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {parsedExpenses.filter(e => e.selected).length} despesa(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: CONFIRMAR EXCLUSÃO INDIVIDUAL        */}
      {/* ============================================ */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A despesa será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo...</>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* DIALOG: CONFIRMAR EXCLUSÃO EM MASSA          */}
      {/* ============================================ */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir TODAS as despesas?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a excluir <strong className="text-red-600">{expenses.length} despesa(s)</strong> do 
                  mês de <strong className="capitalize">{getMonthLabel(filterMonth)}</strong>.
                </p>
                <p className="text-red-600 font-medium">
                  ⚠️ Esta ação é IRREVERSÍVEL! Todas as despesas deste mês serão permanentemente removidas.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <p className="text-sm text-red-800">
                    Total a ser excluído: <strong>{formatCurrency(totalExpenses)}</strong>
                  </p>
                  <p className="text-sm text-red-800">
                    Quantidade: <strong>{expenses.length} despesas</strong>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllMonth}
              disabled={deletingAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingAll ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo todas...</>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sim, excluir {expenses.length} despesas
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}