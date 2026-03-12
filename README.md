# Sistema de Locação (Next.js + Prisma + SQLite)

Este zip contém a estrutura completa (pastas + códigos) para:
- Cadastro da unidade (apenas 1 vez)
- Cadastro de reservas + hóspedes + anexos
- Painel ADM com validação interna (validado/pendente etc.) + observação

## Como rodar
1) Extraia o zip
2) Abra a pasta no VS Code
3) Crie um arquivo `.env` na raiz (use `.env.example` como base). Dica:
   - copie `.env.example` -> `.env`
   - preencha `ADMIN_ACCESS_CODE` e SMTP
4) No terminal:
   - `pnpm install`
   - `pnpm prisma generate`
   - `pnpm prisma db push --force-reset`
   - `pnpm dev`
5) Acesse: http://localhost:3000

## Endereços
- Público (link único): `/`
- Painel da unidade: `/u/[unitCode]`
- Cadastro de reserva: `/booking/new?unitCode=XXXX`
- Painel ADM: `/adm` (acesso por **código/token** definido no `.env`)

## Teste de e-mail (SMTP)
- Rota de teste: `/api/teste-email?to=seuemail@dominio.com` (alias: `/api/test-email?...`)
- Se estiver usando Gmail, use **senha de app** (com 2FA) em `SMTP_PASS`.

## Identidade visual
O zip já vem com um **logo placeholder** em `public/brand/logo.png`.
Para usar o logo oficial do condomínio, basta substituir esse arquivo mantendo o mesmo nome.
