import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { unauthorized, serverError } from "@/lib/http";
import * as XLSX from "xlsx";

function toBRDate(value: Date | null) {
  if (!value) return "";
  try {
    return value.toLocaleDateString("pt-BR");
  } catch {
    return String(value);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const rows = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        unit: true,
        guests: { orderBy: { createdAt: "asc" } },
      },
    });

    const data = rows.map((b) => {
      const guestsSummary = (b.guests || [])
        .map((g) => `${g.name} (${g.docType || ""} ${g.docNumber || ""}) - ${g.validationStatus}`)
        .join(" | ");

      return {
        createdAt: b.createdAt.toISOString(),
        unidade: `${b.unit?.unitCode || ""}`,
        bloco: `${b.unit?.block || ""}`,
        checkIn: toBRDate(b.checkIn),
        checkOut: toBRDate(b.checkOut),
        plataforma: b.platform || "",
        garagem: b.hasGarage
          ? `${b.garageTower || ""}-${b.garageLevel || ""}-${b.garageNumber || ""}`.replace(/^-+|-+$/g, "")
          : "",
        vagaLocada: b.hasGarage ? (b.garageIsRented ? "SIM" : "NÃO") : "",
        locadaDeUnidade: b.garageIsRented ? (b.garageRentedFromUnit || "") : "",
        qtdHospedes: b.guestsCount,
        statusReserva: b.validationStatus,
        obsReserva: b.validationNote || "",
        hospedes: guestsSummary,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Reservas");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reservas.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("EXPORT EXCEL ERROR:", err);
    return serverError(err?.message || "Erro ao exportar Excel");
  }
}
