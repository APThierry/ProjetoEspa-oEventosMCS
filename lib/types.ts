// lib/types.ts

// ===========================================
// TIPOS ATUALIZADOS v2.1
// ===========================================

export type UserRole = 'ADMIN' | 'EDITOR' | 'VISUALIZADOR'

// ✅ ATUALIZADO: Novos tipos de evento
export type EventType = 'CEV_502' | 'FPP_501'

// ✅ NOVO: Categoria de evento
export type EventCategory = 
  | 'STAND_UP'
  | 'TEATRAL'
  | 'MUSICAL'
  | 'FORMATURA'
  | 'EMPRESARIAL'
  | 'FEIRAS'
  | 'CONGRESSO'
  | 'OUTROS'

// ✅ ATUALIZADO v2.1: Removido SEM_RESERVA, Adicionado RESERVA_EM_ANDAMENTO
export type ReservationStatus = 'PRE_RESERVA' | 'RESERVA_EM_ANDAMENTO' | 'RESERVA_CONFIRMADA'

// ✅ NOVO: Status de pagamento
export type PaymentStatus = 'PAGO' | 'NAO_PAGO'

// ✅ NOVO: Categoria de despesa
export type ExpenseCategory =
  | 'ALUGUEL'
  | 'ENERGIA'
  | 'AGUA'
  | 'INTERNET'
  | 'TELEFONE'
  | 'MANUTENCAO'
  | 'LIMPEZA'
  | 'SEGURANCA'
  | 'MARKETING'
  | 'PESSOAL'
  | 'EQUIPAMENTOS'
  | 'ALIMENTACAO'
  | 'TRANSPORTE'
  | 'IMPOSTOS'
  | 'SEGUROS'
  | 'OUTROS'

export type AlertType = 'VENCIMENTO_10_DIAS' | 'VENCIMENTO_EXPIRADO' | 'LEMBRETE_EVENTO'
export type AlertStatus = 'PENDING' | 'SENT' | 'FAILED'
export type ReportType = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL'

// ===========================================
// INTERFACES
// ===========================================

export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  notification_email: string | null
  receive_alerts: boolean
  receive_reports: boolean
  created_at: string
  updated_at: string
}

// ✅ ATUALIZADO: Interface de Evento
export interface Event {
  id: string
  name: string
  event_date: string
  event_type: EventType
  event_category: EventCategory
  reservation_status: ReservationStatus
  has_contract: boolean
  estimated_audience: number | null
  observations: string | null
  color_override: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Relacionamentos (quando carregados)
  installments?: ContractInstallment[]
}

// ✅ NOVO: Interface de Parcela
export interface ContractInstallment {
  id: string
  event_id: string
  installment_number: number
  amount: number
  due_date: string
  payment_status: PaymentStatus
  paid_at: string | null
  payment_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ✅ NOVO: Interface de Despesa
export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  expense_date: string
  event_id: string | null
  is_recurring: boolean
  recurrence_type: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Relacionamento (quando carregado)
  event?: Event
}

// ✅ NOVO: Interface para formulário de parcela
export interface InstallmentFormData {
  id?: string
  installment_number: number
  amount: number
  due_date: string
  payment_status: PaymentStatus
  notes?: string
}

// ✅ NOVO: Interface para formulário de evento
export interface EventFormData {
  name: string
  event_date: string
  event_type: EventType
  event_category: EventCategory
  reservation_status: ReservationStatus
  has_contract: boolean
  estimated_audience: number | null
  observations: string | null
  installments: InstallmentFormData[]
}

export interface Holiday {
  id: string
  name: string
  date: string
  is_national: boolean
  year: number
  created_at: string
}

export interface AlertLog {
  id: string
  event_id: string
  alert_type: string
  sent_to: string
  sent_at: string
  status: string
  error_message: string | null
  retry_count: number
  next_retry_at: string | null
}

export interface SystemSetting {
  id: string
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_at: string
  updated_by: string | null
}

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
}

// ===========================================
// CORES PADRÃO - ATUALIZADO v2.1
// ===========================================

export interface ColorScheme {
  reserva_com_contrato: string
  reserva_paga: string
  pre_reserva: string
  reserva_em_andamento: string  // ✅ NOVO: Substituiu sem_reserva
}

export const DEFAULT_COLORS: ColorScheme = {
  reserva_com_contrato: '#22C55E',    // Verde - Contrato assinado
  reserva_paga: '#3B82F6',            // Azul - Pago
  pre_reserva: '#9CA3AF',             // Cinza - Pré-reserva
  reserva_em_andamento: '#F59E0B',    // ✅ NOVO: Âmbar/Laranja - Em andamento
}

// ===========================================
// RESUMOS FINANCEIROS
// ===========================================

export interface FinancialSummary {
  totalRevenue: number
  totalExpenses: number
  netResult: number
  eventsCount: number
  paidInstallmentsCount: number
  pendingInstallmentsCount: number
}

export interface CategorySummary {
  category: EventCategory
  count: number
  totalRevenue: number
  percentage: number
}