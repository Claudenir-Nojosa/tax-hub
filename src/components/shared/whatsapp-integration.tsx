// components/whatsapp-integration.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QrCode, Link, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { FaWhatsapp } from "react-icons/fa";

export function WhatsAppIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testMessage, setTestMessage] = useState("Gastei 50 reais no almoço");
  const [testNumber, setTestNumber] = useState("85991486998");
  const [isSending, setIsSending] = useState(false);

  const connectWhatsApp = async () => {
    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
      });

      const data = await response.json();
      if (data.qrCode) {
        setQrCode(data.qrCode);
        toast.success("Escaneie o QR code para conectar");
      }
    } catch (error) {
      toast.error("Erro ao conectar com WhatsApp");
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
      });
      setIsConnected(false);
      setQrCode("");
      toast.success("Desconectado do WhatsApp");
    } catch (error) {
      toast.error("Erro ao desconectar");
    }
  };

  const testMessageAPI = async () => {
    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Gastei 50 reais no almoço hoje",
          from: "Claudenir",
        }),
      });

      const data = await response.json();
      toast.success("Mensagem testada: " + data.resposta);
    } catch (error) {
      toast.error("Erro ao testar mensagem");
    }
  };

  const sendTestMessage = async () => {
    if (!testMessage || !testNumber) {
      toast.error("Preencha a mensagem e o número");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/test-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: testMessage,
          to: testNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("✅ Mensagem enviada para: " + data.to);
      } else {
        toast.error("❌ Erro: " + data.error);
      }
    } catch (error) {
      toast.error("❌ Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FaWhatsapp className="h-5 w-5 text-green-600" />
          Integração com WhatsApp
        </CardTitle>
        <CardDescription>
          Conecte sua conta do WhatsApp para adicionar gastos por mensagem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="whatsapp-connection">Conexão WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              {isConnected ? "Conectado" : "Desconectado"}
            </p>
          </div>
          <Switch
            id="whatsapp-connection"
            checked={isConnected}
            onCheckedChange={(checked) => {
              if (checked) connectWhatsApp();
              else disconnectWhatsApp();
            }}
          />
        </div>

        {qrCode && (
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="h-4 w-4" />
              <span className="text-sm font-medium">Escaneie o QR Code</span>
            </div>
            <img
              src={qrCode}
              alt="QR Code para WhatsApp"
              className="w-48 h-48 mx-auto"
            />
            <p className="text-xs text-center text-muted-foreground mt-2">
              Abra o WhatsApp → Configurações → Dispositivos conectados →
              Conectar um dispositivo
            </p>
          </div>
        )}

        {/* Seção de Teste */}
        <div className="p-4 ">
          <h4 className="font-medium text-sm mb-3 text-blue-800 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Testar Envio de Mensagem
          </h4>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="test-number">Seu Número WhatsApp</Label>
              <Input
                id="test-number"
                value={testNumber}
                onChange={(e) =>
                  setTestNumber(e.target.value.replace(/\D/g, ""))
                }
                placeholder="85991486998"
              />
              <p className="text-xs text-blue-600">
                Apenas números, sem espaços ou caracteres especiais
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-message">Mensagem de Teste</Label>
              <Input
                id="test-message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Gastei 50 reais no almoço"
              />
            </div>

            <Button
              onClick={sendTestMessage}
              disabled={isSending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? "Enviando..." : "Enviar Mensagem de Teste"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook">Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="URL para receber mensagens"
            />
            <Button variant="outline" size="icon">
              <Link className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure esta URL no Twilio ou serviço de WhatsApp Business
          </p>
        </div>

        <Button onClick={testMessageAPI} className="w-full" variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Testar Processamento de Mensagem
        </Button>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Como usar:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• "Gastei 50 reais no almoço"</li>
            <li>• "Jantar 120 compartilhado"</li>
            <li>• "Salário 4200 receita"</li>
            <li>• "Combustível 180 transporte"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
