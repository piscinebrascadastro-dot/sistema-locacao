import { NextRequest } from "next/server";
import { ok, badRequest, serverError } from "@/lib/http";
import { sendMail } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = (searchParams.get("to") || "").trim();
    if (!to) return badRequest("Passe o parâmetro ?to=seuemail@dominio.com");

    await sendMail({
      to,
      subject: "Teste de e-mail - Sistema de Locação",
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">Teste OK ✅</div>`,
    });

    return ok({ ok: true, message: "E-mail de teste enviado com sucesso!", to });
  } catch (err: any) {
    console.error("TEST EMAIL ERROR:", err);
    return serverError(err?.message || "Erro ao enviar e-mail");
  }
}
