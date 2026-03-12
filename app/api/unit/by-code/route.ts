import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, serverError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitCode = (searchParams.get("unitCode") || "").trim().toUpperCase();

    if (!unitCode) return badRequest("unitCode é obrigatório");

    const unit = await prisma.unitProfile.findUnique({
      where: { unitCode },
      select: {
        id: true,
        unit: true,
        block: true,
        responsibleType: true,
        name: true,
        email: true,
        phone: true,
        unitCode: true,
      },
    });

    if (!unit) return badRequest("Unidade não encontrada");

    return ok({ unit });
  } catch (err: any) {
    console.error("UNIT BY CODE ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
