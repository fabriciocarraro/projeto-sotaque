import { ESCOLARIDADES, FAIXAS_ETARIAS, GENEROS, SOTAQUES } from "../../src/lib/opcoes";

export const COPY = {
  boasVindas:
    "Olá! Sou o assistente do *Projeto SOTAQUE* 🇧🇷\n\n" +
    "Estamos reunindo um dataset aberto de vozes brasileiras para melhorar as tecnologias de fala em português — assistentes de voz, legendagem, síntese.\n\n" +
    "Antes de começar, dá uma olhada no Termo de Consentimento: https://sotaque.ia.br/termo\n\n" +
    "Ao continuar, você confirma que: tem 18+ anos, está no Brasil, vai contribuir com a própria voz, e aceita a publicação sob licença aberta (CDLA-Permissive-2.0).",

  aposAceite:
    "Ótimo! Agora é só me enviar *um áudio da sua voz* 🎙️\n\n" +
    "Pode ser uma gravação nova feita agora, ou um áudio antigo que você enviou pra alguém — desde que só tenha a sua voz, sem outras pessoas.",

  recusou:
    "Tudo bem! Se mudar de ideia, é só me chamar de novo. Obrigado pelo interesse no Projeto SOTAQUE. 🙏",

  audioRecebido: (duracao: string) =>
    `Recebi seu áudio de *${duracao}* ✅\n\n` +
    "Agora vou te fazer algumas perguntas rápidas (uns 2 minutos). Pode responder *por texto ou mandando outro áudio* — tanto faz.",

  perguntaPseudonimo:
    "Primeiro: como você quer ser identificado no dataset? 🙂\n\n" +
    "Pode ser um apelido — não precisa ser seu nome real.",

  perguntaEmail:
    "Qual seu *e-mail*? 📧\n\n" +
    "É usado apenas para contato e eventual revogação de consentimento. Não é publicado no dataset.",

  emailInvalido: "Esse e-mail não parece válido. Pode conferir e enviar de novo?",

  perguntaFaixaEtaria: "Qual sua *faixa etária*?",
  perguntaGenero: "Qual seu *gênero*?",
  perguntaEscolaridade: "Qual seu *nível máximo de escolaridade*?",

  perguntaEstado:
    "Em qual *estado* você cresceu ou formou seu sotaque?\n\n" +
    "Pode escrever o nome (ex: São Paulo) ou a sigla (ex: SP).",

  estadoInvalido:
    "Não consegui identificar o estado. Pode enviar o nome por extenso ou a sigla (ex: *São Paulo* ou *SP*)?",

  perguntaCidade:
    "E a *cidade ou região*? (opcional)\n\n" +
    "Se preferir não informar, envie *PULAR*.",

  perguntaSotaque: "Como você classifica seu *sotaque*?",
  verMaisSotaques: "Mais sotaques",

  sotaqueInvalido:
    "Não identifiquei um sotaque válido. Escolhe uma das opções da lista, por favor.",

  confirmacao: (m: Record<string, string>) =>
    "Conferindo seus dados:\n\n" +
    `• *Pseudônimo*: ${m.pseudonimo}\n` +
    `• *E-mail*: ${m.email}\n` +
    `• *Faixa etária*: ${m.faixa_etaria}\n` +
    `• *Gênero*: ${m.genero}\n` +
    `• *Escolaridade*: ${m.escolaridade}\n` +
    `• *Sotaque*: ${m.sotaque}\n` +
    `• *Estado*: ${m.estado}\n` +
    `• *Cidade*: ${m.cidade || "—"}\n\n` +
    "Tá tudo certo?",

  sucesso: (id: string) =>
    `Pronto! 🙌 Sua contribuição *#${id.slice(0, 8).toUpperCase()}* foi registrada.\n\n` +
    "Obrigado por ajudar o português brasileiro a ser melhor representado nas tecnologias de fala.\n\n" +
    "Se quiser contribuir de novo, é só mandar outro áudio. 🎙️",

  fallbackTextoSemAudio:
    "Pra começar, preciso que você me envie um *áudio com sua voz* 🎙️. Pode ser uma gravação curta ou longa, como preferir.",

  fallbackMidiaNaoSuportada:
    "Recebi sua mensagem, mas por aqui eu processo apenas *áudios*. Pode me enviar um áudio com sua voz? 🎙️",

  fallbackNaoEntendi:
    "Não consegui entender sua resposta. Pode tentar de novo?",

  audioDuplicado:
    "Esse mesmo áudio já foi enviado antes. Se quiser contribuir com mais uma amostra, grave ou envie um áudio diferente. 🙂",

  erroGenerico:
    "Tivemos um problema ao processar sua última mensagem. Pode tentar de novo em alguns instantes?",
};

export const LISTA_FAIXAS_ETARIAS = FAIXAS_ETARIAS.map((f) => ({ id: f.valor, title: f.rotulo }));
export const LISTA_GENEROS = GENEROS.map((g) => ({ id: g.valor, title: g.rotulo }));
export const LISTA_ESCOLARIDADES = ESCOLARIDADES.map((e) => ({
  id: e.valor,
  title: e.rotulo.length > 24 ? e.rotulo.slice(0, 21) + "…" : e.rotulo,
  description: e.rotulo,
}));

// WhatsApp lista: máximo 10 rows. Dividimos sotaques em duas.
export const SOTAQUES_LISTA_1 = SOTAQUES.slice(0, 9).map((s) => ({
  id: s.valor,
  title: "numero" in s ? `${s.numero}. ${s.rotulo}` : s.rotulo,
}));

export const SOTAQUES_LISTA_2 = SOTAQUES.slice(9).map((s) => ({
  id: s.valor,
  title: "numero" in s ? `${s.numero}. ${s.rotulo}` : s.rotulo,
}));
