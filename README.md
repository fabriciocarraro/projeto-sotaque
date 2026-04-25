# Projeto SOTAQUE

> Dataset aberto de vozes em português brasileiro, com diversidade de sotaques regionais.

🌐 **[sotaque.ia.br](https://sotaque.ia.br)**

---

## O que é

Hoje, quando você ouve uma IA falar em português, ela quase sempre soa igual: neutra, sem cor regional. E quando alguém com sotaque caipira, baiano ou nortista tenta usar uma assistente de voz, costuma ser mal compreendido. Os dois problemas têm a mesma raiz: **faltam vozes brasileiras diversas nos dados que treinam essas tecnologias**.

A maioria dos modelos de fala em português hoje foi treinada com vozes em inglês ou em português europeu. O pouco que existe em PT-BR concentra-se em sotaques urbanos do sudeste, especialmente paulistano e carioca. O SOTAQUE existe para corrigir esse desequilíbrio, com uma base aberta, diversa e documentada que qualquer pessoa pode usar para treinar e avaliar tecnologias de fala como sintetizadores de voz, audiobooks, assistentes e transcrições automáticas.

A coleta é **voluntária e por crowdsourcing**. Cada brasileiro maior de 18 anos pode contribuir com a própria voz pelo site, leva uns 2 minutos.

## Por que open source

Datasets de voz em português hoje pertencem majoritariamente às big techs e ficam fechados, restringindo pesquisa e inovação no Brasil. O SOTAQUE é inspirado no [Mozilla Common Voice](https://commonvoice.mozilla.org/), o maior projeto público do gênero no mundo, e adaptado para a realidade do português brasileiro com foco explícito em **diversidade regional**.

O dataset será publicado no [Hugging Face](https://huggingface.co/) sob licença **CDLA-Permissive-2.0** (uso amplo, inclusive comercial). Universidades públicas, pesquisadores independentes, startups, escolas e qualquer pessoa interessada poderão baixar, usar e redistribuir.

## Como participar

**Pelo site**: [sotaque.ia.br/contribuir](https://sotaque.ia.br/contribuir). Você grava direto pelo navegador (ou envia um áudio que já tinha gravado, inclusive áudio antigo do WhatsApp), conta um pouco sobre você (sotaque, região, escolaridade) e marca o consentimento. Pronto.

**Pelo WhatsApp** (em breve): bot dedicado para receber áudios de forma ainda mais simples, direto pelo chat.

## Status e metas

O contador no topo do [site](https://sotaque.ia.br) mostra o progresso ao vivo. As metas declaradas:

- 🎯 **Meta inicial: 1.000 horas** — escala suficiente para começar a treinar e avaliar modelos brasileiros.
- 🎯 **Meta final: 10.000 horas** — escala em que o dataset passa a ser referência aberta para toda a comunidade de fala em português.

Cada áudio recebido passa por transcrição automática (via [ElevenLabs Scribe v2](https://elevenlabs.io/speech-to-text)) e curadoria simples antes de entrar nas próximas versões publicadas do dataset.

## Privacidade e LGPD

O que **é** publicado no dataset: a gravação de áudio, a transcrição, e os metadados que você autorizar (sotaque declarado, região, faixa etária, gênero, escolaridade) — sempre associados a um pseudônimo público.

O que **nunca** é publicado: e-mail, IP, user-agent, ou qualquer evidência de consentimento. Esses dados ficam em base separada, retidos apenas pelos prazos legais.

Você pode **revogar seu consentimento** a qualquer momento em [sotaque.ia.br/revogacao](https://sotaque.ia.br/revogacao). Importante: a revogação interrompe usos futuros, mas cópias já redistribuídas e modelos já treinados podem não ser totalmente removidos.

Detalhes completos no [Termo de Consentimento e Aviso de Privacidade](https://sotaque.ia.br/termo).

## Quem está por trás

O Projeto é mantido por **Fabrício Carraro**, autor do best-seller [Inteligência Artificial e ChatGPT](https://www.casadocodigo.com.br/products/livro-inteligencia-artificial-chatgpt) (Casa do Código) e criador do podcast *IA Sob Controle*, número 1 do Brasil na categoria Tecnologia no Spotify e no Apple Podcasts.

Contato para privacidade, exercício de direitos ou parcerias: **[contato@fabriciocarraro.com.br](mailto:contato@fabriciocarraro.com.br)**

## Tecnologia

Site estático em [Astro](https://astro.build/) + ilhas React, hospedado em [Cloudflare Pages](https://pages.cloudflare.com/). Backend serverless via Pages Functions, com [D1](https://developers.cloudflare.com/d1/) (SQLite) para metadados e [R2](https://developers.cloudflare.com/r2/) para áudios. Transcrição assíncrona via webhook do [ElevenLabs Scribe v2](https://elevenlabs.io/speech-to-text). Anti-spam via [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/).

O código deste site é aberto. Contribuições via Pull Request são bem-vindas — abra uma issue antes pra discutir mudanças significativas.
