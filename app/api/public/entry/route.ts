import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/http";
import { sendMail } from "@/lib/mailer";

function normalizeUnit(s: string) {
  return (s || "").trim();
}

function normalizeBlock(s: string) {
  return (s || "").trim().toUpperCase();
}

function genUnitCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars
}

function genAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function hash(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const unit = normalizeUnit(body.unit);
    const block = normalizeBlock(body.block);

    if (!unit || !block) return badRequest("Informe unidade e bloco.");

    const existing = await prisma.unitProfile.findUnique({
      where: { unit_block: { unit, block: block as any } },
      select: { unitCode: true, accessCodeHash: true },
    });

    const accessCode = (body.accessCode || "").trim();

    if (existing && !accessCode) {
      return badRequest("Essa unidade já está cadastrada. Informe o código de acesso.", {
        code: "NEED_ACCESS_CODE",
      });
    }

    if (existing && accessCode) {
      if (hash(accessCode) !== existing.accessCodeHash) {
        return badRequest("Código de acesso inválido.");
      }
      return ok({ redirectUrl: `/u/${existing.unitCode}` });
    }

    const responsibleType = (body.responsibleType || "").trim();
    const name = (body.name || "").trim();
    const rg = (body.rg || "").trim();
    const cpf = (body.cpf || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const authorizationFileUrl = (body.authorizationFileUrl || "").trim() || null;

    if (!responsibleType) return badRequest("Informe se é PROPRIETÁRIO ou ADMIN/PROCURADOR.");
    if (!name || !rg || !cpf || !email || !phone) {
      return badRequest("Preencha nome, RG, CPF, e-mail e telefone.");
    }

    if (responsibleType === "ADMIN_OR_PROXY" && !authorizationFileUrl) {
      return badRequest("Para ADMIN/PROCURADOR, é obrigatório anexar a procuração/contrato.");
    }

    let unitCode = genUnitCode();
    for (let i = 0; i < 10; i++) {
      const found = await prisma.unitProfile.findUnique({ where: { unitCode } });
      if (!found) break;
      unitCode = genUnitCode();
    }

    const rawAccess = genAccessCode();

    const created = await prisma.unitProfile.create({
      data: {
        unit,
        block: block as any,
        responsibleType,
        name,
        rg,
        cpf,
        email,
        phone,
        authorizationFileUrl,
        unitCode,
        accessCodeHash: hash(rawAccess),
      },
      select: { unitCode: true },
    });

    const devAccess = process.env.NODE_ENV !== "production" ? rawAccess : undefined;

    // Envio de e-mail com código de acesso e link da unidade.
    // Se o SMTP não estiver configurado, o sistema continua funcionando (dev).
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const unitLink = `${baseUrl}/u/${created.unitCode}`;
    try {
      await sendMail({
        to: email,
        subject: "Acesso - Sistema de Locação (Piscine Station Resort Brás)",
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5">
            <h2 style="margin:0 0 12px">Cadastro de Unidade confirmado ✅</h2>
            <p style="margin:0 0 12px">Sua unidade foi cadastrada com sucesso no Sistema de Locação.</p>
            <p style="margin:0 0 12px"><b>Código de acesso:</b> ${rawAccess}</p>
            <p style="margin:0 0 12px"><b>Link para cadastrar hóspedes:</b> <a href="${unitLink}">${unitLink}</a></p>
            <p style="margin:18px 0 0;color:#475467;font-size:12px">Se você não solicitou este cadastro, ignore este e-mail.</p>
          </div>
        `,
      });
    } catch (e) {
      console.warn("Email send failed (non-fatal):", e);
    }

    return ok({ redirectUrl: `/u/${created.unitCode}`, accessCode: devAccess }, 201);
  } catch (err: any) {
    console.error("PUBLIC ENTRY ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
