// ===========================================
// TIPOS SIMPLES (sem dependência de ENUMs complexos)
// ===========================================

export type UserRole = 'ADMIN' | 'EDITOR' | 'VISUALIZADOR'
export type EventType = 'MARKETING' | 'FUNDO_CONTRATO'
export type ReservationStatus = 'SEM_RESERVA' | 'PRE_RESERVA' | 'RESERVA_CONFIRMADA'
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

export interface Event {
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
// CORES PADRÃO
// ===========================================

export interface ColorScheme {
  reserva_com_contrato: string
  reserva_paga: string
  pre_reserva: string
  sem_reserva: string
}

export const DEFAULT_COLORS: ColorScheme = {
  reserva_com_contrato: '#22C55E',
  reserva_paga: '#3B82F6',
  pre_reserva: '#9CA3AF',
  sem_reserva: '#F3F4F6',
}