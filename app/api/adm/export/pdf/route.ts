import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { unauthorized, serverError } from "@/lib/http";
import PDFDocument from "pdfkit";

function br(d: Date | null) {
  if (!d) return "";
  try {
    return d.toLocaleDateString("pt-BR");
  } catch {
    return String(d);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return unauthorized(auth.message);

    const rows = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { unit: true, guests: { orderBy: { createdAt: "asc" } } },
    });

    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));

    doc.fontSize(16).text("Relatório de Reservas - Sistema de Locação", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("gray").text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
    doc.moveDown(1);

    doc.fillColor("black").fontSize(11);

    for (const b of rows) {
      const header = `${b.unit?.unitCode || ""} (${b.unit?.block || ""}) - ${br(b.checkIn)} → ${br(b.checkOut)} - ${b.platform || ""}`;
      doc.font("Helvetica-Bold").text(header);
      doc.font("Helvetica").text(`Status: ${b.validationStatus}  |  Obs: ${b.validationNote || ""}`);
      if (b.hasGarage) {
        const loc = `${b.garageTower || ""}-${b.garageLevel || ""}-${b.garageNumber || ""}`.replace(/^-+|-+$/g, "");
        const rented = b.garageIsRented ? ` (LOCADA de ${b.garageRentedFromUnit || ""})` : "";
        doc.text(`Garagem: ${loc || "vaga"}${rented}`);
      }
      doc.moveDown(0.3);

      if ((b.guests || []).length) {
        doc.font("Helvetica").text("Hóspedes:");
        for (const g of b.guests) {
          doc.text(`- ${g.name} | ${g.docType || ""} ${g.docNumber || ""} | ${g.validationStatus}`);
        }
      } else {
        doc.text("Hóspedes: (nenhum)");
      }

      doc.moveDown(0.8);
      doc.moveTo(doc.x, doc.y).lineTo(560, doc.y).strokeColor("#dddddd").stroke();
      doc.moveDown(0.8);
    }

    doc.end();

    await new Promise<void>((resolve) => doc.on("end", () => resolve()));

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reservas.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("EXPORT PDF ERROR:", err);
    return serverError(err?.message || "Erro ao exportar PDF");
  }
}
