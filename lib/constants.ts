// lib/constants.ts

// ===========================================
// OPÇÕES DE TIPO DE EVENTO (ATUALIZADO)
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
// OPÇÕES DE CATEGORIA DE EVENTO (NOVO)
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
// OPÇÕES DE STATUS DE RESERVA - ATUALIZADO v2.1
// ===========================================

export const RESERVATION_STATUS_OPTIONS = [
  { value: 'PRE_RESERVA', label: 'Pré-Reserva' },
  { value: 'RESERVA_EM_ANDAMENTO', label: 'Reserva em Andamento' },  // ✅ NOVO
  { value: 'RESERVA_CONFIRMADA', label: 'Reserva Confirmada' },
] as const

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PRE_RESERVA: 'Pré-Reserva',
  RESERVA_EM_ANDAMENTO: 'Reserva em Andamento',  // ✅ NOVO
  RESERVA_CONFIRMADA: 'Reserva Confirmada',
}

// ✅ NOVO: Cores por status de reserva
export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  PRE_RESERVA: '#9CA3AF',           // Cinza
  RESERVA_EM_ANDAMENTO: '#F59E0B',  // Âmbar/Laranja
  RESERVA_CONFIRMADA: '#22C55E',    // Verde
}

// ===========================================
// OPÇÕES DE STATUS DE PAGAMENTO (NOVO)
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
// OPÇÕES DE CATEGORIA DE DESPESA (NOVO)
// ===========================================

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'ENERGIA', label: 'Energia' },
  { value: 'AGUA', label: 'Água' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'LIMPEZA', label: 'Limpeza' },
  { value: 'SEGURANCA', label: 'Segurança' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'PESSOAL', label: 'Pessoal' },
  { value: 'EQUIPAMENTOS', label: 'Equipamentos' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'IMPOSTOS', label: 'Impostos' },
  { value: 'SEGUROS', label: 'Seguros' },
  { value: 'OUTROS', label: 'Outros' },
] as const

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ALUGUEL: 'Aluguel',
  ENERGIA: 'Energia',
  AGUA: 'Água',
  INTERNET: 'Internet',
  TELEFONE: 'Telefone',
  MANUTENCAO: 'Manutenção',
  LIMPEZA: 'Limpeza',
  SEGURANCA: 'Segurança',
  MARKETING: 'Marketing',
  PESSOAL: 'Pessoal',
  EQUIPAMENTOS: 'Equipamentos',
  ALIMENTACAO: 'Alimentação',
  TRANSPORTE: 'Transporte',
  IMPOSTOS: 'Impostos',
  SEGUROS: 'Seguros',
  OUTROS: 'Outros',
}

// ===========================================
// CORES POR CATEGORIA (NOVO)
// ===========================================

export const CATEGORY_COLORS: Record<string, string> = {
  STAND_UP: '#8B5CF6',      // Roxo
  TEATRAL: '#EC4899',       // Rosa
  MUSICAL: '#F59E0B',       // Âmbar
  FORMATURA: '#10B981',     // Verde
  EMPRESARIAL: '#3B82F6',   // Azul
  FEIRAS: '#6366F1',        // Índigo
  CONGRESSO: '#14B8A6',     // Teal
  OUTROS: '#6B7280',        // Cinza
}

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  ALUGUEL: '#EF4444',
  ENERGIA: '#F59E0B',
  AGUA: '#3B82F6',
  INTERNET: '#8B5CF6',
  TELEFONE: '#EC4899',
  MANUTENCAO: '#F97316',
  LIMPEZA: '#10B981',
  SEGURANCA: '#6366F1',
  MARKETING: '#14B8A6',
  PESSOAL: '#EAB308',
  EQUIPAMENTOS: '#A855F7',
  ALIMENTACAO: '#22C55E',
  TRANSPORTE: '#0EA5E9',
  IMPOSTOS: '#DC2626',
  SEGUROS: '#7C3AED',
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