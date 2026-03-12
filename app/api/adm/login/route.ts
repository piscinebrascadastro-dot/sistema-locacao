import { NextRequest, NextResponse } from "next/server";

/**
 * Login do ADM por CÓDIGO DE ACESSO (sem email/senha).
 *
 * Body esperado:
 *   { "code": "..." }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String((body as any).code || "").trim();

  const expectedCode = String(process.env.ADMIN_ACCESS_CODE || "").trim();
  if (!expectedCode) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_ACCESS_CODE não configurado no .env" },
      { status: 500 }
    );
  }

  if (!code || code !== expectedCode) {
    return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 401 });
  }

  // ✅ Segurança: também grava cookie HttpOnly para permitir download/exports/arquivos sem token em URL.
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "adm_token",
    value: code,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });
  return res;
}
