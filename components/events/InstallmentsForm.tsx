'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Plus, 
  Trash2, 
  DollarSign,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/constants'

// Tipo literal para payment_status
type PaymentStatusType = 'PAGO' | 'NAO_PAGO'

export interface InstallmentData {
  id?: string
  installment_number: number
  amount: number
  due_date: string
  payment_status: PaymentStatusType
  notes?: string
}

interface InstallmentsFormProps {
  installments: InstallmentData[]
  onChange: (installments: InstallmentData[]) => void
  disabled?: boolean
}

export function InstallmentsForm({ 
  installments, 
  onChange, 
  disabled = false 
}: InstallmentsFormProps) {
  
  // Adicionar nova parcela
  const handleAddInstallment = () => {
    const newNumber = installments.length + 1
    const lastDueDate = installments.length > 0 
      ? new Date(installments[installments.length - 1].due_date)
      : new Date()
    
    // Próxima parcela vence 30 dias depois
    lastDueDate.setDate(lastDueDate.getDate() + 30)
    
    const newInstallment: InstallmentData = {
      installment_number: newNumber,
      amount: 0,
      due_date: format(lastDueDate, 'yyyy-MM-dd'),
      payment_status: 'NAO_PAGO',
    }
    
    onChange([...installments, newInstallment])
  }

  // Remover parcela
  const handleRemoveInstallment = (index: number) => {
    if (installments.length <= 1) return // Mínimo 1 parcela
    
    const updated = installments
      .filter((_, i) => i !== index)
      .map((inst, i) => ({
        ...inst,
        installment_number: i + 1
      }))
    
    onChange(updated)
  }

  // Atualizar valor da parcela
  const handleUpdateAmount = (index: number, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0
    const updated = installments.map((inst, i) => 
      i === index ? { ...inst, amount: numValue } : inst
    )
    onChange(updated)
  }

  // Atualizar data de vencimento
  const handleUpdateDueDate = (index: number, value: string) => {
    const updated = installments.map((inst, i) => 
      i === index ? { ...inst, due_date: value } : inst
    )
    onChange(updated)
  }

  // Atualizar status de pagamento
  const handleUpdatePaymentStatus = (index: number, isPaid: boolean) => {
    const newStatus: PaymentStatusType = isPaid ? 'PAGO' : 'NAO_PAGO'
    const updated = installments.map((inst, i) => 
      i === index ? { ...inst, payment_status: newStatus } : inst
    )
    onChange(updated)
  }

  // Calcular total
  const totalAmount = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0)
  const totalPaid = installments
    .filter(inst => inst.payment_status === 'PAGO')
    .reduce((sum, inst) => sum + (inst.amount || 0), 0)
  const totalPending = totalAmount - totalPaid

  // Verificar se parcela está vencida
  const isOverdue = (dueDate: string, status: PaymentStatusType) => {
    if (status === 'PAGO') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Parcelas do Contrato</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddInstallment}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Parcela
        </Button>
      </div>

      {/* Lista de Parcelas */}
      <div className="space-y-3">
        {installments.map((installment, index) => {
          const overdue = isOverdue(installment.due_date, installment.payment_status)
          
          return (
            <Card 
              key={index} 
              className={`${overdue ? 'border-red-300 bg-red-50' : ''} ${
                installment.payment_status === 'PAGO' ? 'border-green-300 bg-green-50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Número da Parcela */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold shrink-0">
                    {installment.installment_number}
                  </div>

                  {/* Campos */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Valor */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Valor</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          className="pl-8"
                          value={installment.amount || ''}
                          onChange={(e) => handleUpdateAmount(index, e.target.value)}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    {/* Data de Vencimento */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Vencimento</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          className="pl-8"
                          value={installment.due_date}
                          onChange={(e) => handleUpdateDueDate(index, e.target.value)}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    {/* Status de Pagamento */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Status</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch
                          checked={installment.payment_status === 'PAGO'}
                          onCheckedChange={(checked) => handleUpdatePaymentStatus(index, checked)}
                          disabled={disabled}
                        />
                        <span className={`text-sm ${
                          installment.payment_status === 'PAGO' 
                            ? 'text-green-600 font-medium' 
                            : overdue 
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                        }`}>
                          {installment.payment_status === 'PAGO' ? 'Pago' : overdue ? 'Vencido' : 'Não Pago'}
                        </span>
                        {overdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                    </div>
                  </div>

                  {/* Botão Remover */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => handleRemoveInstallment(index)}
                    disabled={disabled || installments.length <= 1}
                    title={installments.length <= 1 ? 'Mínimo 1 parcela' : 'Remover parcela'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Resumo */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total do Contrato:</span>
          <span className="font-bold">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-green-600">Total Pago:</span>
          <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-amber-600">Total Pendente:</span>
          <span className="font-medium text-amber-600">{formatCurrency(totalPending)}</span>
        </div>
        {installments.length > 1 && (
          <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
            <span>Parcelas:</span>
            <span>{installments.filter(i => i.payment_status === 'PAGO').length} de {installments.length} pagas</span>
          </div>
        )}
      </div>
    </div>
  )
}