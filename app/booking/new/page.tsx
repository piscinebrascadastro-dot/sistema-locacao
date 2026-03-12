"use client";

import { useEffect, useState } from "react";

type GuestDocType = "CPF" | "RG" | "PASSPORT";
type Block = "PACIFICO" | "MAR_VERMELHO" | "ATLANTICO";
type GarageSide = "ATLANTICO" | "PACIFICO_MAR_VERMELHO";
type GarageLevel = "S1" | "S2" | "S3";

type Unit = { id: string; unit: string; block: Block; name: string; email: string; phone: string; unitCode: string };

type Guest = {
  name: string;
  email: string;
  phone: string;
  docType: GuestDocType;
  docNumber: string;
  docFileUrl?: string;
};

export default function BookingNewPage() {
  const [unitCode, setUnitCode] = useState("");
  const [unit, setUnit] = useState<Unit | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");

  const [rentalProofFileUrl, setRentalProofFileUrl] = useState("");

  const [hasGarage, setHasGarage] = useState(false);
  const [garageIsRented, setGarageIsRented] = useState(false);

  const [garageRentedFromUnit, setGarageRentedFromUnit] = useState("");
  const [garageContractFileUrl, setGarageContractFileUrl] = useState("");

  const [garageSide, setGarageSide] = useState<GarageSide>("ATLANTICO");
  const [garageTower, setGarageTower] = useState<Block>("ATLANTICO");
  const [garageLevel, setGarageLevel] = useState<GarageLevel>("S1");
  const [garageNumber, setGarageNumber] = useState("");

  const [guests, setGuests] = useState<Guest[]>([
    { name: "", email: "", phone: "", docType: "CPF", docNumber: "" },
  ]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const uc = (q.get("unitCode") || "").toUpperCase();
    setUnitCode(uc);

    async function load() {
      if (!uc) return;
      const res = await fetch(`/api/unit/by-code?unitCode=${uc}`);
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Erro ao carregar unidade");
        return;
      }
      setUnit(data.unit);
    }

    load();
  }, []);

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Falha no upload");
    return data.url as string;
  }

  function setGuest(i: number, patch: Partial<Guest>) {
    setGuests((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  function addGuest() {
    setGuests((prev) => [...prev, { name: "", email: "", phone: "", docType: "CPF", docNumber: "" }]);
  }

  function removeGuest(i: number) {
    setGuests((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setLoading(true);
    setMsg("");

    try {
      if (!unitCode) throw new Error("unitCode ausente.");
      if (!checkIn || !checkOut) throw new Error("Informe check-in e check-out.");
      if (!rentalProofFileUrl) throw new Error("Anexo obrigatório: contrato/print do app de locação.");

      if (guests.length === 0) throw new Error("Adicione pelo menos 1 hóspede.");
      for (const [idx, g] of guests.entries()) {
        if (!g.name || !g.email || !g.phone || !g.docType || !g.docNumber) {
          throw new Error(`Hóspede ${idx + 1}: preencha nome, email, telefone, tipo e número do documento.`);
        }
      }

      if (hasGarage) {
        if (!garageNumber) throw new Error("Informe o número da vaga.");
        if (garageIsRented) {
          if (!garageRentedFromUnit) throw new Error("Se a vaga é locada, informe de qual unidade é locada.");
          if (!garageContractFileUrl) throw new Error("Se a vaga é locada, anexe o contrato de locação da vaga (obrigatório).");
        }
      }

      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitCode,
          checkIn,
          checkOut,
          platform,
          notes,
          rentalProofFileUrl,
          hasGarage,
          garageIsRented,
          garageRentedFromUnit: garageIsRented ? garageRentedFromUnit : null,
          garageContractFileUrl: garageIsRented ? garageContractFileUrl : null,
          garageSide: hasGarage ? garageSide : null,
          garageTower: hasGarage ? garageTower : null,
          garageLevel: hasGarage ? garageLevel : null,
          garageNumber: hasGarage ? garageNumber : null,
          guests,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar reserva.");

      setMsg("✅ Reserva cadastrada com sucesso!");
      setTimeout(() => (window.location.href = `/u/${unitCode}`), 800);
    } catch (e: any) {
      setMsg(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <h1>Cadastro de Hóspedes / Reserva</h1>

      {unit ? (
        <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <b>Unidade:</b> {unit.unit} • <b>Bloco:</b> {unit.block} • <b>Responsável:</b> {unit.name}
        </div>
      ) : (
        <div style={{ opacity: 0.8, marginBottom: 12 }}>Carregando unidade...</div>
      )}

      {msg && <div style={{ background: "#fff7cc", padding: 12, borderRadius: 10, marginBottom: 12 }}>{msg}</div>}

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2>Dados da locação (obrigatórios)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Check-in</label>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </div>
          <div>
            <label>Check-out</label>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label>Plataforma / App (opcional)</label>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Ex.: Airbnb, Booking, etc."
              style={{ width: "100%", padding: 10 }}
            />
          </div>
          <div>
            <label>Qtd. de hóspedes</label>
            <input
              value={String(guests.length)}
              readOnly
              style={{ width: "100%", padding: 10, background: "#f5f5f5" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Observações (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: horário de chegada, observações da administração, etc."
            style={{ width: "100%", padding: 10, minHeight: 90 }}
          />
        </div>

        <div style={{ marginTop: 12, border: "1px dashed #bbb", padding: 12, borderRadius: 10 }}>
          <b>Anexo obrigatório:</b> contrato de locação temporária ou print do app.
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setLoading(true);
                setMsg("Enviando anexo...");
                try {
                  const url = await uploadFile(f);
                  setRentalProofFileUrl(url);
                  setMsg("✅ Anexo enviado.");
                } catch (err: any) {
                  setMsg(err.message || "Falha no upload");
                } finally {
                  setLoading(false);
                }
              }}
            />
            {rentalProofFileUrl ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Arquivo: {rentalProofFileUrl}</div> : null}
          </div>
        </div>

        <h2 style={{ marginTop: 18 }}>Garagem</h2>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={hasGarage} onChange={(e) => setHasGarage(e.target.checked)} />
          Esta reserva terá vaga de garagem?
        </label>

        {hasGarage && (
          <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={garageIsRented} onChange={(e) => setGarageIsRented(e.target.checked)} />
              A vaga é locada?
            </label>

            {garageIsRented && (
              <>
                <div style={{ marginTop: 10 }}>
                  <label>De qual unidade é locada? (obrigatório)</label>
                  <input value={garageRentedFromUnit} onChange={(e) => setGarageRentedFromUnit(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>

                <div style={{ marginTop: 12, border: "1px dashed #bbb", padding: 12, borderRadius: 10 }}>
                  <b>Contrato da vaga (obrigatório)</b>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setLoading(true);
                        setMsg("Enviando contrato da vaga...");
                        try {
                          const url = await uploadFile(f);
                          setGarageContractFileUrl(url);
                          setMsg("✅ Contrato enviado.");
                        } catch (err: any) {
                          setMsg(err.message || "Falha no upload");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    />
                    {garageContractFileUrl ? (
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Arquivo: {garageContractFileUrl}</div>
                    ) : null}
                  </div>
                </div>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label>Garagem (lado)</label>
                <select value={garageSide} onChange={(e) => setGarageSide(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
                  <option value="ATLANTICO">Atlântico</option>
                  <option value="PACIFICO_MAR_VERMELHO">Pacífico / Mar Vermelho</option>
                </select>
              </div>

              <div>
                <label>Torre</label>
                <select value={garageTower} onChange={(e) => setGarageTower(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
                  <option value="PACIFICO">Pacífico</option>
                  <option value="MAR_VERMELHO">Mar Vermelho</option>
                  <option value="ATLANTICO">Atlântico</option>
                </select>
              </div>

              <div>
                <label>Subsolo</label>
                <select value={garageLevel} onChange={(e) => setGarageLevel(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
                  <option value="S1">1º Subsolo</option>
                  <option value="S2">2º Subsolo</option>
                  <option value="S3">3º Subsolo</option>
                </select>
              </div>

              <div>
                <label>Número da vaga (obrigatório)</label>
                <input value={garageNumber} onChange={(e) => setGarageNumber(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
            </div>
          </div>
        )}

        <h2 style={{ marginTop: 18 }}>Hóspedes (obrigatórios)</h2>

        {guests.map((g, i) => (
          <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <b>Hóspede {i + 1}</b>
              {guests.length > 1 && (
                <button onClick={() => removeGuest(i)} type="button">Remover</button>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <label>Nome</label>
              <input value={g.name} onChange={(e) => setGuest(i, { name: e.target.value })} style={{ width: "100%", padding: 10 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div>
                <label>Email</label>
                <input value={g.email} onChange={(e) => setGuest(i, { email: e.target.value })} style={{ width: "100%", padding: 10 }} />
              </div>
              <div>
                <label>Telefone</label>
                <input value={g.phone} onChange={(e) => setGuest(i, { phone: e.target.value })} style={{ width: "100%", padding: 10 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div>
                <label>Tipo de documento</label>
                <select value={g.docType} onChange={(e) => setGuest(i, { docType: e.target.value as any })} style={{ width: "100%", padding: 10 }}>
                  <option value="CPF">CPF</option>
                  <option value="RG">RG</option>
                  <option value="PASSPORT">Passaporte</option>
                </select>
              </div>

              <div>
                <label>Número do documento</label>
                <input value={g.docNumber} onChange={(e) => setGuest(i, { docNumber: e.target.value })} style={{ width: "100%", padding: 10 }} />
              </div>
            </div>

            <div style={{ marginTop: 10, border: "1px dashed #bbb", padding: 12, borderRadius: 10 }}>
              <b>Anexo do documento (opcional)</b>
              <div style={{ marginTop: 8 }}>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setLoading(true);
                    setMsg("Enviando documento do hóspede...");
                    try {
                      const url = await uploadFile(f);
                      setGuest(i, { docFileUrl: url });
                      setMsg("✅ Documento anexado.");
                    } catch (err: any) {
                      setMsg(err.message || "Falha no upload");
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
                {g.docFileUrl ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Arquivo: {g.docFileUrl}</div> : null}
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addGuest} style={{ marginTop: 12 }}>
          + Adicionar mais hóspede
        </button>

        <button
          onClick={submit}
          disabled={loading}
          style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 10, border: 0, background: "#1677ff", color: "white", fontWeight: 800 }}
        >
          {loading ? "Salvando..." : "Enviar cadastro"}
        </button>
      </div>
    </main>
  );
}
