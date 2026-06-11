import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../auth";
import { VerificationCodeService } from "@/lib/services/verification-code.service";
import { WhatsAppService } from "@/app/api/webhooks/whatsapp/services/whatsapp.service";

type LocaleKey = "pt-BR" | "en-US";

const MESSAGES = {
  "pt-BR": {
    verificationCode: {
      title:
        "?? *tax-hub - C�digo de Verifica��o*\n\nSeu c�digo de verifica��o �:\n\n*{code}*\n\n? Este c�digo expira em 10 minutos.\n\n?? N�o compartilhe este c�digo com ningu�m.",
      welcome:
        '?? *Bem-vindo ao tax-hub!*\n\nSeu telefone foi vinculado com sucesso!\n\nAgora voc� pode:\n? Registrar gastos e receitas por aqui\n? Enviar �udios com seus lan�amentos\n\nExperimente enviar: "Gastei 20 reais no almo�o hoje."',
    },
    errors: {
      unauthorized: "N�o autorizado",
      phoneRequired: "Telefone � obrigat�rio",
      alreadyLinked: "Voc� j� possui um telefone vinculado",
      phoneInUse: "Este telefone j� est� vinculado a outra conta",
      activeCodeExists:
        "J� existe um c�digo ativo. Aguarde {minutes} minuto(s) ou use o c�digo enviado.",
      whatsappError:
        "Erro ao enviar c�digo via WhatsApp. Verifique se o n�mero est� correto.",
      whatsappPhoneMismatch:
        "O WhatsApp retornou um n�mero diferente do informado. Confirme o n�mero com DDD e tente novamente.",
      verificationRequired: "Telefone e c�digo s�o obrigat�rios",
      internalError: "Erro interno do servidor",
      invalidAction: "A��o inv�lida. Use 'request_code' ou 'verify_code'",
    },
    success: {
      codeSent: "C�digo de verifica��o enviado via WhatsApp!",
      phoneLinked: "Telefone vinculado com sucesso!",
      phoneUnlinked: "Telefone desvinculado com sucesso!",
    },
  },
  "en-US": {
    verificationCode: {
      title:
        "?? *tax-hub - Verification Code*\n\nYour verification code is:\n\n*{code}*\n\n? This code expires in 10 minutes.\n\n?? Do not share this code with anyone.",
      welcome:
        '?? *Welcome to tax-hub!*\n\nYour phone has been successfully linked!\n\nNow you can:\n? Record expenses and incomes here\n? Send audios with your transactions\n\nTry sending: "Spent 12 dollars on lunch today"',
    },
    errors: {
      unauthorized: "Unauthorized",
      phoneRequired: "Phone number is required",
      alreadyLinked: "You already have a phone number linked",
      phoneInUse: "This phone number is already linked to another account",
      activeCodeExists:
        "There is already an active code. Wait {minutes} minute(s) or use the sent code.",
      whatsappError:
        "Error sending code via WhatsApp. Please check if the number is correct.",
      whatsappPhoneMismatch:
        "WhatsApp returned a different number than the one provided. Please confirm the phone number and try again.",
      verificationRequired: "Phone number and code are required",
      internalError: "Internal server error",
      invalidAction: "Invalid action. Use 'request_code' or 'verify_code'",
    },
    success: {
      codeSent: "Verification code sent via WhatsApp!",
      phoneLinked: "Phone number linked successfully!",
      phoneUnlinked: "Phone number unlinked successfully!",
    },
  },
} as const;

function getMessages(language: string = "pt-BR") {
  const locale = (language === "en-US" ? "en-US" : "pt-BR") as LocaleKey;
  return MESSAGES[locale];
}

function normalizePhoneForStorage(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");

  // Remove DDI 55 only when the number is in international format
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    return digits.substring(2);
  }

  return digits;
}

function waIdToLocalNumber(waId: string): string {
  return waId.replace(/\D/g, "").replace(/^55/, "");
}

// GET - Check if user already has a linked phone
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "N�o autorizado" }, { status: 401 });
    }

    const configuracoes = await db.configuracoesUsuario.findUnique({
      where: { userId: session.user.id },
    });

    const userLanguage = configuracoes?.idioma || "pt-BR";
    const messages = getMessages(userLanguage);

    const usuario = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        telefone: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      temTelefoneVinculado: !!usuario?.telefone,
      telefone: usuario?.telefone,
      usuario: {
        name: usuario?.name,
        email: usuario?.email,
      },
      idioma: userLanguage,
    });
  } catch (error) {
    console.error("Erro ao verificar telefone:", error);
    const messages = getMessages();
    return NextResponse.json(
      { error: messages.errors.internalError },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      const messages = getMessages();
      return NextResponse.json(
        { error: messages.errors.unauthorized },
        { status: 401 },
      );
    }

    const configuracoes = await db.configuracoesUsuario.findUnique({
      where: { userId: session.user.id },
    });

    const userLanguage = configuracoes?.idioma || "pt-BR";
    const messages = getMessages(userLanguage);

    const body = await request.json();
    const { action, telefone, code } = body;

    const telefoneNormalizado = normalizePhoneForStorage(telefone || "");

    console.log(`?? Telefone recebido: ${telefone}`);
    console.log(`?? Telefone normalizado: ${telefoneNormalizado}`);

    if (action === "request_code") {
      if (!telefoneNormalizado) {
        return NextResponse.json(
          { error: messages.errors.phoneRequired },
          { status: 400 },
        );
      }

      const usuarioAtual = await db.user.findUnique({
        where: { email: session.user.email },
        select: { telefone: true },
      });

      if (usuarioAtual?.telefone) {
        return NextResponse.json(
          {
            success: false,
            error: messages.errors.alreadyLinked,
            telefoneAtual: usuarioAtual.telefone,
          },
          { status: 400 },
        );
      }

      const telefoneParaSalvar = telefoneNormalizado;

      const telefoneExistente = await db.user.findFirst({
        where: {
          OR: [
            { telefone: telefoneParaSalvar },
            { telefone: `+${telefoneParaSalvar}` },
            { telefone: telefoneNormalizado },
            { telefone: `+${telefoneNormalizado}` },
          ],
          NOT: { email: session.user.email },
        },
      });

      if (telefoneExistente) {
        return NextResponse.json(
          { error: messages.errors.phoneInUse },
          { status: 400 },
        );
      }

      const hasActiveCode =
        await VerificationCodeService.hasActiveCode(telefoneParaSalvar);
      if (hasActiveCode) {
        const timeLeft =
          await VerificationCodeService.getTimeLeft(telefoneParaSalvar);
        const minutes = Math.ceil((timeLeft || 0) / 60);
        return NextResponse.json(
          {
            success: false,
            error: messages.errors.activeCodeExists.replace(
              "{minutes}",
              minutes.toString(),
            ),
          },
          { status: 429 },
        );
      }

      const verificationCode =
        await VerificationCodeService.createVerificationCode(
          telefoneParaSalvar,
          session.user.email,
        );

      try {
        const mensagem = messages.verificationCode.title.replace(
          "{code}",
          verificationCode,
        );

        const whatsappResponse = await WhatsAppService.sendMessage(
          telefoneParaSalvar,
          mensagem,
        );

        const waId = whatsappResponse?.contacts?.[0]?.wa_id as
          | string
          | undefined;
        if (waId) {
          const waLocal = waIdToLocalNumber(waId);
          if (waLocal !== telefoneParaSalvar) {
            await VerificationCodeService.deleteCode(telefoneParaSalvar);
            return NextResponse.json(
              { error: messages.errors.whatsappPhoneMismatch },
              { status: 400 },
            );
          }
        }

        console.log(`? C�digo enviado para ${telefoneParaSalvar}`);

        return NextResponse.json({
          success: true,
          message: messages.success.codeSent,
          expiresIn: 600,
        });
      } catch (error) {
        console.error("? Erro ao enviar c�digo via WhatsApp:", error);
        await VerificationCodeService.deleteCode(telefoneParaSalvar);

        return NextResponse.json(
          { error: messages.errors.whatsappError },
          { status: 500 },
        );
      }
    }

    if (action === "verify_code") {
      if (!telefoneNormalizado || !code) {
        return NextResponse.json(
          { error: messages.errors.verificationRequired },
          { status: 400 },
        );
      }

      const telefoneParaSalvar = telefoneNormalizado;

      const verification = await VerificationCodeService.verifyCode(
        telefoneParaSalvar,
        code,
      );

      if (!verification.valid) {
        return NextResponse.json(
          {
            success: false,
            error: verification.message,
            attemptsLeft: verification.attemptsLeft,
          },
          { status: 400 },
        );
      }

      try {
        const usuarioAtualizado = await db.user.update({
          where: { email: session.user.email },
          data: { telefone: telefoneParaSalvar },
        });

        console.log(`? Telefone ${telefoneParaSalvar} vinculado com sucesso!`);

        try {
          const mensagemBoasVindas = messages.verificationCode.welcome;
          await WhatsAppService.sendMessage(
            telefoneParaSalvar,
            mensagemBoasVindas,
          );
        } catch (error) {
          console.error("Erro ao enviar mensagem de boas-vindas:", error);
        }

        return NextResponse.json({
          success: true,
          message: messages.success.phoneLinked,
          usuario: {
            name: usuarioAtualizado.name,
            telefone: usuarioAtualizado.telefone,
          },
        });
      } catch (error: any) {
        console.error("Erro ao vincular telefone:", error);

        if (error.code === "P2002") {
          return NextResponse.json(
            { error: messages.errors.phoneInUse },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { error: messages.errors.internalError },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: messages.errors.invalidAction },
      { status: 400 },
    );
  } catch (error) {
    console.error("Erro ao processar requisi��o:", error);
    const messages = getMessages();
    return NextResponse.json(
      { error: messages.errors.internalError },
      { status: 500 },
    );
  }
}

// DELETE - Unlink phone
export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      const messages = getMessages();
      return NextResponse.json(
        { error: messages.errors.unauthorized },
        { status: 401 },
      );
    }

    const configuracoes = await db.configuracoesUsuario.findUnique({
      where: { userId: session.user.id },
    });

    const userLanguage = configuracoes?.idioma || "pt-BR";
    const messages = getMessages(userLanguage);

    await db.user.update({
      where: { email: session.user.email },
      data: { telefone: null },
    });

    return NextResponse.json({
      success: true,
      message: messages.success.phoneUnlinked,
    });
  } catch (error) {
    console.error("Erro ao desvincular telefone:", error);
    const messages = getMessages();
    return NextResponse.json(
      { error: messages.errors.internalError },
      { status: 500 },
    );
  }
}
