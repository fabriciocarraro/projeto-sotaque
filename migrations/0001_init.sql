-- Metadados publicáveis: vão (parcialmente) para o dataset aberto.
-- Nenhum dado desta tabela identifica diretamente a pessoa.
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  pseudonimo TEXT NOT NULL,
  sotaque_declarado TEXT NOT NULL,
  regiao_socializacao TEXT NOT NULL,
  estado_principal TEXT NOT NULL,
  cidade_microrregiao TEXT,
  faixa_etaria TEXT NOT NULL,
  genero TEXT,
  tipo_dispositivo TEXT,
  tipo_microfone TEXT,
  ambiente_gravacao TEXT,
  autoavaliacao_qualidade INTEGER,
  audio_key TEXT NOT NULL,
  audio_hash TEXT NOT NULL,
  audio_tamanho INTEGER NOT NULL,
  audio_mimetype TEXT NOT NULL,
  audio_nome_original TEXT,
  status_moderacao TEXT NOT NULL DEFAULT 'pendente',
  criado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status_moderacao);
CREATE INDEX IF NOT EXISTS idx_submissions_sotaque ON submissions (sotaque_declarado);
CREATE INDEX IF NOT EXISTS idx_submissions_audio_hash ON submissions (audio_hash);

-- Evidências de consentimento e contato: base privada, nunca publicada.
-- Mantida por legítimo interesse conforme Seção 4.2 do termo.
CREATE TABLE IF NOT EXISTS consent_records (
  submission_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  termo_versao TEXT NOT NULL,
  checkbox_1 INTEGER NOT NULL,
  checkbox_2 INTEGER NOT NULL,
  checkbox_3 INTEGER NOT NULL,
  checkbox_4 INTEGER NOT NULL,
  checkbox_5 INTEGER NOT NULL,
  checkbox_6 INTEGER NOT NULL,
  checkbox_7 INTEGER NOT NULL,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  aceito_em TEXT NOT NULL,
  status_revogacao TEXT NOT NULL DEFAULT 'ativo',
  revogado_em TEXT,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE INDEX IF NOT EXISTS idx_consent_email ON consent_records (email);
CREATE INDEX IF NOT EXISTS idx_consent_revogacao ON consent_records (status_revogacao);

-- Pedidos de revogação (podem chegar sem submission_id se a pessoa não lembrar).
CREATE TABLE IF NOT EXISTS revocation_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  submission_id TEXT,
  motivo TEXT,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  processado_em TEXT
);

CREATE INDEX IF NOT EXISTS idx_revocation_email ON revocation_requests (email);
CREATE INDEX IF NOT EXISTS idx_revocation_status ON revocation_requests (status);
