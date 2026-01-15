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

// Determinar cor do evento
export function getEventColor(
  event: Event,
  colorScheme: ColorScheme = DEFAULT_COLORS
): string {
  if (event.color_override) {
    return event.color_override
  }

  if (event.is_paid) {
    return colorScheme.reserva_paga
  }
  
  if (event.has_contract) {
    return colorScheme.reserva_com_contrato
  }
  
  if (event.reservation_status === 'PRE_RESERVA') {
    return colorScheme.pre_reserva
  }
  
  return colorScheme.sem_reserva
}

// Labels para ENUMs
export const EVENT_TYPE_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  FUNDO_CONTRATO: 'Fundo de Contrato'
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  SEM_RESERVA: 'Sem Reserva',
  PRE_RESERVA: 'Pré-Reserva',
  RESERVA_CONFIRMADA: 'Reserva Confirmada'
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

// Cores de status para badges
export function getStatusBadgeColor(status: ReservationStatus): string {
  switch (status) {
    case 'RESERVA_CONFIRMADA':
      return 'bg-green-100 text-green-800'
    case 'PRE_RESERVA':
      return 'bg-yellow-100 text-yellow-800'
    case 'SEM_RESERVA':
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