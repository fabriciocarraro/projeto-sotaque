ALTER TABLE submissions ADD COLUMN transcricao_status TEXT;
ALTER TABLE submissions ADD COLUMN deepgram_request_id TEXT;

UPDATE submissions SET transcricao_status = 'ok' WHERE transcricao IS NOT NULL;
UPDATE submissions SET transcricao_status = 'desconhecido' WHERE transcricao IS NULL;
