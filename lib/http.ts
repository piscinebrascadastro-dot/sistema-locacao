import { NextResponse } from "next/server";

export function ok(data: any, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function badRequest(message: string, extra: any = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 400 });
}

export function unauthorized(message = "Não autorizado") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function serverError(message = "Erro interno") {
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
