// app/api/suporte/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "../../../../auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { tipo, assunto, mensagem, email, usuarioNome, usuarioId } = body;

    if (!tipo || !assunto || !mensagem || !email) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 },
      );
    }

    // Configurar transporter do Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const tipoLabels: Record<string, string> = {
      bug: "🐛 Bug",
      melhoria: "💡 Melhoria",
      duvida: "❓ Dúvida",
    };

    const htmlEmail = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 10px 0 0 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .field {
              margin-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 15px;
            }
            .field:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              display: block;
              margin-bottom: 8px;
            }
            .value {
              color: #1f2937;
              font-size: 15px;
            }
            .tipo-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
            }
            .bug { background: #fee2e2; color: #991b1b; }
            .melhoria { background: #fef3c7; color: #92400e; }
            .duvida { background: #dbeafe; color: #1e40af; }
            .mensagem-box {
              background: #f9fafb;
              padding: 16px;
              border-radius: 8px;
              border-left: 4px solid #667eea;
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.6;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .reply-button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📨 Novo Ticket de Suporte</h1>
              <p>tax-hub Support System</p>
            </div>
            
            <div class="content">
              <div class="field">
                <span class="label">Tipo de Solicitação</span>
                <div class="value">
                  <span class="tipo-badge ${tipo}">${tipoLabels[tipo] || tipo}</span>
                </div>
              </div>
              
              <div class="field">
                <span class="label">Usuário</span>
                <div class="value">${usuarioNome || "Não informado"}</div>
              </div>

              <div class="field">
                <span class="label">Email do Usuário</span>
                <div class="value">
                  <a href="mailto:${email}" style="color: #667eea; text-decoration: none;">
                    ${email}
                  </a>
                </div>
              </div>

              <div class="field">
                <span class="label">ID do Usuário</span>
                <div class="value">
                  <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px;">
                    ${usuarioId || "N/A"}
                  </code>
                </div>
              </div>

              <div class="field">
                <span class="label">Assunto</span>
                <div class="value" style="font-weight: 600; font-size: 16px;">
                  ${assunto}
                </div>
              </div>

              <div class="field">
                <span class="label">Mensagem</span>
                <div class="mensagem-box">${mensagem}</div>
              </div>

              <div style="text-align: center;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(assunto)}" class="reply-button">
                  ↩️ Responder para ${email.split("@")[0]}
                </a>
              </div>
            </div>

            <div class="footer">
              <p>📅 Recebido em: <strong>${new Date().toLocaleString("pt-BR", {
                dateStyle: "long",
                timeStyle: "short",
              })}</strong></p>
              <p style="margin-top: 10px; color: #9ca3af;">
                Este email foi gerado automaticamente pelo sistema tax-hub
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar email
    await transporter.sendMail({
      from: `"tax-hub Suporte" <${process.env.GMAIL_USER}>`,
      to: process.env.EMAIL_TO || "tax-hub@support.com", // Email onde você quer receber
      replyTo: email, // Email do usuário (para você responder diretamente)
      subject: `[tax-hub ${tipoLabels[tipo]}] ${assunto}`,
      html: htmlEmail,
    });

    return NextResponse.json(
      { success: true, message: "Ticket enviado com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao processar ticket de suporte:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 },
    );
  }
}
