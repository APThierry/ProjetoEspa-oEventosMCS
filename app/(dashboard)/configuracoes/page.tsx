'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { 
  Settings, 
  Palette, 
  Bell, 
  Save,
  Loader2,
  RotateCcw
} from 'lucide-react'

interface ColorScheme {
  reserva_com_contrato: string
  reserva_paga: string
  pre_reserva: string
  sem_reserva: string
}

interface AlertSettings {
  days_before_due: number
  send_overdue_alert: boolean
}

const DEFAULT_COLORS: ColorScheme = {
  reserva_com_contrato: '#22C55E',
  reserva_paga: '#3B82F6',
  pre_reserva: '#9CA3AF',
  sem_reserva: '#F3F4F6',
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  days_before_due: 10,
  send_overdue_alert: true,
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [colors, setColors] = useState<ColorScheme>(DEFAULT_COLORS)
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS)

  const supabase = createClient()
  const { toast } = useToast()

  const loadSettings = async () => {
    setLoading(true)
    try {
      // Carregar cores
      const { data: colorData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'color_scheme')
        .single()

      if (colorData?.value) {
        setColors(colorData.value as ColorScheme)
      }

      // Carregar configurações de alertas
      const { data: alertData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'alert_settings')
        .single()

      if (alertData?.value) {
        setAlertSettings(alertData.value as AlertSettings)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveColors = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: colors })
        .eq('key', 'color_scheme')

      if (error) throw error

      toast({
        title: 'Cores salvas',
        description: 'As cores do calendário foram atualizadas.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as cores.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAlerts = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: alertSettings })
        .eq('key', 'alert_settings')

      if (error) throw error

      toast({
        title: 'Alertas salvos',
        description: 'As configurações de alertas foram atualizadas.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetColors = () => {
    setColors(DEFAULT_COLORS)
    toast({
      title: 'Cores resetadas',
      description: 'As cores foram restauradas para o padrão. Clique em Salvar para confirmar.',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-gray-500">
          Personalize o sistema de acordo com suas necessidades
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cores do Calendário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Cores do Calendário
            </CardTitle>
            <CardDescription>
              Personalize as cores dos indicadores de eventos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reserva Paga */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Reserva Paga</Label>
                <p className="text-sm text-gray-500">
                  Eventos com contrato pago
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: colors.reserva_paga }}
                />
                <Input
                  type="color"
                  value={colors.reserva_paga}
                  onChange={(e) => setColors({ ...colors, reserva_paga: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Reserva com Contrato */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Com Contrato</Label>
                <p className="text-sm text-gray-500">
                  Eventos com contrato pendente
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: colors.reserva_com_contrato }}
                />
                <Input
                  type="color"
                  value={colors.reserva_com_contrato}
                  onChange={(e) => setColors({ ...colors, reserva_com_contrato: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Pré-Reserva */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Pré-Reserva</Label>
                <p className="text-sm text-gray-500">
                  Eventos em pré-reserva
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: colors.pre_reserva }}
                />
                <Input
                  type="color"
                  value={colors.pre_reserva}
                  onChange={(e) => setColors({ ...colors, pre_reserva: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Sem Reserva */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Sem Reserva</Label>
                <p className="text-sm text-gray-500">
                  Eventos sem reserva definida
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: colors.sem_reserva }}
                />
                <Input
                  type="color"
                  value={colors.sem_reserva}
                  onChange={(e) => setColors({ ...colors, sem_reserva: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t">
              <Label className="mb-3 block">Preview</Label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colors.reserva_paga }}
                  />
                  <span className="text-sm">Pago</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colors.reserva_com_contrato }}
                  />
                  <span className="text-sm">Contrato</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colors.pre_reserva }}
                  />
                  <span className="text-sm">Pré-Reserva</span>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleResetColors} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              <Button onClick={handleSaveColors} disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Cores
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Automáticos
            </CardTitle>
            <CardDescription>
              Configure os alertas de vencimento de contratos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dias antes do vencimento */}
            <div className="space-y-2">
              <Label>Dias antes do vencimento</Label>
              <p className="text-sm text-gray-500">
                Quantos dias antes do vencimento enviar o primeiro alerta
              </p>
              <Input
                type="number"
                min="1"
                max="30"
                value={alertSettings.days_before_due}
                onChange={(e) => setAlertSettings({ 
                  ...alertSettings, 
                  days_before_due: parseInt(e.target.value) || 10 
                })}
                className="w-32"
              />
            </div>

            {/* Alerta de contrato vencido */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Alerta de contrato vencido</Label>
                <p className="text-sm text-gray-500">
                  Enviar alerta diário para contratos vencidos
                </p>
              </div>
              <Switch
                checked={alertSettings.send_overdue_alert}
                onCheckedChange={(checked) => setAlertSettings({ 
                  ...alertSettings, 
                  send_overdue_alert: checked 
                })}
              />
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Como funcionam os alertas:</strong>
              </p>
              <ul className="text-sm text-blue-600 mt-2 space-y-1">
                <li>• Alertas são enviados por e-mail automaticamente</li>
                <li>• O primeiro alerta é enviado {alertSettings.days_before_due} dias antes</li>
                {alertSettings.send_overdue_alert && (
                  <li>• Contratos vencidos recebem alerta diário</li>
                )}
                <li>• Apenas usuários com "Receber Alertas" ativo são notificados</li>
              </ul>
            </div>

            {/* Botão Salvar */}
            <Button onClick={handleSaveAlerts} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Versão</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500">Ambiente</p>
              <p className="font-medium">Produção</p>
            </div>
            <div>
              <p className="text-gray-500">Banco de Dados</p>
              <p className="font-medium">Supabase</p>
            </div>
            <div>
              <p className="text-gray-500">Framework</p>
              <p className="font-medium">Next.js 14</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}