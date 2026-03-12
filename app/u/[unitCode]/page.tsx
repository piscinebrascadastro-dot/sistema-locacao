import { prisma } from "@/lib/prisma";
import { BrandHeader } from "@/app/components/BrandHeader";

export default async function UnitPanel({ params }: { params: { unitCode: string } }) {
  const unitCode = (params.unitCode || "").toUpperCase();

  const unit = await prisma.unitProfile.findUnique({
    where: { unitCode },
    include: {
      bookings: { orderBy: { createdAt: "desc" }, include: { guests: true } },
    },
  });

  if (!unit) {
    return (
      <main className="page">
        <BrandHeader title="Painel da Unidade" />
        <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
          <h1>Unidade não encontrada</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <BrandHeader title="Painel da Unidade" />
      <div className="card" style={{ maxWidth: 980, margin: "0 auto" }}>
        <p><b>Bloco:</b> {unit.block}</p>
        <p><b>Unidade:</b> {unit.unit}</p>
        <p><b>Responsável:</b> {unit.responsibleType}</p>
        <p><b>Nome:</b> {unit.name}</p>
        <p><b>Email:</b> {unit.email}</p>
        <p><b>Telefone:</b> {unit.phone}</p>
        <p><b>Código da unidade:</b> {unit.unitCode}</p>
      </div>

      <a
        href={`/booking/new?unitCode=${unit.unitCode}`}
        className="button"
        style={{ display: "inline-block", marginTop: 16, textDecoration: "none" }}
      >
        Cadastrar hóspedes / Reserva
      </a>

      <h2 style={{ marginTop: 28 }}>Reservas registradas</h2>

      {unit.bookings.length === 0 ? (
        <p>Nenhuma reserva cadastrada ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {unit.bookings.map((b) => (
            <div key={b.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div><b>Enviado em:</b> {b.createdAt.toISOString().replace("T"," ").slice(0,19)}</div>
              <div><b>Check-in:</b> {b.checkIn.toISOString().slice(0,10)} &nbsp; <b>Check-out:</b> {b.checkOut.toISOString().slice(0,10)}</div>
              <div><b>Validação (ADM):</b> {b.validationStatus}</div>
              <div><b>Vaga:</b> {b.hasGarage ? (b.garageIsRented ? "Locada" : "Própria") : "Não"}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
                <b>Hóspedes:</b> {b.guests.length}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
