ALTER TABLE submissions ADD COLUMN num_falantes INTEGER NOT NULL DEFAULT 1;

CREATE TABLE submission_speakers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT    NOT NULL REFERENCES submissions(id),
  speaker_index INTEGER NOT NULL CHECK (speaker_index BETWEEN 2 AND 5),
  sotaque       TEXT,
  UNIQUE (submission_id, speaker_index)
);
