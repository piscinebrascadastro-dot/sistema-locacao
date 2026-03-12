import { NextRequest } from "next/server";

/**
 * Admin auth (TOKEN-ONLY)
 *
 * Sem cookie/sessão.
 *
 * Aceita token por:
 * - Header: x-admin-code
 * - Header: authorization: Bearer <token>
 * - Cookie HttpOnly: adm_token
 *
 * Env:
 * - ADMIN_ACCESS_CODE (preferencial)
 * - ADMIN_TOKEN (compatibilidade)
 */
export async function requireAdmin(req: NextRequest) {
  const expected = String(process.env.ADMIN_ACCESS_CODE || process.env.ADMIN_TOKEN || "").trim();
  if (!expected) {
    return { ok: false as const, message: "ADMIN_ACCESS_CODE não configurado no .env" };
  }

  const headerToken = String(req.headers.get("x-admin-code") || "").trim();
  const legacyHeader = String(req.headers.get("x-admin-token") || "").trim();
  const auth = String(req.headers.get("authorization") || "").trim();
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  // Cookie HttpOnly (setado pelo /api/adm/login)
  const cookieToken = String(req.cookies.get("adm_token")?.value || "").trim();

  const got = headerToken || bearer || legacyHeader || cookieToken;

  if (got && got === expected) {
    return { ok: true as const, payload: { role: "admin" as const } };
  }

  return { ok: false as const, message: "Acesso negado (admin)" };
}
