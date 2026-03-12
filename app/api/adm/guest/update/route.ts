import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, serverError, unauthorized } from "@/lib/http";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Atualiza validação INDIVIDUAL do hóspede.
 * Aceita guestId OU id (compatibilidade).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const body = await req.json().catch(() => ({} as any));
    const guestId = String(body.guestId || body.id || "").trim();
    if (!guestId) return badRequest("id é obrigatório");

    const validationStatus = String(body.validationStatus || "PENDENTE").trim();
    const validationNote =
      typeof body.validationNote === "string" && body.validationNote.trim()
        ? body.validationNote.trim()
        : null;

    const shouldStamp = validationStatus !== "PENDENTE";

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        validationStatus: validationStatus as any,
        validationNote,
        validatedAt: shouldStamp ? new Date() : null,
        validatedBy: shouldStamp ? "ADM" : null,
      },
      select: {
        id: true,
        bookingId: true,
        name: true,
        validationStatus: true,
        validationNote: true,
        validatedAt: true,
        validatedBy: true,
      },
    });

    return ok({ guest: updated });
  } catch (err: any) {
    console.error("ADM GUEST UPDATE ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
