ALTER TABLE submissions ADD COLUMN transcricao_provider TEXT;

UPDATE submissions SET transcricao_provider = 'deepgram' WHERE deepgram_request_id IS NOT NULL;
