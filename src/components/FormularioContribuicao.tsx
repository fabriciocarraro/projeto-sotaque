import { useEffect, useMemo, useState, useRef, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import GravadorAudio from "./GravadorAudio";
import {
  AMBIENTES,
  AUDIO_TAMANHO_MAX,
  DISPOSITIVOS,
  ESCOLARIDADES,
  ESTADOS,
  EXTENSOES_PERMITIDAS,
  FAIXAS_ETARIAS,
  GENEROS,
  MICROFONES,
  MIMETYPES_PERMITIDOS,
  QUALIDADE,
  REGIOES,
  REGIOES_SOTAQUE_LABEL,
  SOTAQUES,
} from "../lib/opcoes";
import { submissaoSchema } from "../lib/schema";

type Consent = {
  checkbox_1: boolean;
  checkbox_2: boolean;
  checkbox_3: boolean;
  checkbox_4: boolean;
  checkbox_5: boolean;
  checkbox_6: boolean;
  checkbox_7: boolean;
};

const CONSENT_TEXTOS: Array<{ id: keyof Consent; texto: string }> = [
  {
    id: "checkbox_1",
    texto:
      "Tenho 18 anos ou mais, estou no Brasil e tenho autorização para enviar todas as vozes desta gravação.",
  },
  {
    id: "checkbox_2",
    texto:
      "Li e compreendi o Termo de Consentimento e Aviso de Privacidade.",
  },
  {
    id: "checkbox_3",
    texto:
      "Consinto com a coleta, tratamento e curadoria da minha contribuição para o dataset.",
  },
  {
    id: "checkbox_4",
    texto:
      "Consinto com a publicação aberta e reutilização da minha gravação sob a licença CDLA-Permissive-2.0.",
  },
  {
    id: "checkbox_5",
    texto:
      "Consinto com o uso da minha gravação para treinar e avaliar tecnologias de fala.",
  },
  {
    id: "checkbox_6",
    texto:
      "Entendo que a participação é voluntária e sem remuneração.",
  },
  {
    id: "checkbox_7",
    texto:
      "Entendo que posso revogar meu consentimento, mas que cópias já distribuídas e modelos já treinados não podem ser removidos.",
  },
];

type Props = {
  turnstileSiteKey: string;
  children?: React.ReactNode;
};

const BATCH_MAX = 5;
const STORAGE_KEY = "sotaque:lastSubmission";

type DadosSalvos = {
  pseudonimo?: string;
  email?: string;
  sotaque?: string;
  regiao?: string;
  estado?: string;
  cidade?: string;
  faixaEtaria?: string;
  genero?: string;
  escolaridade?: string;
  dispositivo?: string;
  microfone?: string;
  ambiente?: string;
  numFalantes?: number;
  sotaquesFalantes?: string[];
  escolaridadesFalantes?: string[];
};

const ESTADO_CONSENT_INICIAL: Consent = {
  checkbox_1: false,
  checkbox_2: false,
  checkbox_3: false,
  checkbox_4: false,
  checkbox_5: false,
  checkbox_6: false,
  checkbox_7: false,
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensaoValida(nome: string): boolean {
  const lower = nome.toLowerCase();
  return EXTENSOES_PERMITIDAS.some((ext) => lower.endsWith(ext));
}

function medirDuracaoAudio(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.src = "";
    };
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      cleanup();
      resolve(Number.isFinite(d) && d > 0 ? d : null);
    });
    audio.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });
    audio.src = url;
  });
}

function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}min ${s.toString().padStart(2, "0")}s`;
}

export default function FormularioContribuicao({ turnstileSiteKey, children }: Props) {
  const [pseudonimo, setPseudonimo] = useState("");
  const [email, setEmail] = useState("");

  const [sotaque, setSotaque] = useState("");
  const [regiao, setRegiao] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");

  const [faixaEtaria, setFaixaEtaria] = useState("");
  const [genero, setGenero] = useState("");
  const [escolaridade, setEscolaridade] = useState("");

  const [dispositivo, setDispositivo] = useState("");
  const [microfone, setMicrofone] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [qualidade, setQualidade] = useState("");

  const [numFalantes, setNumFalantes] = useState(1);
  const [sotaquesFalantes, setSotaquesFalantes] = useState<string[]>(["", "", "", ""]);
  const [escolaridadesFalantes, setEscolaridadesFalantes] = useState<string[]>(["", "", "", ""]);

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [duracoes, setDuracoes] = useState<Array<number | null>>([]);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [modoAudio, setModoAudio] = useState<"gravar" | "upload">("gravar");

  const [consent, setConsent] = useState<Consent>(ESTADO_CONSENT_INICIAL);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const [plataforma, setPlataforma] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) setPlataforma("android");
    else if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(ua) && "ontouchend" in document))
      setPlataforma("ios");
  }, []);

  // Pré-preenche dados não-sensíveis a partir da última contribuição (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as DadosSalvos;
      const sotaquesValidos = new Set<string>(SOTAQUES.map((s) => s.valor));
      if (d.pseudonimo) setPseudonimo(d.pseudonimo);
      if (d.email) setEmail(d.email);
      if (d.sotaque && sotaquesValidos.has(d.sotaque)) setSotaque(d.sotaque);
      if (d.regiao) setRegiao(d.regiao);
      if (d.estado) setEstado(d.estado);
      if (d.cidade) setCidade(d.cidade);
      if (d.faixaEtaria) setFaixaEtaria(d.faixaEtaria);
      if (d.genero) setGenero(d.genero);
      if (d.escolaridade) setEscolaridade(d.escolaridade);
      if (d.dispositivo) setDispositivo(d.dispositivo);
      if (d.microfone) setMicrofone(d.microfone);
      if (d.ambiente) setAmbiente(d.ambiente);
      if (typeof d.numFalantes === "number") setNumFalantes(d.numFalantes);
      if (Array.isArray(d.sotaquesFalantes)) {
        setSotaquesFalantes(d.sotaquesFalantes.map((s) => (sotaquesValidos.has(s) ? s : "")));
      }
      if (Array.isArray(d.escolaridadesFalantes)) setEscolaridadesFalantes(d.escolaridadesFalantes);
    } catch {
      // ignore
    }
  }, []);

  // Quando a região muda, reseta o sotaque se ele não pertencer à nova região (nem aos globais)
  useEffect(() => {
    if (!regiao) return;
    if (!sotaque) return;
    const valido = SOTAQUES.some(
      (s) => s.valor === sotaque && (s.regiao === regiao || s.regiao === "outro"),
    );
    if (!valido) setSotaque("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regiao]);

  const [enviando, setEnviando] = useState(false);
  const [progressoEnvio, setProgressoEnvio] = useState<{ atual: number; total: number } | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const tokenResolverRef = useRef<((t: string) => void) | null>(null);

  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const todosConsentimentos = useMemo(
    () => CONSENT_TEXTOS.every(({ id }) => consent[id]),
    [consent],
  );

  const obrigatoriosOk = useMemo(() => {
    return (
      pseudonimo.trim().length >= 2 &&
      /^\S+@\S+\.\S+$/.test(email.trim()) &&
      sotaque &&
      regiao &&
      estado &&
      faixaEtaria &&
      genero &&
      escolaridade &&
      arquivos.length > 0 &&
      !erroArquivo
    );
  }, [pseudonimo, email, sotaque, regiao, estado, faixaEtaria, genero, escolaridade, arquivos, erroArquivo]);

  const podeEnviar =
    obrigatoriosOk && todosConsentimentos && !!turnstileToken && !enviando;

  const listaCheia = arquivos.length >= BATCH_MAX;

  function adicionarArquivo(file: File, duracaoConhecida: number | null = null): string | null {
    if (arquivos.length >= BATCH_MAX) {
      return `Limite de ${BATCH_MAX} áudios por envio.`;
    }
    if (file.size > AUDIO_TAMANHO_MAX) {
      return `"${file.name}" passa de ${formatarTamanho(AUDIO_TAMANHO_MAX)}.`;
    }
    if (!extensaoValida(file.name)) {
      return `Extensão não suportada em "${file.name}". Use: ${EXTENSOES_PERMITIDAS.join(", ")}.`;
    }
    if (
      file.type &&
      file.type !== "" &&
      !MIMETYPES_PERMITIDOS.includes(file.type as (typeof MIMETYPES_PERMITIDOS)[number])
    ) {
      return `Tipo de arquivo não suportado em "${file.name}" (${file.type}).`;
    }
    setArquivos((prev) => [...prev, file]);
    setDuracoes((prev) => [...prev, duracaoConhecida]);
    return null;
  }

  function removerArquivo(idx: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
    setDuracoes((prev) => prev.filter((_, i) => i !== idx));
    setErroArquivo(null);
  }

  function onArquivoGravado(file: File, duracaoGravada: number) {
    setErroArquivo(null);
    const erro = adicionarArquivo(file, duracaoGravada > 0 ? duracaoGravada : null);
    if (erro) setErroArquivo(erro);
  }

  async function onArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files ?? []);
    setErroArquivo(null);
    if (fs.length === 0) return;

    const espacoLivre = BATCH_MAX - arquivos.length;
    const aProcessar = fs.slice(0, espacoLivre);
    const erros: string[] = [];
    if (fs.length > espacoLivre) {
      erros.push(`Só dá pra adicionar mais ${espacoLivre} arquivo(s) (limite ${BATCH_MAX}).`);
    }
    for (const f of aProcessar) {
      const erro = adicionarArquivo(f);
      if (erro) {
        erros.push(erro);
        continue;
      }
      // mede duração após adicionar (assíncrono mas não bloqueia)
      medirDuracaoAudio(f).then((d) => {
        setDuracoes((prev) => {
          const copia = [...prev];
          // acha o índice do arquivo recém-adicionado pela referência
          const idx = arquivos.length + aProcessar.indexOf(f);
          if (idx < copia.length) copia[idx] = d;
          return copia;
        });
      });
    }
    if (erros.length) setErroArquivo(erros.join(" "));
    // limpa o input pra permitir reescolher
    e.target.value = "";
  }

  async function awaitFreshTurnstileToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      tokenResolverRef.current = resolve;
      turnstileRef.current?.reset();
      setTimeout(() => {
        if (tokenResolverRef.current === resolve) {
          tokenResolverRef.current = null;
          reject(new Error("Tempo esgotado aguardando verificação anti-spam"));
        }
      }, 20000);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErros({});
    setErroGeral(null);

    if (arquivos.length === 0) {
      setErroArquivo("Adicione ao menos um arquivo de áudio.");
      return;
    }

    const dadosBase = {
      pseudonimo: pseudonimo.trim(),
      email: email.trim(),
      sotaque_declarado: sotaque,
      regiao_socializacao: regiao,
      estado_principal: estado,
      cidade_microrregiao: cidade.trim() || undefined,
      faixa_etaria: faixaEtaria,
      genero: genero,
      escolaridade: escolaridade,
      tipo_dispositivo: dispositivo || undefined,
      tipo_microfone: microfone || undefined,
      ambiente_gravacao: ambiente || undefined,
      autoavaliacao_qualidade: qualidade ? Number(qualidade) : undefined,
      falantes: [
        { sotaque: sotaque || undefined, escolaridade: escolaridade || undefined },
        ...sotaquesFalantes.slice(0, numFalantes - 1).map((s, i) => ({
          sotaque: s || undefined,
          escolaridade: escolaridadesFalantes[i] || undefined,
        })),
      ],
      consentimento: consent,
    };

    setEnviando(true);
    setProgressoEnvio({ atual: 0, total: arquivos.length });

    const idsCriados: string[] = [];
    const falhas: Array<{ nome: string; erro: string }> = [];
    let tokenAtual = turnstileToken;

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const duracao = duracoes[i];

        setProgressoEnvio({ atual: i + 1, total: arquivos.length });

        const payload = {
          ...dadosBase,
          audio_duracao_segundos: duracao ?? undefined,
          turnstileToken: tokenAtual,
        };

        const resultado = submissaoSchema.safeParse(payload);
        if (!resultado.success) {
          const mapa: Record<string, string> = {};
          for (const issue of resultado.error.issues) {
            const caminho = issue.path.join(".");
            if (!mapa[caminho]) mapa[caminho] = issue.message;
          }
          setErros(mapa);
          setErroGeral("Há campos inválidos. Revise os itens destacados.");
          break;
        }

        try {
          const fd = new FormData();
          fd.append("audio", arquivo, arquivo.name);
          fd.append("dados", JSON.stringify(resultado.data));

          const resp = await fetch("/api/submissions", { method: "POST", body: fd });

          if (!resp.ok) {
            let msg = "Erro ao enviar.";
            try {
              const j = (await resp.json()) as { error?: string };
              if (j.error) msg = j.error;
            } catch {
              // ignore
            }
            falhas.push({ nome: arquivo.name, erro: msg });
          } else {
            const j = (await resp.json()) as { id: string };
            idsCriados.push(j.id);
          }
        } catch (err) {
          falhas.push({
            nome: arquivo.name,
            erro: err instanceof Error ? err.message : "Erro desconhecido.",
          });
        }

        // Pra próximos uploads no batch, precisa de token fresh do Turnstile
        if (i < arquivos.length - 1) {
          try {
            tokenAtual = await awaitFreshTurnstileToken();
          } catch (err) {
            setErroGeral(
              err instanceof Error ? err.message : "Falha ao renovar verificação anti-spam.",
            );
            break;
          }
        }
      }

      // Salva metadados pra próxima contribuição
      if (idsCriados.length > 0) {
        try {
          const dadosParaSalvar: DadosSalvos = {
            pseudonimo: pseudonimo.trim(),
            email: email.trim(),
            sotaque,
            regiao,
            estado,
            cidade: cidade.trim() || undefined,
            faixaEtaria,
            genero,
            escolaridade,
            dispositivo,
            microfone,
            ambiente,
            numFalantes,
            sotaquesFalantes,
            escolaridadesFalantes,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosParaSalvar));
        } catch {
          // ignore
        }
      }

      if (falhas.length === 0 && idsCriados.length > 0) {
        // todos OK
        window.location.href = `/sucesso?id=${encodeURIComponent(idsCriados[0])}${idsCriados.length > 1 ? `&total=${idsCriados.length}` : ""}`;
      } else if (idsCriados.length > 0) {
        // sucesso parcial
        const detalhes = falhas.map((f) => `• ${f.nome}: ${f.erro}`).join("\n");
        setErroGeral(
          `${idsCriados.length} de ${arquivos.length} áudio(s) enviados. Falhas:\n${detalhes}`,
        );
        // remove só os que deram certo
        const nomesFalha = new Set(falhas.map((f) => f.nome));
        setArquivos((prev) => prev.filter((a) => nomesFalha.has(a.name)));
        setDuracoes((prev) =>
          prev.filter((_, i) => arquivos[i] && nomesFalha.has(arquivos[i].name)),
        );
      } else {
        // todas falharam
        const detalhes = falhas.map((f) => `• ${f.nome}: ${f.erro}`).join("\n");
        setErroGeral(`Nenhum áudio enviado. Detalhes:\n${detalhes}`);
      }
    } finally {
      setEnviando(false);
      setProgressoEnvio(null);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  }

  function setSotaqueFalante(idx: number, valor: string) {
    setSotaquesFalantes((prev) => {
      const copia = [...prev];
      copia[idx] = valor;
      return copia;
    });
  }

  function setEscolaridadeFalante(idx: number, valor: string) {
    setEscolaridadesFalantes((prev) => {
      const copia = [...prev];
      copia[idx] = valor;
      return copia;
    });
  }

  function setConsentField(id: keyof Consent, v: boolean) {
    setConsent((c) => ({ ...c, [id]: v }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8" noValidate>
      {/* Seção 1 */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">1. Identificação</h2>
          <p className="mt-1 text-sm text-verde-800">Seus dados de contato e pseudônimo público.</p>
        </div>
        <Campo
          id="pseudonimo"
          rotulo="Pseudônimo público"
          ajuda="Apelido que poderá aparecer associado à sua contribuição no dataset. Evite usar seu nome real completo."
          obrigatorio
          erro={erros["pseudonimo"]}
        >
          <input
            id="pseudonimo"
            type="text"
            value={pseudonimo}
            onChange={(e) => setPseudonimo(e.target.value)}
            maxLength={60}
            className={inputClasse(!!erros["pseudonimo"])}
            autoComplete="off"
          />
        </Campo>
        <Campo
          id="email"
          rotulo="E-mail"
          ajuda="Usado apenas para contato, confirmação e revogação de consentimento. Não é publicado no dataset."
          obrigatorio
          erro={erros["email"]}
        >
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className={inputClasse(!!erros["email"])}
            autoComplete="email"
          />
        </Campo>
      </section>

      {/* Mapa de dialetos (referência para a próxima seção) */}
      {children && (
        <section className="space-y-3 border-b border-stone-200 pb-8">
          <div>
            <h3 className="text-sm font-semibold text-verde-900">Alguns dialetos do português brasileiro</h3>
          </div>
          {children}
        </section>
      )}

      {/* Seção 2 */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">2. Perfil linguístico</h2>
          <p className="mt-1 text-sm text-verde-800">Ajude a caracterizar a sua origem e o seu sotaque.</p>
        </div>

        <Campo
          id="regiao"
          rotulo="Região do Brasil onde você cresceu / formou seu sotaque"
          obrigatorio
          erro={erros["regiao_socializacao"]}
        >
          <select
            id="regiao"
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            className={inputClasse(!!erros["regiao_socializacao"])}
          >
            <option value="">Selecione…</option>
            {REGIOES.map((r) => (
              <option key={r.valor} value={r.valor}>{r.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo
          id="estado"
          rotulo="Estado principal onde cresceu"
          obrigatorio
          erro={erros["estado_principal"]}
        >
          <select
            id="estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={inputClasse(!!erros["estado_principal"])}
          >
            <option value="">Selecione…</option>
            {ESTADOS.map((uf) => (
              <option key={uf.valor} value={uf.valor}>{uf.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo
          id="cidade"
          rotulo="Cidade ou microrregião"
          ajuda="Opcional. Pode deixar em branco se preferir."
          erro={erros["cidade_microrregiao"]}
        >
          <input
            id="cidade"
            type="text"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            maxLength={120}
            className={inputClasse(!!erros["cidade_microrregiao"])}
          />
        </Campo>

        <Campo
          id="sotaque"
          rotulo="Sotaque declarado (com base na região selecionada acima)"
          ajuda={
            regiao
              ? "Escolha o sotaque mais próximo. As 3 últimas opções valem para qualquer região."
              : "Selecione a região acima para ver os sotaques disponíveis."
          }
          obrigatorio
          erro={erros["sotaque_declarado"]}
        >
          <select
            id="sotaque"
            value={sotaque}
            onChange={(e) => setSotaque(e.target.value)}
            disabled={!regiao}
            className={inputClasse(!!erros["sotaque_declarado"])}
          >
            <option value="">
              {regiao ? "Selecione…" : "Selecione a região acima primeiro"}
            </option>
            {regiao &&
              SOTAQUES.filter((s) => s.regiao === regiao).map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            {regiao && (
              <optgroup label="── Casos especiais ──">
                {SOTAQUES.filter((s) => s.regiao === "outro").map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Campo>
      </section>

      {/* Seção 3 */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">3. Perfil demográfico</h2>
          <p className="mt-1 text-sm text-verde-800">Informações autoidentificadas.</p>
        </div>
        <Campo
          id="faixa"
          rotulo="Faixa etária"
          obrigatorio
          erro={erros["faixa_etaria"]}
        >
          <select
            id="faixa"
            value={faixaEtaria}
            onChange={(e) => setFaixaEtaria(e.target.value)}
            className={inputClasse(!!erros["faixa_etaria"])}
          >
            <option value="">Selecione…</option>
            {FAIXAS_ETARIAS.map((f) => (
              <option key={f.valor} value={f.valor}>{f.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo
          id="genero"
          rotulo="Gênero"
          obrigatorio
          erro={erros["genero"]}
        >
          <select
            id="genero"
            value={genero}
            onChange={(e) => setGenero(e.target.value)}
            className={inputClasse(!!erros["genero"])}
          >
            <option value="">Selecione…</option>
            {GENEROS.map((g) => (
              <option key={g.valor} value={g.valor}>{g.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo
          id="escolaridade"
          rotulo="Nível de escolaridade (máximo concluído ou em curso)"
          obrigatorio
          erro={erros["escolaridade"]}
        >
          <select
            id="escolaridade"
            value={escolaridade}
            onChange={(e) => setEscolaridade(e.target.value)}
            className={inputClasse(!!erros["escolaridade"])}
          >
            <option value="">Selecione…</option>
            {ESCOLARIDADES.map((e) => (
              <option key={e.valor} value={e.valor}>{e.rotulo}</option>
            ))}
          </select>
        </Campo>
      </section>

      {/* Seção 4 */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">4. Sobre a gravação</h2>
          <p className="mt-1 text-sm text-verde-800">
            Campos opcionais que nos ajudam a entender a diversidade de equipamentos e ambientes.
          </p>
        </div>

        <Campo id="dispositivo" rotulo="Tipo de dispositivo" erro={erros["tipo_dispositivo"]}>
          <select
            id="dispositivo"
            value={dispositivo}
            onChange={(e) => setDispositivo(e.target.value)}
            className={inputClasse(!!erros["tipo_dispositivo"])}
          >
            <option value="">—</option>
            {DISPOSITIVOS.map((d) => (
              <option key={d.valor} value={d.valor}>{d.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo id="microfone" rotulo="Tipo de microfone" erro={erros["tipo_microfone"]}>
          <select
            id="microfone"
            value={microfone}
            onChange={(e) => setMicrofone(e.target.value)}
            className={inputClasse(!!erros["tipo_microfone"])}
          >
            <option value="">—</option>
            {MICROFONES.map((m) => (
              <option key={m.valor} value={m.valor}>{m.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo id="ambiente" rotulo="Ambiente de gravação" erro={erros["ambiente_gravacao"]}>
          <select
            id="ambiente"
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
            className={inputClasse(!!erros["ambiente_gravacao"])}
          >
            <option value="">—</option>
            {AMBIENTES.map((a) => (
              <option key={a.valor} value={a.valor}>{a.rotulo}</option>
            ))}
          </select>
        </Campo>

        <Campo
          id="qualidade"
          rotulo="Autoavaliação de qualidade do áudio"
          ajuda="1 = ruim · 5 = excelente."
          erro={erros["autoavaliacao_qualidade"]}
        >
          <div className="flex items-center gap-3" role="radiogroup" aria-label="Autoavaliação de qualidade">
            {QUALIDADE.map((n) => (
              <label key={n} className="flex cursor-pointer items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm has-[:checked]:border-verde-600 has-[:checked]:bg-verde-50">
                <input
                  type="radio"
                  name="qualidade"
                  value={n}
                  checked={qualidade === String(n)}
                  onChange={(e) => setQualidade(e.target.value)}
                  className="accent-verde-600"
                />
                <span>{n}</span>
              </label>
            ))}
            {qualidade && (
              <button
                type="button"
                onClick={() => setQualidade("")}
                className="text-xs text-verde-800/80 underline hover:text-verde-900">
                limpar
              </button>
            )}
          </div>
        </Campo>
      </section>

      {/* Seção 5 — falantes */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">5. Falantes na gravação</h2>
          <p className="mt-1 text-sm text-verde-800">
            Se a gravação tiver mais de uma pessoa (podcast, reunião, conversa), informe quantos falantes participam.
          </p>
        </div>

        <Campo
          id="num_falantes"
          rotulo="Quantas pessoas estão no áudio?"
          obrigatorio
          erro={erros["falantes"]}
        >
          <select
            id="num_falantes"
            value={numFalantes}
            onChange={(e) => setNumFalantes(Number(e.target.value))}
            className={inputClasse(!!erros["falantes"])}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 pessoa (só eu)" : `${n} pessoas`}
              </option>
            ))}
          </select>
        </Campo>

        {numFalantes >= 2 && (
          <div className="space-y-3">
            <p className="text-xs text-verde-800/80">
              Falante 1 é você — sotaque já informado acima. Informe o sotaque dos demais, se souber.
            </p>
            {Array.from({ length: numFalantes - 1 }, (_, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-stone-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-verde-800/70">Falante {i + 2}</p>
                <Campo
                  id={`sotaque_falante_${i + 2}`}
                  rotulo="Sotaque"
                  ajuda="Opcional — deixe em branco se não souber."
                  erro={erros[`falantes.${i + 1}.sotaque`]}
                >
                  <select
                    id={`sotaque_falante_${i + 2}`}
                    value={sotaquesFalantes[i]}
                    onChange={(e) => setSotaqueFalante(i, e.target.value)}
                    className={inputClasse(!!erros[`falantes.${i + 1}.sotaque`])}
                  >
                    <option value="">Não sei / prefiro não dizer</option>
                    {Object.keys(REGIOES_SOTAQUE_LABEL).map((regKey) => {
                      const opcoes = SOTAQUES.filter((s) => s.regiao === regKey);
                      if (opcoes.length === 0) return null;
                      return (
                        <optgroup key={regKey} label={REGIOES_SOTAQUE_LABEL[regKey]}>
                          {opcoes.map((s) => (
                            <option key={s.valor} value={s.valor}>
                              {s.rotulo}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </Campo>
                <Campo
                  id={`escolaridade_falante_${i + 2}`}
                  rotulo="Escolaridade"
                  ajuda="Opcional — deixe em branco se não souber."
                  erro={erros[`falantes.${i + 1}.escolaridade`]}
                >
                  <select
                    id={`escolaridade_falante_${i + 2}`}
                    value={escolaridadesFalantes[i]}
                    onChange={(e) => setEscolaridadeFalante(i, e.target.value)}
                    className={inputClasse(!!erros[`falantes.${i + 1}.escolaridade`])}
                  >
                    <option value="">Não sei / prefiro não dizer</option>
                    {ESCOLARIDADES.map((e) => (
                      <option key={e.valor} value={e.valor}>{e.rotulo}</option>
                    ))}
                  </select>
                </Campo>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção 6 */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">6. Arquivo(s) de áudio</h2>
          <p className="mt-1 text-sm text-verde-800">
            Grave direto pelo navegador ou envie até {BATCH_MAX} arquivos existentes (cada um até {formatarTamanho(AUDIO_TAMANHO_MAX)}).
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setModoAudio("gravar")}
            className={`rounded-md px-4 py-1.5 font-medium transition ${
              modoAudio === "gravar"
                ? "bg-verde-600 text-white shadow-sm"
                : "text-verde-800 hover:bg-stone-50"
            }`}
          >
            Gravar agora
          </button>
          <button
            type="button"
            onClick={() => setModoAudio("upload")}
            className={`rounded-md px-4 py-1.5 font-medium transition ${
              modoAudio === "upload"
                ? "bg-verde-600 text-white shadow-sm"
                : "text-verde-800 hover:bg-stone-50"
            }`}
          >
            Enviar arquivo
          </button>
        </div>

        {modoAudio === "gravar" && (
          <GravadorAudio
            onGravado={onArquivoGravado}
            maxBytes={AUDIO_TAMANHO_MAX}
            disabled={listaCheia}
          />
        )}

        {modoAudio === "upload" && (
          <>
            {plataforma && (
              <div className="rounded-lg border border-amarelo-300/60 bg-amarelo-50/70 p-4 text-sm text-verde-900">
                <p className="flex items-center gap-2 font-medium">
                  <span aria-hidden>💡</span>
                  Quer enviar um áudio do seu WhatsApp?
                </p>
                {plataforma === "android" ? (
                  <p className="mt-1.5 text-verde-800">
                    No botão abaixo, toque em <strong>Escolher arquivo</strong> e navegue até{" "}
                    <span className="font-mono text-xs">WhatsApp → Media → WhatsApp Voice Notes</span>.
                  </p>
                ) : (
                  <p className="mt-1.5 text-verde-800">
                    No iPhone, os áudios do WhatsApp não aparecem direto aqui. Primeiro abra o áudio no{" "}
                    WhatsApp → toque em <strong>Encaminhar</strong> → <strong>Salvar em Arquivos</strong>.
                    Depois volte aqui e selecione pelo botão abaixo.
                  </p>
                )}
              </div>
            )}

            <label
              htmlFor="audio"
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
                listaCheia
                  ? "cursor-not-allowed border-stone-200 bg-stone-50 opacity-60"
                  : "cursor-pointer border-stone-300 bg-amarelo-50/50 hover:border-verde-600 hover:bg-verde-50"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-verde-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7-7-7 7M12 2v14M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
              </svg>
              <span className="text-sm font-medium text-verde-900">
                {listaCheia
                  ? `Limite de ${BATCH_MAX} arquivos atingido`
                  : arquivos.length > 0
                    ? "Adicionar mais arquivos"
                    : "Clique para selecionar arquivo(s)"}
              </span>
              <span className="text-xs text-verde-800/80">
                Até {formatarTamanho(AUDIO_TAMANHO_MAX)} cada · {EXTENSOES_PERMITIDAS.join(", ")}
              </span>
              <input
                id="audio"
                type="file"
                multiple
                accept={EXTENSOES_PERMITIDAS.join(",")}
                onChange={onArquivoChange}
                className="sr-only"
                disabled={listaCheia}
              />
            </label>
          </>
        )}

        {arquivos.length > 1 && (
          <div className="rounded-md border border-amarelo-300/60 bg-amarelo-50/70 p-3 text-sm text-verde-900">
            <p className="flex items-center gap-2 font-medium">
              <span aria-hidden>⚠️</span>
              Atenção: dados do formulário aplicados a todos os {arquivos.length} áudios
            </p>
            <p className="mt-1 text-verde-800">
              O sotaque, equipamento, ambiente, qualidade e demais campos serão registrados igual em
              todos os áudios deste envio. <strong>Se variarem entre os áudios</strong> (ex: um foi
              gravado no celular e outro no microfone USB), envie cada um em uma submissão separada.
            </p>
          </div>
        )}

        {arquivos.length > 0 && (
          <ul className="space-y-2">
            {arquivos.map((arquivo, idx) => (
              <li
                key={`${arquivo.name}-${idx}`}
                className="flex items-center gap-3 rounded-md bg-verde-50 px-4 py-3 text-sm text-verde-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 flex-shrink-0 text-verde-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19a3 3 0 01-3 3h0a3 3 0 01-3-3v0a3 3 0 013-3h3zM21 16a3 3 0 01-3 3h0a3 3 0 01-3-3v0a3 3 0 013-3h3z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {arquivos.length > 1 && <span className="text-verde-700">{idx + 1}. </span>}
                    {arquivo.name}
                  </p>
                  <p className="text-xs text-verde-800">
                    {formatarTamanho(arquivo.size)}
                    {duracoes[idx] !== null && duracoes[idx] !== undefined && (
                      <> · {formatarDuracao(duracoes[idx]!)}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removerArquivo(idx)}
                  disabled={enviando}
                  className="flex-shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-verde-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remover ${arquivo.name}`}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        {erroArquivo && <p className="text-sm text-red-600">{erroArquivo}</p>}
      </section>

      {/* Seção 7 — consentimentos */}
      <section className="space-y-4 border-b border-stone-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-verde-900">7. Consentimento</h2>
          <p className="mt-1 text-sm text-verde-800">
            Leia o{" "}
            <a href="/termo" className="font-medium text-verde-700 underline decoration-verde-600/40 underline-offset-2 hover:text-verde-800" target="_blank" rel="noopener">
              Termo de Consentimento e Aviso de Privacidade
            </a>
            {" "}antes de prosseguir. Marque todas as confirmações abaixo — individualmente ou de uma vez.
          </p>
        </div>

        {!todosConsentimentos && (
          <button
            type="button"
            onClick={() =>
              setConsent({
                checkbox_1: true,
                checkbox_2: true,
                checkbox_3: true,
                checkbox_4: true,
                checkbox_5: true,
                checkbox_6: true,
                checkbox_7: true,
              })
            }
            className="inline-flex items-center gap-2 rounded-md border border-verde-600/50 bg-verde-50 px-4 py-2 text-sm font-medium text-verde-700 transition hover:bg-verde-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            Li e concordo com todas as declarações abaixo
          </button>
        )}

        <ul className="space-y-2">
          {CONSENT_TEXTOS.map(({ id, texto }, idx) => (
            <li key={id}>
              <label
                className={[
                  "flex cursor-pointer gap-3 rounded-lg border p-3.5 text-sm transition",
                  consent[id]
                    ? "border-verde-600/50 bg-verde-50"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-amarelo-50/40",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={consent[id]}
                  onChange={(e) => setConsentField(id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-verde-600"
                />
                <span className="text-verde-900">
                  <span className="mr-1 font-semibold text-verde-900">{idx + 1}.</span>
                  {texto}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Turnstile */}
      <section className="flex flex-col items-start gap-3 pt-2">
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          options={{ theme: "light", language: "pt-br" }}
          onSuccess={(token) => {
            setTurnstileToken(token);
            if (tokenResolverRef.current) {
              tokenResolverRef.current(token);
              tokenResolverRef.current = null;
            }
          }}
          onExpire={() => setTurnstileToken("")}
          onError={() => setTurnstileToken("")}
        />
      </section>

      {erroGeral && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-line" role="alert">
          {erroGeral}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={!podeEnviar}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-verde-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-verde-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-verde-800/80"
        >
          {enviando && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {enviando
            ? progressoEnvio && progressoEnvio.total > 1
              ? `Enviando ${progressoEnvio.atual} de ${progressoEnvio.total}…`
              : "Enviando…"
            : arquivos.length > 1
              ? `Enviar ${arquivos.length} contribuições`
              : "Enviar contribuição"}
        </button>
        {enviando && (
          <p className="text-xs text-verde-800/80">
            Pode demorar até 1 minuto por arquivo grande. Não feche a página.
          </p>
        )}
        {!podeEnviar && !enviando && (
          <p className="text-xs text-verde-800/80">
            {!obrigatoriosOk
              ? "Preencha os campos obrigatórios e selecione o arquivo."
              : !todosConsentimentos
              ? "Marque todas as confirmações de consentimento."
              : !turnstileToken
              ? "Aguardando verificação anti-spam…"
              : ""}
          </p>
        )}
      </div>
    </form>
  );
}

function Campo(props: {
  id: string;
  rotulo: string;
  ajuda?: string;
  obrigatorio?: boolean;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-medium text-verde-900">
        {props.rotulo}
        {props.obrigatorio && <span className="ml-0.5 text-verde-700" aria-hidden>*</span>}
      </label>
      <div className="mt-1.5">{props.children}</div>
      {props.ajuda && !props.erro && (
        <p className="mt-1.5 text-xs text-verde-800/80">{props.ajuda}</p>
      )}
      {props.erro && <p className="mt-1.5 text-xs font-medium text-red-600">{props.erro}</p>}
    </div>
  );
}

function inputClasse(erro: boolean): string {
  return [
    "block w-full rounded-md border bg-white px-3 py-2 text-sm text-verde-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-verde-500/70 focus:border-verde-600",
    erro ? "border-red-400" : "border-stone-300",
  ].join(" ");
}
