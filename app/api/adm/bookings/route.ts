import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/http";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const rows = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        createdAt: true,
        checkIn: true,
        checkOut: true,
        platform: true,
        guestsCount: true,
        notes: true,
        rentalProofFileUrl: true,
        garageContractFileUrl: true,
        hasGarage: true,
        garageIsRented: true,
        garageRentedFromUnit: true,
        garageSide: true,
        garageTower: true,
        garageLevel: true,
        garageNumber: true,
        validationStatus: true,
        validationNote: true,
        unit: {
          select: {
            id: true,
            unit: true,
            block: true,
            unitCode: true,
            responsibleType: true,
            name: true,
            rg: true,
            cpf: true,
            email: true,
            phone: true,
          },
        },
        guests: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            docType: true,
            docNumber: true,
            docFileUrl: true,
            validationStatus: true,
            validationNote: true,
            validatedAt: true,
            validatedBy: true,
          },
        },
      },
    });

    const bookings = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      guestsCount: r.guestsCount,
      platform: r.platform,
      notes: r.notes,
      rentalProofFileUrl: r.rentalProofFileUrl,
      garageContractFileUrl: r.garageContractFileUrl,
      hasGarage: r.hasGarage,
      garageIsRented: r.garageIsRented,
      garageRentedFromUnit: r.garageRentedFromUnit,
      garageSide: r.garageSide,
      garageTower: r.garageTower,
      garageLevel: r.garageLevel,
      garageNumber: r.garageNumber,
      status: r.validationStatus,
      validationNote: r.validationNote,
      unit: r.unit,
      guests: r.guests.map((g) => ({
        id: g.id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        docType: g.docType,
        docNumber: g.docNumber,
        docFileUrl: g.docFileUrl,
        validationStatus: g.validationStatus,
        validationNote: g.validationNote,
        validatedAt: g.validatedAt,
        validatedBy: g.validatedBy,
      })),
    }));

    return ok({ bookings });
  } catch (err: any) {
    console.error("ADM BOOKINGS ERROR:", err);
    return serverError(err?.message || "Erro interno");
  }
}
