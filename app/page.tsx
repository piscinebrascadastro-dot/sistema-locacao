"use client";

import { useState } from "react";
import { BrandHeader } from "./components/BrandHeader";

type Block = "PACIFICO" | "MAR_VERMELHO" | "ATLANTICO";
type ResponsibleType = "OWNER" | "ADMIN_OR_PROXY";

export default function HomePage() {
  const [step, setStep] = useState<"REGISTER" | "ACCESS">("REGISTER");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    unit: "",
    block: "ATLANTICO" as Block,
    responsibleType: "OWNER" as ResponsibleType,

    name: "",
    rg: "",
    cpf: "",
    email: "",
    phone: "",

    authorizationFileUrl: "",

    confirmTrue: false,
    accessCode: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Falha no upload");
    return data.url as string;
  }

  async function submitRegister() {
    setLoading(true);
    setMsg("");

    try {
      if (!form.unit.trim()) throw new Error("Informe a unidade.");
      if (!form.confirmTrue) throw new Error("Confirme que as informações são verdadeiras.");

      if (form.responsibleType === "ADMIN_OR_PROXY" && !form.authorizationFileUrl) {
        throw new Error("Anexe a procuração/contrato (obrigatório para ADMIN/PROCURADOR).");
      }

      const res = await fetch("/api/public/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit: form.unit,
          block: form.block,
          responsibleType: form.responsibleType,
          name: form.name,
          rg: form.rg,
          cpf: form.cpf,
          email: form.email,
          phone: form.phone,
          authorizationFileUrl: form.authorizationFileUrl || null,
          accessCode: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.code === "NEED_ACCESS_CODE") {
          setStep("ACCESS");
          setMsg("Essa unidade já está cadastrada. Informe o código de acesso para continuar.");
          return;
        }
        throw new Error(data?.error || "Erro ao cadastrar");
      }

      if (data?.accessCode) {
        setMsg(`DEV: Código de acesso gerado: ${data.accessCode}. Redirecionando...`);
      }

      if (data?.redirectUrl) {
        setTimeout(() => (window.location.href = data.redirectUrl), 600);
        return;
      }

      throw new Error("Cadastro ok, mas sem redirectUrl.");
    } catch (e: any) {
      setMsg(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function submitAccess() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/public/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit: form.unit,
          block: form.block,
          accessCode: form.accessCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Código inválido");

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      throw new Error("Ok, mas sem redirectUrl.");
    } catch (e: any) {
      setMsg(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <BrandHeader title="Sistema de Locação" subtitle="Piscine Station Resort Brás" />
      <div className="card" style={{ marginTop: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Formulário de Hospedagem</h1>

      <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 10, marginBottom: 16 }}>
        <b>Objetivo:</b> cadastrar unidade (uma única vez) e registrar hóspedes/locações.
        <br />
        <b>LGPD:</b> as informações serão utilizadas exclusivamente para controle de acesso e segurança do condomínio.
      </div>

      {msg && (
        <div style={{ background: "#fff7cc", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          {msg}
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Unidade (obrigatório)</label>
            <input value={form.unit} onChange={(e) => set("unit", e.target.value)} style={{ width: "100%", padding: 10 }} />
          </div>

          <div>
            <label>Bloco (obrigatório)</label>
            <select value={form.block} onChange={(e) => set("block", e.target.value as any)} style={{ width: "100%", padding: 10 }}>
              <option value="PACIFICO">PACÍFICO</option>
              <option value="MAR_VERMELHO">MAR VERMELHO</option>
              <option value="ATLANTICO">ATLÂNTICO</option>
            </select>
          </div>
        </div>

        {step === "REGISTER" && (
          <>
            <div style={{ marginTop: 12 }}>
              <label>Quem é o responsável pela locação? (obrigatório)</label>
              <select
                value={form.responsibleType}
                onChange={(e) => set("responsibleType", e.target.value as any)}
                style={{ width: "100%", padding: 10 }}
              >
                <option value="OWNER">PROPRIETÁRIO</option>
                <option value="ADMIN_OR_PROXY">ADMINISTRADOR / PROCURADOR</option>
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Nome (obrigatório)</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} style={{ width: "100%", padding: 10 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label>RG (obrigatório)</label>
                <input value={form.rg} onChange={(e) => set("rg", e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
              <div>
                <label>CPF (obrigatório)</label>
                <input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label>E-mail (obrigatório)</label>
                <input value={form.email} onChange={(e) => set("email", e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
              <div>
                <label>Telefone (obrigatório)</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
            </div>

            {form.responsibleType === "ADMIN_OR_PROXY" && (
              <div style={{ marginTop: 12, border: "1px dashed #bbb", padding: 12, borderRadius: 10 }}>
                <b>Obrigatório:</b> anexe a procuração/contrato de administração.
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
                        set("authorizationFileUrl", url);
                        setMsg("✅ Anexo enviado.");
                      } catch (err: any) {
                        setMsg(err.message || "Falha no upload");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                  {form.authorizationFileUrl ? (
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Arquivo: {form.authorizationFileUrl}</div>
                  ) : null}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={form.confirmTrue} onChange={(e) => set("confirmTrue", e.target.checked)} />
                Confirmo que as informações são verdadeiras e que sou responsável por este cadastro.
              </label>
            </div>

            <button
              onClick={submitRegister}
              disabled={loading}
              style={{ marginTop: 14, width: "100%", padding: 12, borderRadius: 10, border: 0, background: "#1677ff", color: "white", fontWeight: 800 }}
            >
              {loading ? "Aguarde..." : "Cadastrar unidade (1ª vez) / Continuar"}
            </button>
          </>
        )}

        {step === "ACCESS" && (
          <>
            <div style={{ marginTop: 12 }}>
              <label>Código de acesso da unidade (obrigatório)</label>
              <input value={form.accessCode} onChange={(e) => set("accessCode", e.target.value)} style={{ width: "100%", padding: 10 }} />
            </div>

            <button
              onClick={submitAccess}
              disabled={loading}
              style={{ marginTop: 14, width: "100%", padding: 12, borderRadius: 10, border: 0, background: "#1677ff", color: "white", fontWeight: 800 }}
            >
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 18, opacity: 0.8 }}>
        Painel ADM: <a href="/adm">/adm</a>
      </div>
    </div>
    </main>
  );
}
