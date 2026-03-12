import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { ok, serverError, unauthorized } from "@/lib/http";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

function extractKey(url: string | null | undefined) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (u.startsWith("private:")) return u.replace(/^private:/, "");
  if (u.startsWith("/uploads/")) return u.split("/uploads/")[1] || null;
  try {
    const parsed = new URL(u);
    const base = parsed.pathname.split("/").filter(Boolean).pop() || null;
    return base;
  } catch {
    const base = u.split("/").filter(Boolean).pop() || null;
    return base;
  }
}

async function safeUnlink(key: string) {
  const base = path.basename(key);
  const filePath = path.join(process.cwd(), "storage", "uploads", base);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpeza LGPD (manual): remove anexos antigos e mantém mínimo dos hóspedes.
 *
 * - Não apaga UNIDADES.
 * - Não apaga reservas/hóspedes, apenas remove anexos e mascara docNumber.
 *
 * ENV:
 * - RETENTION_DAYS (padrão 180)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const retentionDays = Number(process.env.RETENTION_DAYS || 180);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: { checkOut: { lt: cutoff } },
      select: {
        id: true,
        rentalProofFileUrl: true,
        garageContractFileUrl: true,
        guests: {
          select: { id: true, docFileUrl: true, docNumber: true },
        },
      },
      take: 500,
    });

    let deletedFiles = 0;
    let updatedGuests = 0;
    let updatedBookings = 0;

    for (const b of bookings) {
      // deletar anexos (arquivos)
      const keys = [extractKey(b.rentalProofFileUrl), extractKey(b.garageContractFileUrl)].filter(Boolean) as string[];
      for (const g of b.guests) {
        const k = extractKey(g.docFileUrl);
        if (k) keys.push(k);
      }

      for (const k of keys) {
        const okUnlink = await safeUnlink(k);
        if (okUnlink) deletedFiles += 1;
      }

      // zera URLs dos anexos na reserva
      await prisma.booking.update({
        where: { id: b.id },
        data: {
          rentalProofFileUrl: null,
          garageContractFileUrl: null,
        },
      });
      updatedBookings += 1;

      // zera docFileUrl e mascara docNumber (mantém últimos 4)
      for (const g of b.guests) {
        const doc = String(g.docNumber || "");
        const last4 = doc ? doc.slice(-4) : "";
        await prisma.guest.update({
          where: { id: g.id },
          data: {
            docFileUrl: null,
            docNumber: last4 ? `***${last4}` : "",
          },
        });
        updatedGuests += 1;
      }
    }

    return ok({
      cutoff: cutoff.toISOString(),
      retentionDays,
      processedBookings: bookings.length,
      updatedBookings,
      updatedGuests,
      deletedFiles,
    });
  } catch (err: any) {
    console.error("ADM CLEANUP ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
