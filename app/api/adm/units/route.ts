import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest } from "@/lib/http";
import { requireAdmin } from "@/lib/adminAuth";

// Lista unidades cadastradas (para conferência/edição pela ADM)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const rows = await prisma.unitProfile.findMany({
      orderBy: [{ block: "asc" }, { unit: "asc" }],
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        unitCode: true,
        unit: true,
        block: true,
        responsibleType: true,
        name: true,
        rg: true,
        cpf: true,
        email: true,
        phone: true,
        _count: { select: { bookings: true } },
      },
      take: 500,
    });

    const units = rows.map((r) => ({
      id: r.id,
      unit: r.unit,
      block: r.block,
      unitCode: r.unitCode,
      responsibleType: r.responsibleType,
      name: r.name,
      rg: r.rg,
      cpf: r.cpf,
      email: r.email,
      phone: r.phone,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      bookingsCount: r._count.bookings,
    }));

    return ok({ units });
  } catch (err: any) {
    console.error("ADM UNITS ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}

// Edição de dados do anfitrião/unidade pela ADM
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const body = await req.json().catch(() => null);
    if (!body || !body.unitId) return badRequest("unitId é obrigatório");

    const {
      unitId,
      unit,
      block,
      responsibleType,
      name,
      rg,
      cpf,
      email,
      phone,
    } = body;

    const updated = await prisma.unitProfile.update({
      where: { id: String(unitId) },
      data: {
        ...(unit !== undefined ? { unit: String(unit).trim() } : {}),
        ...(block !== undefined ? { block: String(block).trim().toUpperCase() } : {}),
        ...(responsibleType !== undefined
          ? { responsibleType: String(responsibleType).toUpperCase() }
          : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(rg !== undefined ? { rg: String(rg).trim() } : {}),
        ...(cpf !== undefined ? { cpf: String(cpf).trim() } : {}),
        ...(email !== undefined ? { email: String(email).trim().toLowerCase() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      },
      select: {
        id: true,
        updatedAt: true,
        unit: true,
        block: true,
        responsibleType: true,
        name: true,
        rg: true,
        cpf: true,
        email: true,
        phone: true,
      },
    });

    return ok({ ok: true, unit: updated });
  } catch (err: any) {
    console.error("ADM UNITS PATCH ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
