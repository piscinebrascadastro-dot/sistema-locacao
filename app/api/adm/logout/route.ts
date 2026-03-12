import { NextResponse } from "next/server";

/**
 * Logout ADM
 * - limpa cookie HttpOnly (adm_token)
 * - o frontend também pode limpar localStorage por conveniência
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "adm_token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
