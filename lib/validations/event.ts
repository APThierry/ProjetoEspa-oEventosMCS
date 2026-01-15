import { z } from 'zod'

// Usando string simples ao invés de enum para evitar problemas
export const eventSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),
  
  event_date: z
    .string()
    .min(1, 'Data é obrigatória'),
  
  event_type: z
    .string()
    .min(1, 'Selecione um tipo de evento'),
  
  reservation_status: z
    .string()
    .min(1, 'Selecione um status de reserva'),
  
  has_contract: z.boolean(),
  
  is_paid: z.boolean(),
  
  contract_due_date: z.string().optional().nullable(),
  
  observations: z.string().optional().nullable(),
})

export type EventFormData = z.infer<typeof eventSchema>