import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

function safeKey(raw: string) {
  const key = String(raw || "").trim();
  const base = path.basename(key);
  // evita path traversal e chaves vazias
  if (!base || base.includes("..") || base.includes("/") || base.includes("\\")) {
    return null;
  }
  return base;
}

function contentTypeFromName(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(req: NextRequest, ctx: { params: { key: string } }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: 401 });

  const key = safeKey(ctx.params.key);
  if (!key) return NextResponse.json({ ok: false, error: "Arquivo inválido" }, { status: 400 });

  try {
    const filePath = path.join(process.cwd(), "storage", "uploads", key);
    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromName(key),
        // inline para PDF/imagens abrir no browser; o usuário pode baixar se quiser
        "Content-Disposition": `inline; filename="${key}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Arquivo não encontrado" }, { status: 404 });
  }
}
