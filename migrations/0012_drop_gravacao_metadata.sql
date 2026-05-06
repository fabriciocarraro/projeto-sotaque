-- Remove os 4 campos de metadados de gravação que estavam na "Seção 4" do formulário.
-- Decisão: a metadata útil pode ser inferida do arquivo de áudio durante a curadoria;
-- o autorrelato de qualidade era enviesado (quase todos marcavam 5).

ALTER TABLE submissions DROP COLUMN tipo_dispositivo;
ALTER TABLE submissions DROP COLUMN tipo_microfone;
ALTER TABLE submissions DROP COLUMN ambiente_gravacao;
ALTER TABLE submissions DROP COLUMN autoavaliacao_qualidade;
