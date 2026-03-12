import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const unitCode = (body.unitCode || "").trim().toUpperCase();
    if (!unitCode) return NextResponse.json({ ok: false, error: "unitCode é obrigatório" }, { status: 400 });

    const unit = await prisma.unitProfile.findUnique({ where: { unitCode }, select: { id: true } });
    if (!unit) return NextResponse.json({ ok: false, error: "Unidade não encontrada" }, { status: 404 });

    const checkIn = body.checkIn ? new Date(body.checkIn) : null;
    const checkOut = body.checkOut ? new Date(body.checkOut) : null;

    if (!checkIn || !checkOut) return NextResponse.json({ ok: false, error: "Check-in e check-out são obrigatórios" }, { status: 400 });

    const rentalProofFileUrl = (body.rentalProofFileUrl || "").trim();
    if (!rentalProofFileUrl) return NextResponse.json({ ok: false, error: "Anexo obrigatório: contrato/print do app" }, { status: 400 });

    const hasGarage = !!body.hasGarage;
    const garageIsRented = !!body.garageIsRented;

    if (hasGarage) {
      if (!body.garageNumber) return NextResponse.json({ ok: false, error: "Número da vaga é obrigatório" }, { status: 400 });
      if (garageIsRented) {
        if (!body.garageRentedFromUnit) return NextResponse.json({ ok: false, error: "Informe de qual unidade a vaga é locada" }, { status: 400 });
        if (!body.garageContractFileUrl) return NextResponse.json({ ok: false, error: "Contrato da vaga é obrigatório" }, { status: 400 });
      }
    }

    const guests = Array.isArray(body.guests) ? body.guests : [];
    if (guests.length === 0) return NextResponse.json({ ok: false, error: "Adicione pelo menos 1 hóspede" }, { status: 400 });

    for (const g of guests) {
      if (!g.name || !g.email || !g.phone || !g.docType || !g.docNumber) {
        return NextResponse.json({ ok: false, error: "Todos os hóspedes precisam de nome, email, telefone, tipo e número do documento" }, { status: 400 });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        unitId: unit.id,
        checkIn,
        checkOut,
        platform: String(body.platform || "").trim(),
        guestsCount: guests.length,
        notes: String(body.notes || "").trim(),
        rentalProofFileUrl,

        hasGarage,
        garageIsRented,
        garageRentedFromUnit: garageIsRented ? String(body.garageRentedFromUnit) : null,
        garageContractFileUrl: garageIsRented ? String(body.garageContractFileUrl) : null,

        garageSide: hasGarage ? body.garageSide : null,
        garageTower: hasGarage ? body.garageTower : null,
        garageLevel: hasGarage ? body.garageLevel : null,
        garageNumber: hasGarage ? String(body.garageNumber) : null,

        guests: {
          create: guests.map((g: any) => ({
            name: String(g.name),
            email: String(g.email),
            phone: String(g.phone),
            docType: g.docType,
            docNumber: String(g.docNumber),
            docFileUrl: g.docFileUrl ? String(g.docFileUrl) : null,
          })),
        },
      },
      include: { guests: true },
    });

    return NextResponse.json({ ok: true, booking }, { status: 201 });
  } catch (err: any) {
    console.error("BOOKING CREATE ERROR:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Erro interno" }, { status: 500 });
  }
}
