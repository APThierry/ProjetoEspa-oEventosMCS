// Feriados nacionais do Brasil (fixos)
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

// Configurações padrão do sistema
export const DEFAULT_SETTINGS = {
  alertDaysBeforeDue: 10,
  sendOverdueAlerts: true,
  reportDayOfMonth: 1,
} as const

// Rotas da aplicação
export const ROUTES = {
  home: '/',
  login: '/login',
  calendario: '/calendario',
  eventos: '/eventos',
  relatorios: '/relatorios',
  configuracoes: '/configuracoes',
  usuarios: '/usuarios',
} as const

// Mensagens de erro
export const ERROR_MESSAGES = {
  generic: 'Ocorreu um erro. Tente novamente.',
  unauthorized: 'Você não tem permissão para realizar esta ação.',
  notFound: 'Recurso não encontrado.',
  validation: 'Por favor, verifique os dados informados.',
} as const