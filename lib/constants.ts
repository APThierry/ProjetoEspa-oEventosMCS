// lib/constants.ts

// ===========================================
// OPÇÕES DE TIPO DE EVENTO
// ===========================================

export const EVENT_TYPE_OPTIONS = [
  { value: 'CEV_502', label: 'CEV – 502' },
  { value: 'FPP_501', label: 'FPP – 501' },
] as const

export const EVENT_TYPE_LABELS: Record<string, string> = {
  CEV_502: 'CEV – 502',
  FPP_501: 'FPP – 501',
}

// ===========================================
// OPÇÕES DE CATEGORIA DE EVENTO
// ===========================================

export const EVENT_CATEGORY_OPTIONS = [
  { value: 'STAND_UP', label: 'Stand Up' },
  { value: 'TEATRAL', label: 'Teatral' },
  { value: 'MUSICAL', label: 'Musical' },
  { value: 'FORMATURA', label: 'Formatura' },
  { value: 'EMPRESARIAL', label: 'Empresarial' },
  { value: 'FEIRAS', label: 'Feiras' },
  { value: 'CONGRESSO', label: 'Congresso' },
  { value: 'OUTROS', label: 'Outros' },
] as const

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  STAND_UP: 'Stand Up',
  TEATRAL: 'Teatral',
  MUSICAL: 'Musical',
  FORMATURA: 'Formatura',
  EMPRESARIAL: 'Empresarial',
  FEIRAS: 'Feiras',
  CONGRESSO: 'Congresso',
  OUTROS: 'Outros',
}

// ===========================================
// OPÇÕES DE STATUS DE RESERVA - v2.1
// ===========================================

export const RESERVATION_STATUS_OPTIONS = [
  { value: 'PRE_RESERVA', label: 'Pré-Reserva' },
  { value: 'RESERVA_EM_ANDAMENTO', label: 'Reserva em Andamento' },
  { value: 'RESERVA_CONFIRMADA', label: 'Reserva Confirmada' },
] as const

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PRE_RESERVA: 'Pré-Reserva',
  RESERVA_EM_ANDAMENTO: 'Reserva em Andamento',
  RESERVA_CONFIRMADA: 'Reserva Confirmada',
}

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  PRE_RESERVA: '#9CA3AF',
  RESERVA_EM_ANDAMENTO: '#F59E0B',
  RESERVA_CONFIRMADA: '#22C55E',
}

// ===========================================
// OPÇÕES DE STATUS DE PAGAMENTO
// ===========================================

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'NAO_PAGO', label: 'Não Pago' },
  { value: 'PAGO', label: 'Pago' },
] as const

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAGO: 'Pago',
  NAO_PAGO: 'Não Pago',
}

// ===========================================
// ✅ CATEGORIAS DE DESPESAS - v2.2 (APENAS 3)
// ===========================================

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'COMISSAO', label: 'Comissão' },
  { value: 'MAO_DE_OBRA', label: 'Mão de Obra' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
] as const

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  COMISSAO: 'Comissão',
  MAO_DE_OBRA: 'Mão de Obra',
  MANUTENCAO: 'Manutenção',
}

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  COMISSAO: '#F59E0B',     // Âmbar/Dourado — 💰
  MAO_DE_OBRA: '#3B82F6',  // Azul — 👷
  MANUTENCAO: '#F97316',   // Laranja — 🔧
}

// Atalhos com ícone (usados nos botões do formulário)
export const MAIN_EXPENSE_CATEGORIES = [
  { value: 'COMISSAO', label: 'Comissão', icon: '💰' },
  { value: 'MAO_DE_OBRA', label: 'Mão de Obra', icon: '👷' },
  { value: 'MANUTENCAO', label: 'Manutenção', icon: '🔧' },
] as const

// ===========================================
// CORES POR CATEGORIA DE EVENTO
// ===========================================

export const CATEGORY_COLORS: Record<string, string> = {
  STAND_UP: '#8B5CF6',
  TEATRAL: '#EC4899',
  MUSICAL: '#F59E0B',
  FORMATURA: '#10B981',
  EMPRESARIAL: '#3B82F6',
  FEIRAS: '#6366F1',
  CONGRESSO: '#14B8A6',
  OUTROS: '#6B7280',
}

// ===========================================
// FERIADOS NACIONAIS
// ===========================================

export const FERIADOS_NACIONAIS = [
  { name: 'Confraternização Universal', day: 1, month: 1 },
  { name: 'Tiradentes', day: 21, month: 4 },
  { name: 'Dia do Trabalhador', day: 1, month: 5 },
  { name: 'Independência do Brasil', day: 7, month: 9 },
  { name: 'Nossa Senhora Aparecida', day: 12, month: 10 },
  { name: 'Finados', day: 2, month: 11 },
  { name: 'Proclamação da República', day: 15, month: 11 },
  { name: 'Natal', day: 25, month: 12 },
] as const

// ===========================================
// CONFIGURAÇÕES PADRÃO
// ===========================================

export const DEFAULT_SETTINGS = {
  alertDaysBeforeDue: 10,
  sendOverdueAlerts: true,
  reportDayOfMonth: 1,
} as const

// ===========================================
// ROTAS
// ===========================================

export const ROUTES = {
  home: '/',
  login: '/login',
  calendario: '/calendario',
  eventos: '/eventos',
  relatorios: '/relatorios',
  despesas: '/despesas',
  configuracoes: '/configuracoes',
  usuarios: '/usuarios',
} as const

// ===========================================
// MENSAGENS DE ERRO
// ===========================================

export const ERROR_MESSAGES = {
  generic: 'Ocorreu um erro. Tente novamente.',
  unauthorized: 'Você não tem permissão para realizar esta ação.',
  notFound: 'Recurso não encontrado.',
  validation: 'Por favor, verifique os dados informados.',
} as const

// ===========================================
// FORMATAÇÃO
// ===========================================

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}