-- Migra IDs antigos do SOTAQUES (lista de 17 baseada na Wikipédia)
-- para a nova taxonomia hierárquica (60+ opções por região).

-- submissions.sotaque_declarado
UPDATE submissions SET sotaque_declarado = 'sudeste-paulista-interior'   WHERE sotaque_declarado = 'caipira';
UPDATE submissions SET sotaque_declarado = 'norte-outro'                  WHERE sotaque_declarado = 'costa-norte';
UPDATE submissions SET sotaque_declarado = 'nordeste-baiano-interior'    WHERE sotaque_declarado = 'baiano';
UPDATE submissions SET sotaque_declarado = 'sudeste-fluminense-interior' WHERE sotaque_declarado = 'fluminense';
UPDATE submissions SET sotaque_declarado = 'sul-gaucho-interior'         WHERE sotaque_declarado = 'gaucho';
UPDATE submissions SET sotaque_declarado = 'sudeste-mineiro-centro-leste' WHERE sotaque_declarado = 'mineiro';
UPDATE submissions SET sotaque_declarado = 'nordeste-sertanejo'          WHERE sotaque_declarado = 'nordestino';
UPDATE submissions SET sotaque_declarado = 'norte-outro'                  WHERE sotaque_declarado = 'nortista';
UPDATE submissions SET sotaque_declarado = 'sudeste-paulistano'          WHERE sotaque_declarado = 'paulistano';
UPDATE submissions SET sotaque_declarado = 'nordeste-sertanejo'          WHERE sotaque_declarado = 'sertanejo';
UPDATE submissions SET sotaque_declarado = 'sul-outro'                    WHERE sotaque_declarado = 'sulista';
UPDATE submissions SET sotaque_declarado = 'sul-catarinense-floripa'     WHERE sotaque_declarado = 'florianopolitano';
UPDATE submissions SET sotaque_declarado = 'sudeste-carioca-rio'         WHERE sotaque_declarado = 'carioca';
UPDATE submissions SET sotaque_declarado = 'co-brasiliense'              WHERE sotaque_declarado = 'brasiliense';
UPDATE submissions SET sotaque_declarado = 'norte-serra-amazonica'       WHERE sotaque_declarado = 'serra-amazonica';
UPDATE submissions SET sotaque_declarado = 'nordeste-pernambucano-recife' WHERE sotaque_declarado = 'recifense';
UPDATE submissions SET sotaque_declarado = 'outro-misto'                 WHERE sotaque_declarado = 'outro';

-- submission_speakers.sotaque (mesmos mapeamentos)
UPDATE submission_speakers SET sotaque = 'sudeste-paulista-interior'   WHERE sotaque = 'caipira';
UPDATE submission_speakers SET sotaque = 'norte-outro'                  WHERE sotaque = 'costa-norte';
UPDATE submission_speakers SET sotaque = 'nordeste-baiano-interior'    WHERE sotaque = 'baiano';
UPDATE submission_speakers SET sotaque = 'sudeste-fluminense-interior' WHERE sotaque = 'fluminense';
UPDATE submission_speakers SET sotaque = 'sul-gaucho-interior'         WHERE sotaque = 'gaucho';
UPDATE submission_speakers SET sotaque = 'sudeste-mineiro-centro-leste' WHERE sotaque = 'mineiro';
UPDATE submission_speakers SET sotaque = 'nordeste-sertanejo'          WHERE sotaque = 'nordestino';
UPDATE submission_speakers SET sotaque = 'norte-outro'                  WHERE sotaque = 'nortista';
UPDATE submission_speakers SET sotaque = 'sudeste-paulistano'          WHERE sotaque = 'paulistano';
UPDATE submission_speakers SET sotaque = 'nordeste-sertanejo'          WHERE sotaque = 'sertanejo';
UPDATE submission_speakers SET sotaque = 'sul-outro'                    WHERE sotaque = 'sulista';
UPDATE submission_speakers SET sotaque = 'sul-catarinense-floripa'     WHERE sotaque = 'florianopolitano';
UPDATE submission_speakers SET sotaque = 'sudeste-carioca-rio'         WHERE sotaque = 'carioca';
UPDATE submission_speakers SET sotaque = 'co-brasiliense'              WHERE sotaque = 'brasiliense';
UPDATE submission_speakers SET sotaque = 'norte-serra-amazonica'       WHERE sotaque = 'serra-amazonica';
UPDATE submission_speakers SET sotaque = 'nordeste-pernambucano-recife' WHERE sotaque = 'recifense';
UPDATE submission_speakers SET sotaque = 'outro-misto'                 WHERE sotaque = 'outro';
