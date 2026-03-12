"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "../components/BrandHeader";

type UnitRow = {
  id: string;
  unit: string;
  block: string;
  unitCode: string;
  responsibleType: string;
  name: string;
  rg?: string | null;
  cpf?: string | null;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  bookingsCount: number;
};

type GuestRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  docType: string;
  docNumber: string;
  docFileUrl: string | null;
  validationStatus: string;
  validationNote?: string | null;
};

type BookingRow = {
  id: string;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  platform: string;
  notes: string;
  rentalProofFileUrl: string | null;
  garageContractFileUrl: string | null;
  hasGarage?: boolean | null;
  garageIsRented?: boolean | null;
  garageRentedFromUnit?: string | null;
  garageSide?: string | null;
  garageTower?: string | null;
  garageLevel?: string | null;
  garageNumber?: string | null;
  status: string; // validationStatus da reserva
  validationNote?: string | null;
  unit: {
    unit: string;
    block: string;
    unitCode: string;
    responsibleType: string;
    name: string;
    email: string;
    phone: string;
  };
  guests: GuestRow[];
};

type ApiOk = { ok: boolean; error?: string };

type ApiMe = ApiOk & { ok: boolean };

type ApiBookings = ApiOk & { bookings?: BookingRow[] };

type ApiUnits = ApiOk & { units?: UnitRow[] };

async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function fmtDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleString("pt-BR");
  } catch {
    return s;
  }
}

function normalizeStatus(s: string) {
  const v = String(s || "").trim().toUpperCase();
  if (v === "VALIDADO" || v === "VALIDATED") return "VALIDADO";
  if (v === "RECUSADO" || v === "REJECTED") return "RECUSADO";
  return "PENDENTE";
}

function deriveBookingStatus(guests: GuestRow[]) {
  if (!guests.length) return "PENDENTE";
  const gs = guests.map((g) => normalizeStatus(g.validationStatus));
  if (gs.some((s) => s === "RECUSADO")) return "RECUSADO";
  if (gs.every((s) => s === "VALIDADO")) return "VALIDADO";
  return "PENDENTE";
}

function rowClass(status: string) {
  const v = normalizeStatus(status);
  if (v === "VALIDADO") return "rowOk";
  if (v === "RECUSADO") return "rowBad";
  return "rowPending";
}

function extractFileKey(url: string | null | undefined) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (u.startsWith("private:")) return u.replace(/^private:/, "");
  // compatibilidade com arquivos antigos em /uploads/...
  if (u.startsWith("/uploads/")) return u.split("/uploads/")[1] || null;
  // se for uma URL completa, tenta pegar o basename
  try {
    const parsed = new URL(u);
    const p = parsed.pathname;
    const base = p.split("/").filter(Boolean).pop() || null;
    return base;
  } catch {
    const base = u.split("/").filter(Boolean).pop() || null;
    return base;
  }
}

function adminFileUrl(url: string | null | undefined) {
  const key = extractFileKey(url);
  return key ? `/api/adm/files/${encodeURIComponent(key)}` : null;
}

function formatGarage(b: BookingRow) {
  if (!b.hasGarage) return "—";
  const parts: string[] = [];
  if (b.garageTower) parts.push(String(b.garageTower));
  if (b.garageLevel) parts.push(String(b.garageLevel));
  if (b.garageNumber) parts.push(String(b.garageNumber));
  const loc = parts.filter(Boolean).join("-");
  if (b.garageIsRented) {
    const from = b.garageRentedFromUnit ? ` (locada de ${b.garageRentedFromUnit})` : "";
    return `🔁 ${loc || "vaga"}${from}`;
  }
  return `🅿️ ${loc || "vaga"}`;
}

function countAttachments(b: BookingRow) {
  let n = 0;
  if (b.rentalProofFileUrl) n += 1;
  if (b.garageContractFileUrl) n += 1;
  for (const g of b.guests || []) if (g.docFileUrl) n += 1;
  return n;
}

export default function AdmPage() {
  const [code, setCode] = useState("");
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [tab, setTab] = useState<"bookings" | "units">("bookings");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "validado" | "recusado">("todos");
  const [q, setQ] = useState("");

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [savingGuestId, setSavingGuestId] = useState<string | null>(null);

  // edição local
  const [bookingStatus, setBookingStatus] = useState<Record<string, string>>({});
  const [bookingNote, setBookingNote] = useState<Record<string, string>>({});
  const [guestStatus, setGuestStatus] = useState<Record<string, string>>({});
  const [guestNote, setGuestNote] = useState<Record<string, string>>({});

  const [detailsBookingId, setDetailsBookingId] = useState<string | null>(null);

  function getAuthHeaders(tokenOverride?: string) {
    const token = String(tokenOverride ?? code).trim();
    return token ? { "x-admin-code": token } : {};
  }

  async function checkMe(tokenFromStorage?: string) {
    try {
      const token = (tokenFromStorage ?? code).trim();
      const res = await fetch("/api/adm/me", {
        headers: token ? { "x-admin-code": token } : {},
        cache: "no-store",
      });
      const data = (await safeJson<ApiMe>(res)) ?? { ok: false };
      setIsAuthed(Boolean(res.ok && data.ok));
    } catch {
      setIsAuthed(false);
    }
  }

  function initEdits(bks: BookingRow[]) {
    const bs: Record<string, string> = {};
    const bn: Record<string, string> = {};
    const gs: Record<string, string> = {};
    const gn: Record<string, string> = {};

    for (const b of bks) {
      const auto = deriveBookingStatus(b.guests || []);
      bs[b.id] = normalizeStatus(b.status || auto);
      bn[b.id] = b.validationNote || "";

      for (const g of b.guests || []) {
        gs[g.id] = normalizeStatus(g.validationStatus);
        gn[g.id] = g.validationNote || "";
      }
    }

    setBookingStatus(bs);
    setBookingNote(bn);
    setGuestStatus(gs);
    setGuestNote(gn);
  }

  async function loadAll() {
    setLoading(true);
    setMessage(null);

    try {
      const [bRes, uRes] = await Promise.all([
        fetch("/api/adm/bookings", { headers: getAuthHeaders(), cache: "no-store" }),
        fetch("/api/adm/units", { headers: getAuthHeaders(), cache: "no-store" }),
      ]);

      const bData = (await safeJson<ApiBookings>(bRes)) ?? { ok: false };
      const uData = (await safeJson<ApiUnits>(uRes)) ?? { ok: false };

      if (!bRes.ok || !bData.ok) {
        setMessage(bData.error || `Falha ao carregar reservas (HTTP ${bRes.status})`);
      }
      if (!uRes.ok || !uData.ok) {
        setMessage((prev) => prev || uData.error || `Falha ao carregar unidades (HTTP ${uRes.status})`);
      }

      const loadedBookings = Array.isArray(bData.bookings) ? bData.bookings : [];
      setBookings(loadedBookings);
      initEdits(loadedBookings);

      setUnits(Array.isArray(uData.units) ? uData.units : []);
    } finally {
      setLoading(false);
    }
  }

  async function doLogin() {
    setLoading(true);
    setMessage(null);

    try {
      const token = code.trim();
      if (!token) {
        setIsAuthed(false);
        setMessage("Informe o código de acesso");
        return;
      }

      // 1) valida e seta cookie HttpOnly (para export/download sem token em URL)
      const loginRes = await fetch("/api/adm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: token }),
      });
      const loginData = (await safeJson<ApiOk>(loginRes)) ?? { ok: false };

      if (!loginRes.ok || !loginData.ok) {
        setIsAuthed(false);
        setMessage(loginData.error || "Código inválido");
        return;
      }

      // 2) confirma acesso (aceita cookie + header)
      const res = await fetch("/api/adm/me", { headers: { "x-admin-code": token }, cache: "no-store" });
      const data = (await safeJson<ApiOk>(res)) ?? { ok: false };

      if (res.ok && data.ok) {
        try {
          localStorage.setItem("adm_access_code", token);
        } catch {}
        setIsAuthed(true);
        await loadAll();
      } else {
        setIsAuthed(false);
        setMessage(data.error || "Código inválido");
      }
    } catch {
      setIsAuthed(false);
      setMessage("Falha no login");
    } finally {
      setLoading(false);
    }
  }

  async function doLogout() {
    setLoading(true);
    setMessage(null);
    try {
      try {
        localStorage.removeItem("adm_access_code");
      } catch {}
      await fetch("/api/adm/logout", { method: "POST" }).catch(() => null);
    } finally {
      setIsAuthed(false);
      setBookings([]);
      setUnits([]);
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const saved = String(localStorage.getItem("adm_access_code") || "").trim();
      if (saved) {
        setCode(saved);
        void checkMe(saved);
        return;
      }
    } catch {}

    void checkMe();
  }, []);

  useEffect(() => {
    if (isAuthed) void loadAll();
  }, [isAuthed]);

  const filteredBookings = useMemo(() => {
    let arr = bookings.slice();

    if (statusFilter !== "todos") {
      arr = arr.filter((b) => {
        const v = normalizeStatus(bookingStatus[b.id] || b.status || deriveBookingStatus(b.guests || []));
        return v === statusFilter.toUpperCase();
      });
    }

    const query = q.trim().toLowerCase();
    if (query) {
      arr = arr.filter((b) => {
        const guestsText = (b.guests || [])
          .map((g) => `${g.name} ${g.docType} ${g.docNumber}`)
          .join(" ");

        const hay = [
          b.unit?.unitCode,
          b.unit?.unit,
          b.unit?.block,
          b.unit?.name,
          b.platform,
          b.id,
          guestsText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });
    }

    return arr;
  }, [bookings, q, statusFilter, bookingStatus]);

  const detailsBooking = useMemo(() => {
    if (!detailsBookingId) return null;
    return bookings.find((b) => b.id === detailsBookingId) || null;
  }, [bookings, detailsBookingId]);

  const filteredUnits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return units;
    return units.filter((u) => {
      const hay = [u.unitCode, u.unit, u.block, u.name, u.email, u.phone, u.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [units, q]);

  async function saveBookingValidation(bookingId: string) {
    const token = code.trim();
    if (!token) return;

    setSavingBookingId(bookingId);
    setMessage(null);

    try {
      const res = await fetch("/api/adm/booking/update", {
        method: "POST",
        headers: { ...getAuthHeaders(token), "content-type": "application/json" },
        body: JSON.stringify({
          bookingId,
          validationStatus: normalizeStatus(bookingStatus[bookingId] || "PENDENTE"),
          validationNote: bookingNote[bookingId] || "",
        }),
      });

      const data = (await safeJson<ApiOk & { booking?: any }>(res)) ?? { ok: false };
      if (!res.ok || !data.ok) {
        setMessage(data.error || `Erro ao salvar reserva (HTTP ${res.status})`);
        return;
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: data.booking?.validationStatus || normalizeStatus(bookingStatus[bookingId] || b.status),
                validationNote: data.booking?.validationNote ?? bookingNote[bookingId] ?? b.validationNote,
              }
            : b
        )
      );
    } finally {
      setSavingBookingId(null);
    }
  }

  async function saveGuestValidation(bookingId: string, guestId: string) {
    const token = code.trim();
    if (!token) return;

    setSavingGuestId(guestId);
    setMessage(null);

    try {
      // 1) atualiza hóspede
      const res = await fetch("/api/adm/guest/update", {
        method: "POST",
        headers: { ...getAuthHeaders(token), "content-type": "application/json" },
        body: JSON.stringify({
          id: guestId,
          validationStatus: normalizeStatus(guestStatus[guestId] || "PENDENTE"),
          validationNote: guestNote[guestId] || "",
        }),
      });

      const data = (await safeJson<ApiOk & { guest?: any }>(res)) ?? { ok: false };
      if (!res.ok || !data.ok) {
        setMessage(data.error || `Erro ao salvar hóspede (HTTP ${res.status})`);
        return;
      }

      // 2) calcula o novo status da reserva com base no hóspede atualizado
      const current = bookings.find((b) => b.id === bookingId);
      const nextGuests = (current?.guests || []).map((g) =>
        g.id === guestId
          ? {
              ...g,
              validationStatus: normalizeStatus(guestStatus[guestId] || "PENDENTE"),
              validationNote: guestNote[guestId] || "",
            }
          : g
      );
      const autoStatus = deriveBookingStatus(nextGuests);

      // 3) atualiza estado local (tela) imediatamente
      setBookings((prev) =>
        prev.map((b) =>
          b.id !== bookingId
            ? b
            : {
                ...b,
                guests: (b.guests || []).map((g) =>
                  g.id === guestId
                    ? {
                        ...g,
                        validationStatus: normalizeStatus(guestStatus[guestId] || "PENDENTE"),
                        validationNote: guestNote[guestId] || "",
                      }
                    : g
                ),
                status: autoStatus,
              }
        )
      );

      // atualiza dropdown da reserva automaticamente
      setBookingStatus((p) => ({ ...p, [bookingId]: autoStatus }));

      // 4) sincroniza status geral da reserva no banco automaticamente
      const res2 = await fetch("/api/adm/booking/update", {
        method: "POST",
        headers: { ...getAuthHeaders(token), "content-type": "application/json" },
        body: JSON.stringify({
          bookingId,
          validationStatus: normalizeStatus(autoStatus),
          validationNote: bookingNote[bookingId] || "",
        }),
      });

      // Se falhar aqui, não quebra a UI (mas deixa mensagem)
      if (!res2.ok) {
        const d2 = (await safeJson<ApiOk>(res2)) ?? null;
        setMessage(d2?.error || `Aviso: falha ao sincronizar reserva (HTTP ${res2.status})`);
      }
    } finally {
      setSavingGuestId(null);
    }
  }

  // ✅ Bloqueia a UI do painel até o token ser validado
  if (!isAuthed) {
    return (
      <main className="page">
        <BrandHeader title="Painel ADM" subtitle="Piscine Station Resort Brás" href="/" />

        <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
          <p>
            <b>Acesso restrito.</b> Digite o <b>código de acesso</b> do ADM para entrar.
          </p>

          {message && (
            <div className="alert alertError" style={{ marginTop: 10 }}>
              {message}
            </div>
          )}

          <div className="card" style={{ marginTop: 14 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <input
                className="input"
                placeholder="Código de acesso"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn btnPrimary" onClick={() => void doLogin()} disabled={loading || !code.trim()}>
                {loading ? "Validando..." : "Entrar"}
              </button>
            </div>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Após validar o código, o painel completo será exibido.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <BrandHeader title="Painel ADM" subtitle="Piscine Station Resort Brás" href="/" />

      <div className="card" style={{ maxWidth: 1300, margin: "0 auto" }}>
        <p>
          Você está como <b>Admin</b>. Validação é <b>interna</b>: o anfitrião não vê status nem recebe nada sobre
          validações.
        </p>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => void loadAll()} disabled={!isAuthed || loading}>
            {loading ? "Carregando…" : "Atualizar"}
          </button>
          <button className="btn" onClick={() => (window.location.href = `/api/adm/export/excel`)} disabled={!isAuthed}>
            Exportar Excel
          </button>
          <button className="btn" onClick={() => (window.location.href = `/api/adm/export/pdf`)} disabled={!isAuthed}>
            Exportar PDF
          </button>
          <button className="btn btnDanger" onClick={() => void doLogout()} disabled={!isAuthed}>
            Sair
          </button>

          <div style={{ flex: 1 }} />

          <input
            className="input"
            style={{ minWidth: 320 }}
            placeholder="Buscar por unidade, bloco, código, hóspede, plataforma..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            className={`btn ${tab === "bookings" ? "btnPrimary" : ""}`}
            onClick={() => setTab("bookings")}
            disabled={!isAuthed}
          >
            Reservas (planilha)
          </button>
          <button
            className={`btn ${tab === "units" ? "btnPrimary" : ""}`}
            onClick={() => setTab("units")}
            disabled={!isAuthed}
          >
            Unidades (anfitriões)
          </button>

          {tab === "bookings" && (
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="validado">Validado</option>
              <option value="recusado">Recusado</option>
            </select>
          )}

          <div style={{ flex: 1 }} />

          {loading && <span style={{ opacity: 0.8 }}>Carregando…</span>}
        </div>

        {message && (
          <div className="alert alertError" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
            {message}
          </div>
        )}

        {tab === "bookings" && (
          <div style={{ marginTop: 12 }}>
            <TableBookings
              items={filteredBookings}
              expanded={expanded}
              onToggle={(id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))}
              bookingStatus={bookingStatus}
              setBookingStatus={setBookingStatus}
              bookingNote={bookingNote}
              setBookingNote={setBookingNote}
              onSaveBooking={saveBookingValidation}
              savingBookingId={savingBookingId}
              guestStatus={guestStatus}
              setGuestStatus={setGuestStatus}
              guestNote={guestNote}
              setGuestNote={setGuestNote}
              onSaveGuest={saveGuestValidation}
              savingGuestId={savingGuestId}
              onOpenDetails={(bookingId) => setDetailsBookingId(bookingId)}
            />
          </div>
        )}

        {tab === "units" && (
          <div style={{ marginTop: 12 }}>
            <TableUnits items={filteredUnits} />
          </div>
        )}
      </div>

      {detailsBooking && (
        <>
          <div className="overlay" onClick={() => setDetailsBookingId(null)} />
          <aside className="drawer" role="dialog" aria-modal="true">
            <div className="drawerHeader">
              <div>
                <div style={{ fontWeight: 900 }}>Detalhes da reserva</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{detailsBooking.unit?.unitCode} • {detailsBooking.unit?.unit} ({detailsBooking.unit?.block})</div>
              </div>
              <button className="btn" onClick={() => setDetailsBookingId(null)}>Fechar</button>
            </div>

            <div className="drawerBody">
              <div className="drawerSection">
                <h3>Locação</h3>
                <div className="kv">
                  <div className="item"><b>Criado em</b>{fmtDate(detailsBooking.createdAt)}</div>
                  <div className="item"><b>Plataforma</b>{detailsBooking.platform || "—"}</div>
                  <div className="item"><b>Check-in</b>{fmtDate(detailsBooking.checkIn)}</div>
                  <div className="item"><b>Check-out</b>{fmtDate(detailsBooking.checkOut)}</div>
                </div>
                {detailsBooking.notes ? (
                  <div style={{ marginTop: 10, fontSize: 14 }}>
                    <b style={{ color: "var(--muted)", fontSize: 12 }}>Observações</b>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{detailsBooking.notes}</div>
                  </div>
                ) : null}
              </div>

              <div className="drawerSection">
                <h3>Garagem</h3>
                <div style={{ fontSize: 14 }}>{formatGarage(detailsBooking)}</div>
                {detailsBooking.garageIsRented ? (
                  <div className="help">Se houver contrato, ele aparece em “Arquivos”.</div>
                ) : null}
              </div>

              <div className="drawerSection">
                <h3>Responsável (Unidade)</h3>
                <div className="kv">
                  <div className="item"><b>Nome</b>{detailsBooking.unit?.name || "—"}</div>
                  <div className="item"><b>Tipo</b>{detailsBooking.unit?.responsibleType || "—"}</div>
                  <div className="item"><b>Email</b>{detailsBooking.unit?.email || "—"}</div>
                  <div className="item"><b>Telefone</b>{detailsBooking.unit?.phone || "—"}</div>
                </div>
              </div>

              <div className="drawerSection">
                <h3>Arquivos</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {detailsBooking.rentalProofFileUrl ? (
                    <a className="btn" style={{ textAlign: "left" }} href={adminFileUrl(detailsBooking.rentalProofFileUrl) || "#"} target="_blank" rel="noreferrer">
                      📄 Comprovante/Contrato da locação
                    </a>
                  ) : (
                    <div className="muted">Sem comprovante anexado</div>
                  )}

                  {detailsBooking.garageContractFileUrl ? (
                    <a className="btn" style={{ textAlign: "left" }} href={adminFileUrl(detailsBooking.garageContractFileUrl) || "#"} target="_blank" rel="noreferrer">
                      🅿️ Contrato da vaga de garagem (locação)
                    </a>
                  ) : null}

                  {(detailsBooking.guests || []).map((g) =>
                    g.docFileUrl ? (
                      <a key={g.id} className="btn" style={{ textAlign: "left" }} href={adminFileUrl(g.docFileUrl) || "#"} target="_blank" rel="noreferrer">
                        🪪 Documento hóspede: {g.name || g.id}
                      </a>
                    ) : (
                      <div key={g.id} className="help">🪪 {g.name || "Hóspede"}: sem arquivo</div>
                    )
                  )}
                </div>
                <div className="help" style={{ marginTop: 10 }}>
                  Acesso aos arquivos é protegido (ADM). Links não são públicos.
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const v = normalizeStatus(status);
  if (v === "VALIDADO") return <span className="pill pillOk">VALIDADO</span>;
  if (v === "RECUSADO") return <span className="pill pillNo">RECUSADO</span>;
  return <span className="pill">PENDENTE</span>;
}

function TableBookings(props: {
  items: BookingRow[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  bookingStatus: Record<string, string>;
  setBookingStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  bookingNote: Record<string, string>;
  setBookingNote: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveBooking: (id: string) => void;
  savingBookingId: string | null;
  guestStatus: Record<string, string>;
  setGuestStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  guestNote: Record<string, string>;
  setGuestNote: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveGuest: (bookingId: string, guestId: string) => void;
  savingGuestId: string | null;
  onOpenDetails: (bookingId: string) => void;
}) {
  const {
    items,
    expanded,
    onToggle,
    bookingStatus,
    setBookingStatus,
    bookingNote,
    setBookingNote,
    onSaveBooking,
    savingBookingId,
    guestStatus,
    setGuestStatus,
    guestNote,
    setGuestNote,
    onSaveGuest,
    savingGuestId,
    onOpenDetails,
  } = props;

  if (!items.length) return <div className="muted">Nenhuma reserva encontrada.</div>;

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Criado em</th>
            <th>Unidade</th>
            <th>Código</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Plataforma</th>
            <th>Garagem</th>
            <th>Anexos</th>
            <th>Qtd. hóspedes</th>
            <th>Status</th>
            <th>Obs.</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {items.flatMap((b) => {
            const isOpen = !!expanded[b.id];
            const currentStatus = normalizeStatus(bookingStatus[b.id] || b.status || deriveBookingStatus(b.guests || []));
            const cls = rowClass(currentStatus);

            const main = (
              <tr key={b.id} className={cls}>
                <td>{fmtDate(b.createdAt)}</td>
                <td>
                  <button
                    className="btn"
                    style={{ padding: "6px 10px", borderRadius: 10 }}
                    onClick={() => onToggle(b.id)}
                    title="Abrir hóspedes"
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                  <span style={{ marginLeft: 10, fontWeight: 800 }}>
                    {b.unit?.unit} ({b.unit?.block})
                  </span>
                </td>
                <td>{b.unit?.unitCode}</td>
                <td>{fmtDate(b.checkIn)}</td>
                <td>{fmtDate(b.checkOut)}</td>
                <td>{b.platform}</td>
                <td>{formatGarage(b)}</td>
                <td style={{ textAlign: "center" }}>{countAttachments(b) ? `📎 ${countAttachments(b)}` : "—"}</td>
                <td>{b.guestsCount}</td>
                <td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <StatusPill status={currentStatus} />
                    <select
                      className="select"
                      value={currentStatus}
                      onChange={(e) => setBookingStatus((p) => ({ ...p, [b.id]: e.target.value }))}
                      style={{ width: 160 }}
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="VALIDADO">VALIDADO</option>
                      <option value="RECUSADO">RECUSADO</option>
                    </select>
                  </div>
                </td>
                <td style={{ minWidth: 280 }}>
                  <input
                    className="input"
                    value={bookingNote[b.id] ?? ""}
                    onChange={(e) => setBookingNote((p) => ({ ...p, [b.id]: e.target.value }))}
                    placeholder="Observação da validação..."
                  />
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn" onClick={() => onOpenDetails(b.id)}>
                      Ver detalhes
                    </button>
                    <button
                      className="btn btnPrimary"
                      onClick={() => onSaveBooking(b.id)}
                      disabled={savingBookingId === b.id}
                    >
                      {savingBookingId === b.id ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </td>
              </tr>
            );

            if (!isOpen) return [main];

            const guestsRow = (
              <tr key={`${b.id}-guests`} className="subRow">
                <td colSpan={12}>
                  <div style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 900 }}>Hóspedes</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>
                        Regra: 1 recusado → reserva recusada; todos validados → reserva validada.
                      </div>
                    </div>

                    {(b.guests || []).length === 0 ? (
                      <div className="muted" style={{ marginTop: 8 }}>
                        Nenhum hóspede cadastrado.
                      </div>
                    ) : (
                      <div className="tableWrap" style={{ marginTop: 10 }}>
                        <table style={{ minWidth: 980 }}>
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>Documento</th>
                              <th>Arquivo</th>
                              <th>Status</th>
                              <th>Obs.</th>
                              <th>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.guests.map((g) => {
                              const gs = normalizeStatus(guestStatus[g.id] || g.validationStatus || "PENDENTE");
                              return (
                                <tr key={g.id} className={rowClass(gs)}>
                                  <td style={{ fontWeight: 800 }}>{g.name || "-"}</td>
                                  <td>
                                    {g.docType || "-"} {g.docNumber || ""}
                                  </td>
                                  <td>
                                    {g.docFileUrl ? (
                                      <a href={adminFileUrl(g.docFileUrl) || "#"} target="_blank" rel="noreferrer">
                                        Ver doc
                                      </a>
                                    ) : (
                                      <span className="muted">—</span>
                                    )}
                                  </td>
                                  <td>
                                    <select
                                      className="select"
                                      value={gs}
                                      onChange={(e) => setGuestStatus((p) => ({ ...p, [g.id]: e.target.value }))}
                                      style={{ width: 160 }}
                                    >
                                      <option value="PENDENTE">PENDENTE</option>
                                      <option value="VALIDADO">VALIDADO</option>
                                      <option value="RECUSADO">RECUSADO</option>
                                    </select>
                                  </td>
                                  <td style={{ minWidth: 240 }}>
                                    <input
                                      className="input"
                                      value={guestNote[g.id] ?? ""}
                                      onChange={(e) => setGuestNote((p) => ({ ...p, [g.id]: e.target.value }))}
                                      placeholder="Observação do hóspede..."
                                    />
                                  </td>
                                  <td>
                                    <button
                                      className="btn btnPrimary"
                                      onClick={() => onSaveGuest(b.id, g.id)}
                                      disabled={savingGuestId === g.id}
                                    >
                                      {savingGuestId === g.id ? "Salvando..." : "Salvar hóspede"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );

            return [main, guestsRow];
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableUnits({ items }: { items: UnitRow[] }) {
  if (!items.length) return <div className="muted">Nenhuma unidade encontrada.</div>;

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Unidade</th>
            <th>Bloco</th>
            <th>Código</th>
            <th>Responsável</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Reservas</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id}>
              <td>{u.unit}</td>
              <td>{u.block}</td>
              <td>{u.unitCode}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.phone}</td>
              <td>{u.bookingsCount}</td>
              <td>{fmtDate(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
