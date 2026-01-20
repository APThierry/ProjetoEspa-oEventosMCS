// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Event, ReservationStatus, ColorScheme } from "./types"
import { DEFAULT_COLORS } from "./types"

// Merge de classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatação de datas
export function formatDate(date: string | Date, formatStr: string = "dd/MM/yyyy"): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: ptBR })
}

export function formatDateLong(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatMonth(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, "MMMM yyyy", { locale: ptBR })
}

// ✅ NOVO: Verificar se evento está pago (baseado nas parcelas)
export function isEventPaid(event: Event): boolean {
  if (!event.installments || event.installments.length === 0) {
    return false
  }
  return event.installments.every(inst => inst.payment_status === 'PAGO')
}

// ✅ NOVO: Verificar se evento tem alguma parcela paga
export function hasAnyPayment(event: Event): boolean {
  if (!event.installments || event.installments.length === 0) {
    return false
  }
  return event.installments.some(inst => inst.payment_status === 'PAGO')
}

// ✅ ATUALIZADO: Determinar cor do evento
export function getEventColor(
  event: Event,
  colorScheme: ColorScheme = DEFAULT_COLORS
): string {
  // Prioridade 1: Cor customizada
  if (event.color_override) {
    return event.color_override
  }

  // Prioridade 2: Totalmente pago (azul)
  if (isEventPaid(event)) {
    return colorScheme.reserva_paga
  }
  
  // Prioridade 3: Com contrato (verde)
  if (event.has_contract) {
    return colorScheme.reserva_com_contrato
  }
  
  // Prioridade 4: Por status de reserva
  switch (event.reservation_status) {
    case 'RESERVA_CONFIRMADA':
      return colorScheme.reserva_com_contrato // Verde
    case 'RESERVA_EM_ANDAMENTO':
      return colorScheme.reserva_em_andamento // Âmbar
    case 'PRE_RESERVA':
      return colorScheme.pre_reserva // Cinza
    default:
      return colorScheme.pre_reserva
  }
}

// Labels para ENUMs
export const EVENT_TYPE_LABELS: Record<string, string> = {
  CEV_502: 'CEV – 502',
  FPP_501: 'FPP – 501',
}

// ✅ ATUALIZADO: Removido SEM_RESERVA, adicionado RESERVA_EM_ANDAMENTO
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PRE_RESERVA: 'Pré-Reserva',
  RESERVA_EM_ANDAMENTO: 'Reserva em Andamento',
  RESERVA_CONFIRMADA: 'Reserva Confirmada',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VISUALIZADOR: 'Visualizador'
}

// Validar permissões
export function canEdit(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR'
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'ADMIN'
}

// ✅ ATUALIZADO: Cores de status para badges
export function getStatusBadgeColor(status: ReservationStatus): string {
  switch (status) {
    case 'RESERVA_CONFIRMADA':
      return 'bg-green-100 text-green-800'
    case 'RESERVA_EM_ANDAMENTO':
      return 'bg-amber-100 text-amber-800'
    case 'PRE_RESERVA':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getPaymentBadgeColor(isPaid: boolean, hasContract: boolean): string {
  if (!hasContract) return 'bg-gray-100 text-gray-600'
  if (isPaid) return 'bg-green-100 text-green-800'
  return 'bg-red-100 text-red-800'
}

// ✅ NOVO: Obter porcentagem de pagamento do evento
export function getPaymentPercentage(event: Event): number {
  if (!event.installments || event.installments.length === 0) {
    return 0
  }
  
  const total = event.installments.reduce((sum, inst) => sum + inst.amount, 0)
  const paid = event.installments
    .filter(inst => inst.payment_status === 'PAGO')
    .reduce((sum, inst) => sum + inst.amount, 0)
  
  if (total === 0) return 0
  return Math.round((paid / total) * 100)
}

// ✅ NOVO: Formatar valor em reais
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}