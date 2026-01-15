import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  notification_email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .nullable(),
  receive_alerts: z.boolean(),
  receive_reports: z.boolean(),
})

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>