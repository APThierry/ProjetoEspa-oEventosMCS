// app/(dashboard)/configuracoes/email/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Mail, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function EmailConfigPage() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Erro',
        description: 'Digite um e-mail para teste',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          to: testEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setLastResult('success');
        toast({
          title: '✅ E-mail enviado!',
          description: `E-mail de teste enviado para ${testEmail}`,
        });
      } else {
        setLastResult('error');
        toast({
          title: 'Erro ao enviar',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setLastResult('error');
      toast({
        title: 'Erro',
        description: 'Falha na comunicação com o servidor',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuração de E-mails</h1>
        <p className="text-muted-foreground">
          Configure e teste o envio de e-mails do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Teste */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Teste de E-mail
            </CardTitle>
            <CardDescription>
              Envie um e-mail de teste para verificar se está funcionando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={loading}
              />
              <Button onClick={sendTestEmail} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {lastResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  lastResult === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {lastResult === 'success' ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>E-mail enviado com sucesso!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span>Falha no envio. Verifique as configurações.</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Serviço</CardTitle>
            <CardDescription>Informações sobre o serviço de e-mail</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provedor:</span>
                <span className="font-medium">Resend</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limite mensal:</span>
                <span className="font-medium">3.000 e-mails</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remetente:</span>
                <span className="font-medium text-xs">onboarding@resend.dev</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tipos de E-mail */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de E-mail Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                ⚠️ Alerta de Contrato
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enviado quando um contrato está próximo do vencimento
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                💰 Lembrete de Pagamento
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enviado quando há pagamentos pendentes
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                ✅ Confirmação de Evento
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enviado quando um evento é confirmado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}