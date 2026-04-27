-- Padroniza códigos de sotaques "grande X" no formato gde_<cidade>.
-- Mantém abreviações já consagradas: bh, rio, poa, floripa.

-- submissions.sotaque_declarado
UPDATE submissions SET sotaque_declarado = 'norte-amapaense-gde_macapa'      WHERE sotaque_declarado = 'norte-amapaense-macapa';
UPDATE submissions SET sotaque_declarado = 'norte-amazonense-gde_manaus'     WHERE sotaque_declarado = 'norte-amazonense-manauara';
UPDATE submissions SET sotaque_declarado = 'norte-paraense-gde_belem'        WHERE sotaque_declarado = 'norte-paraense-belenense';
UPDATE submissions SET sotaque_declarado = 'nordeste-alagoano-gde_maceio'    WHERE sotaque_declarado = 'nordeste-alagoano-maceio';
UPDATE submissions SET sotaque_declarado = 'nordeste-baiano-gde_salvador'    WHERE sotaque_declarado = 'nordeste-baiano-salvador';
UPDATE submissions SET sotaque_declarado = 'nordeste-cearense-gde_fortaleza' WHERE sotaque_declarado = 'nordeste-cearense-fortaleza';
UPDATE submissions SET sotaque_declarado = 'nordeste-maranhense-gde_saoluis' WHERE sotaque_declarado = 'nordeste-maranhense-saoluis';
UPDATE submissions SET sotaque_declarado = 'nordeste-paraibano-gde_joaopessoa' WHERE sotaque_declarado = 'nordeste-paraibano-joaopessoa';
UPDATE submissions SET sotaque_declarado = 'nordeste-pernambucano-gde_recife' WHERE sotaque_declarado = 'nordeste-pernambucano-recife';
UPDATE submissions SET sotaque_declarado = 'nordeste-piauiense-gde_teresina' WHERE sotaque_declarado = 'nordeste-piauiense-teresina';
UPDATE submissions SET sotaque_declarado = 'nordeste-potiguar-gde_natal'     WHERE sotaque_declarado = 'nordeste-potiguar-natal';
UPDATE submissions SET sotaque_declarado = 'nordeste-sergipano-gde_aracaju'  WHERE sotaque_declarado = 'nordeste-sergipano-aracaju';
UPDATE submissions SET sotaque_declarado = 'co-goiano-gde_goiania'           WHERE sotaque_declarado = 'co-goiano-goiania';
UPDATE submissions SET sotaque_declarado = 'co-mato-grossense-gde_cuiaba'    WHERE sotaque_declarado = 'co-mato-grossense-cuiaba';
UPDATE submissions SET sotaque_declarado = 'co-sul-mato-grossense-gde_campogrande' WHERE sotaque_declarado = 'co-sul-mato-grossense-campo-grande';
UPDATE submissions SET sotaque_declarado = 'sudeste-capixaba-gde_vitoria'    WHERE sotaque_declarado = 'sudeste-capixaba-vitoria';
UPDATE submissions SET sotaque_declarado = 'sudeste-paulista-gde_saopaulo'   WHERE sotaque_declarado = 'sudeste-paulista-saopaulo';
UPDATE submissions SET sotaque_declarado = 'sul-paranaense-gde_curitiba'     WHERE sotaque_declarado = 'sul-paranaense-curitiba';

-- submission_speakers.sotaque
UPDATE submission_speakers SET sotaque = 'norte-amapaense-gde_macapa'      WHERE sotaque = 'norte-amapaense-macapa';
UPDATE submission_speakers SET sotaque = 'norte-amazonense-gde_manaus'     WHERE sotaque = 'norte-amazonense-manauara';
UPDATE submission_speakers SET sotaque = 'norte-paraense-gde_belem'        WHERE sotaque = 'norte-paraense-belenense';
UPDATE submission_speakers SET sotaque = 'nordeste-alagoano-gde_maceio'    WHERE sotaque = 'nordeste-alagoano-maceio';
UPDATE submission_speakers SET sotaque = 'nordeste-baiano-gde_salvador'    WHERE sotaque = 'nordeste-baiano-salvador';
UPDATE submission_speakers SET sotaque = 'nordeste-cearense-gde_fortaleza' WHERE sotaque = 'nordeste-cearense-fortaleza';
UPDATE submission_speakers SET sotaque = 'nordeste-maranhense-gde_saoluis' WHERE sotaque = 'nordeste-maranhense-saoluis';
UPDATE submission_speakers SET sotaque = 'nordeste-paraibano-gde_joaopessoa' WHERE sotaque = 'nordeste-paraibano-joaopessoa';
UPDATE submission_speakers SET sotaque = 'nordeste-pernambucano-gde_recife' WHERE sotaque = 'nordeste-pernambucano-recife';
UPDATE submission_speakers SET sotaque = 'nordeste-piauiense-gde_teresina' WHERE sotaque = 'nordeste-piauiense-teresina';
UPDATE submission_speakers SET sotaque = 'nordeste-potiguar-gde_natal'     WHERE sotaque = 'nordeste-potiguar-natal';
UPDATE submission_speakers SET sotaque = 'nordeste-sergipano-gde_aracaju'  WHERE sotaque = 'nordeste-sergipano-aracaju';
UPDATE submission_speakers SET sotaque = 'co-goiano-gde_goiania'           WHERE sotaque = 'co-goiano-goiania';
UPDATE submission_speakers SET sotaque = 'co-mato-grossense-gde_cuiaba'    WHERE sotaque = 'co-mato-grossense-cuiaba';
UPDATE submission_speakers SET sotaque = 'co-sul-mato-grossense-gde_campogrande' WHERE sotaque = 'co-sul-mato-grossense-campo-grande';
UPDATE submission_speakers SET sotaque = 'sudeste-capixaba-gde_vitoria'    WHERE sotaque = 'sudeste-capixaba-vitoria';
UPDATE submission_speakers SET sotaque = 'sudeste-paulista-gde_saopaulo'   WHERE sotaque = 'sudeste-paulista-saopaulo';
UPDATE submission_speakers SET sotaque = 'sul-paranaense-gde_curitiba'     WHERE sotaque = 'sul-paranaense-curitiba';
