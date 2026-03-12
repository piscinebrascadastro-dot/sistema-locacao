import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Arquivo 'file' é obrigatório" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name || "").toLowerCase() || ".bin";
    const safeName = crypto.randomBytes(16).toString("hex") + ext;

    // ✅ Segurança: NÃO salvar em /public. Armazenamento privado.
    const uploadDir = path.join(process.cwd(), "storage", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, bytes);

    // Mantemos 'url' por compatibilidade com o frontend, mas não é público.
    // O ADM acessa via /api/adm/files/<key>
    const url = `private:${safeName}`;
    return NextResponse.json({ ok: true, url, key: safeName });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro no upload" }, { status: 500 });
  }
}
