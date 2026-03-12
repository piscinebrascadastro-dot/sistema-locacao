import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, serverError, unauthorized } from "@/lib/http";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Atualiza validação da RESERVA (Booking)
 * Aceita bookingId OU id (compatibilidade).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const body = await req.json().catch(() => ({} as any));
    const bookingId = String(body.bookingId || body.id || "").trim();
    if (!bookingId) return badRequest("id é obrigatório");

    const validationStatus = String(body.validationStatus || "PENDENTE").trim();
    const validationNote =
      typeof body.validationNote === "string" && body.validationNote.trim()
        ? body.validationNote.trim()
        : null;

    const shouldStamp = validationStatus !== "PENDENTE";

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        validationStatus: validationStatus as any,
        validationNote,
        validatedAt: shouldStamp ? new Date() : null,
        validatedBy: shouldStamp ? "ADM" : null,
      },
      select: {
        id: true,
        validationStatus: true,
        validationNote: true,
        validatedAt: true,
        validatedBy: true,
        updatedAt: true,
      },
    });

    return ok({ booking: updated });
  } catch (err: any) {
    console.error("ADM BOOKING UPDATE ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
