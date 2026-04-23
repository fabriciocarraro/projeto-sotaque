# Projeto SOTAQUE

**Speech-Oriented Training Audio for Quality Understanding and Expression.**

Dataset aberto de vozes em português brasileiro, com foco em sotaques regionais, para uso em pesquisa e treinamento de tecnologias de fala (TTS, ASR, benchmarks). Contribuição voluntária, por crowdsourcing.

- Site: https://sotaque.ia.br
- Licença do dataset: CDLA-Permissive-2.0
- Controlador: Fabrício Carraro (pessoa natural)
- Contato para privacidade / revogação: contato@fabriciocarraro.com.br

## Stack

- **Astro** (site estático + ilhas React) + **Tailwind** + **TypeScript**.
- **Cloudflare Pages** (frontend) + **Pages Functions** (backend no mesmo projeto).
- **D1** (SQLite) para metadados e registros de consentimento.
- **R2** para os arquivos de áudio.
- **Turnstile** para anti-spam.

## Estrutura

```
src/
├── pages/
│   ├── index.astro         # home
│   ├── sobre.astro
│   ├── termo.astro         # termo v1 renderizado do markdown
│   ├── contribuir.astro    # formulário
│   ├── revogacao.astro
│   └── sucesso.astro
├── components/
│   ├── FormularioContribuicao.tsx
│   ├── FormularioRevogacao.tsx
│   ├── MapaDialetos.astro
│   └── Card.astro
├── content/
│   └── termo/v1.md         # termo versionado
├── layouts/Base.astro
└── lib/
    ├── opcoes.ts           # listas fixas (sotaques, estados, faixas etárias, etc.)
    ├── schema.ts           # Zod (compartilhado front/back)
    └── revogacao.ts

functions/
├── api/
│   ├── submissions.ts      # POST /api/submissions
│   └── revogacao.ts        # POST /api/revogacao
└── lib/
    ├── turnstile.ts
    └── hash.ts

migrations/
└── 0001_init.sql           # schema D1
```

## Desenvolvimento local

```bash
# 1. Instalar dependências
npm install

# 2. Criar .dev.vars a partir do exemplo
cp .dev.vars.example .dev.vars
# Editar com suas chaves de teste do Turnstile (1x00000000000000000000AA / 1x0000000000000000000000000000000AA servem para sempre-passar)

# 3. Criar arquivo .env com a site key PÚBLICA do Turnstile
echo "PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA" > .env

# 4. Rodar migrações no D1 local
npm run db:migrate:local

# 5. Dev server (Astro sozinho, sem backend)
npm run dev

# OU — dev server com Pages Functions (build + wrangler):
npm run build
npm run pages:dev
```

As **test keys** do Turnstile sempre passam e funcionam fora de domínios de produção:

- Site key (pública): `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

## Deploy (primeira vez)

### 1. Criar conta Cloudflare e logar

```bash
npx wrangler login
```

### 2. Criar o bucket R2

```bash
npx wrangler r2 bucket create sotaque-audios
```

### 3. Criar o banco D1 e rodar a migration

```bash
npx wrangler d1 create sotaque-db
# Copie o "database_id" retornado e cole em wrangler.toml.

npm run db:migrate:remote
```

### 4. Criar o widget Turnstile

Em https://dash.cloudflare.com → Turnstile → **Add site**:

- Domain: `sotaque.ia.br`
- Widget mode: `Managed` (recomendado) ou `Invisible`
- Copie a **Site Key** (pública) e a **Secret Key**.

### 5. Criar o projeto no Cloudflare Pages

Via Dashboard (mais simples):

1. https://dash.cloudflare.com → Workers & Pages → **Create** → Pages → **Connect to Git**
2. Selecionar o repo `projeto-sotaque`
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Environment variables (Production e Preview):
   - `PUBLIC_TURNSTILE_SITE_KEY` = (site key pública)
5. Após o primeiro deploy, em **Settings → Bindings**:
   - **D1 database:** adicionar binding `DB` → `sotaque-db`
   - **R2 bucket:** adicionar binding `AUDIO_BUCKET` → `sotaque-audios`
   - **Variables → Secret:** adicionar `TURNSTILE_SECRET_KEY` = (secret key) e `TERMO_VERSAO` = `1.0`

### 6. Apontar o domínio `sotaque.ia.br`

1. No registrar onde você comprou o domínio, trocar os **nameservers** pelos da Cloudflare (a Cloudflare te mostra quais NS usar quando você adiciona o domínio no dashboard).
2. Em Cloudflare Pages → **Custom domains** → adicionar `sotaque.ia.br`.
3. O SSL é provisionado automaticamente.

## Modelo de dados (D1)

Duas bases logicamente separadas no mesmo banco:

- **`submissions`** — metadados publicáveis (pseudônimo, sotaque, região, etc.) e referência ao áudio no R2. Esta é a tabela da qual o dataset público é derivado (após curadoria).
- **`consent_records`** — evidências de consentimento (checkboxes, IP, user-agent, versão do termo) e e-mail. **Nunca publicada.** Mantida por legítimo interesse (Seção 4.2 do termo) pelos prazos da Seção 7.
- **`revocation_requests`** — pedidos de revogação recebidos pelo formulário.

## Segurança e conformidade

- Nenhuma secret é commitada. `.dev.vars` está no `.gitignore`.
- Hash SHA-256 do áudio é calculado no servidor e usado como guarda contra duplicatas.
- IP e User-Agent são registrados apenas para prova de consentimento (Seção 4.2 do termo) e retidos conforme a Seção 7.
- O termo é versionado (`src/content/termo/v1.md`). Ao alterar o termo, criar `v2.md`, atualizar a página `/termo` para carregar a nova versão e incrementar a secret `TERMO_VERSAO`.

## Fase 2 (ainda não implementado)

- Painel de moderação (`/admin`) autenticado.
- Processamento automatizado de pedidos de revogação (marcar `consent_records.status_revogacao='revogado'` e remover arquivo do R2).
- Exportação periódica do dataset curado para publicação.
