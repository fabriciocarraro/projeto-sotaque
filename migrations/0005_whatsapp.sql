ALTER TABLE submissions ADD COLUMN source TEXT NOT NULL DEFAULT 'web';

CREATE TABLE whatsapp_sessions (
  phone                 TEXT PRIMARY KEY,
  state                 TEXT NOT NULL,
  current_step          TEXT,
  metadata_json         TEXT,
  audio_key             TEXT,
  audio_hash            TEXT,
  audio_tamanho         INTEGER,
  audio_mimetype        TEXT,
  audio_duracao_segundos REAL,
  audio_nome_original   TEXT,
  criado_em             TEXT NOT NULL,
  atualizado_em         TEXT NOT NULL
);

CREATE TABLE whatsapp_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  phone         TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  tipo          TEXT NOT NULL,
  conteudo      TEXT,
  wa_message_id TEXT,
  criado_em     TEXT NOT NULL
);

CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone);
