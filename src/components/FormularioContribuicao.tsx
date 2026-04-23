import { useMemo, useState, useRef, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
  AMBIENTES,
  AUDIO_TAMANHO_MAX,
  DISPOSITIVOS,
  ESTADOS,
  EXTENSOES_PERMITIDAS,
  FAIXAS_ETARIAS,
  GENEROS,
  MICROFONES,
  MIMETYPES_PERMITIDOS,
  QUALIDADE,
  REGIOES,
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
      "Confirmo que tenho 18 anos ou mais, que estou localizada no Brasil no momento da contribuição e que estou contribuindo com a minha própria voz.",
  },
  {
    id: "checkbox_2",
    texto:
      "Li e compreendi o Termo de Consentimento e Aviso de Privacidade, incluindo as finalidades, os riscos e os limites da retirada do consentimento.",
  },
  {
    id: "checkbox_3",
    texto:
      "Dou meu consentimento explícito para a coleta, tratamento, curadoria e documentação das minhas contribuições para formação do dataset.",
  },
  {
    id: "checkbox_4",
    texto:
      "Dou meu consentimento explícito para a publicação aberta, distribuição e reutilização das minhas gravações, transcrições e metadados permitidos nos termos da licença do Projeto (CDLA-Permissive-2.0).",
  },
  {
    id: "checkbox_5",
    texto:
      "Dou meu consentimento explícito para o uso das minhas contribuições no treinamento, ajuste, avaliação e melhoria de tecnologias de fala, inclusive modelos TTS.",
  },
  {
    id: "checkbox_6",
    texto:
      "Compreendo que a participação é gratuita e voluntária, sem promessa de pagamento, royalties ou compensação.",
  },
  {
    id: "checkbox_7",
    texto:
      "Compreendo que posso retirar meu consentimento para usos futuros sob controle do Projeto, mas que cópias já redistribuídas e modelos já treinados podem não ser totalmente removidos.",
  },
];

type Props = {
  turnstileSiteKey: string;
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

export default function FormularioContribuicao({ turnstileSiteKey }: Props) {
  const [pseudonimo, setPseudonimo] = useState("");
  const [email, setEmail] = useState("");

  const [sotaque, setSotaque] = useState("");
  const [regiao, setRegiao] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");

  const [faixaEtaria, setFaixaEtaria] = useState("");
  const [genero, setGenero] = useState("");

  const [dispositivo, setDispositivo] = useState("");
  const [microfone, setMicrofone] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [qualidade, setQualidade] = useState("");

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  const [consent, setConsent] = useState<Consent>(ESTADO_CONSENT_INICIAL);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

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
      arquivo !== null &&
      !erroArquivo
    );
  }, [pseudonimo, email, sotaque, regiao, estado, faixaEtaria, arquivo, erroArquivo]);

  const podeEnviar =
    obrigatoriosOk && todosConsentimentos && !!turnstileToken && !enviando;

  function onArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setErroArquivo(null);
    if (!f) {
      setArquivo(null);
      return;
    }
    if (f.size > AUDIO_TAMANHO_MAX) {
      setArquivo(null);
      setErroArquivo(`Arquivo maior que ${formatarTamanho(AUDIO_TAMANHO_MAX)}. Reduza ou comprima o áudio.`);
      return;
    }
    if (!extensaoValida(f.name)) {
      setArquivo(null);
      setErroArquivo(`Extensão não suportada. Use: ${EXTENSOES_PERMITIDAS.join(", ")}`);
      return;
    }
    if (f.type && !MIMETYPES_PERMITIDOS.includes(f.type as (typeof MIMETYPES_PERMITIDOS)[number])) {
      // alguns browsers não preenchem o mimetype — toleramos se a extensão passou
      if (f.type !== "") {
        setArquivo(null);
        setErroArquivo(`Tipo de arquivo não suportado (${f.type}).`);
        return;
      }
    }
    setArquivo(f);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErros({});
    setErroGeral(null);

    const payload = {
      pseudonimo: pseudonimo.trim(),
      email: email.trim(),
      sotaque_declarado: sotaque,
      regiao_socializacao: regiao,
      estado_principal: estado,
      cidade_microrregiao: cidade.trim() || undefined,
      faixa_etaria: faixaEtaria,
      genero: genero || undefined,
      tipo_dispositivo: dispositivo || undefined,
      tipo_microfone: microfone || undefined,
      ambiente_gravacao: ambiente || undefined,
      autoavaliacao_qualidade: qualidade ? Number(qualidade) : undefined,
      consentimento: consent,
      turnstileToken,
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
      return;
    }
    if (!arquivo) {
      setErroArquivo("Selecione um arquivo de áudio.");
      return;
    }

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("audio", arquivo, arquivo.name);
      fd.append("dados", JSON.stringify(resultado.data));

      const resp = await fetch("/api/submissions", {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        let msg = "Erro ao enviar. Tente novamente.";
        try {
          const j = (await resp.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const j = (await resp.json()) as { id: string };
      window.location.href = `/sucesso?id=${encodeURIComponent(j.id)}`;
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro desconhecido.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setEnviando(false);
    }
  }

  function setConsentField(id: keyof Consent, v: boolean) {
    setConsent((c) => ({ ...c, [id]: v }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      {/* Seção 1 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Identificação</h2>
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

      {/* Seção 2 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Perfil linguístico</h2>

        <Campo
          id="sotaque"
          rotulo="Sotaque declarado"
          ajuda="Como você descreveria seu próprio sotaque? Veja o mapa acima se precisar de referência."
          obrigatorio
          erro={erros["sotaque_declarado"]}
        >
          <select
            id="sotaque"
            value={sotaque}
            onChange={(e) => setSotaque(e.target.value)}
            className={inputClasse(!!erros["sotaque_declarado"])}
          >
            <option value="">Selecione…</option>
            {SOTAQUES.map((s) => (
              <option key={s.valor} value={s.valor}>{s.rotulo}</option>
            ))}
          </select>
        </Campo>

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
      </section>

      {/* Seção 3 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Perfil demográfico</h2>
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
          ajuda="Opcional, autoidentificado."
          erro={erros["genero"]}
        >
          <select
            id="genero"
            value={genero}
            onChange={(e) => setGenero(e.target.value)}
            className={inputClasse(!!erros["genero"])}
          >
            <option value="">Prefiro não informar / em branco</option>
            {GENEROS.map((g) => (
              <option key={g.valor} value={g.valor}>{g.rotulo}</option>
            ))}
          </select>
        </Campo>
      </section>

      {/* Seção 4 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Sobre a gravação</h2>
        <p className="text-sm text-slate-600">
          Campos opcionais que nos ajudam a entender a diversidade de equipamentos e ambientes.
        </p>

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
              <label key={n} className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="qualidade"
                  value={n}
                  checked={qualidade === String(n)}
                  onChange={(e) => setQualidade(e.target.value)}
                  className="accent-brand-600"
                />
                <span>{n}</span>
              </label>
            ))}
            {qualidade && (
              <button
                type="button"
                onClick={() => setQualidade("")}
                className="text-xs text-slate-500 underline hover:text-slate-700">
                limpar
              </button>
            )}
          </div>
        </Campo>
      </section>

      {/* Seção 5 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Arquivo de áudio</h2>
        <p className="text-sm text-slate-600">
          Envie um arquivo de até {formatarTamanho(AUDIO_TAMANHO_MAX)}. Formatos aceitos:
          {" "}
          {EXTENSOES_PERMITIDAS.join(", ")}.
        </p>
        <input
          id="audio"
          type="file"
          accept={EXTENSOES_PERMITIDAS.join(",")}
          onChange={onArquivoChange}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          required
        />
        {arquivo && (
          <p className="text-sm text-slate-600">
            Selecionado: <span className="font-medium">{arquivo.name}</span> ({formatarTamanho(arquivo.size)})
          </p>
        )}
        {erroArquivo && <p className="text-sm text-red-600">{erroArquivo}</p>}
      </section>

      {/* Seção 6 — consentimentos */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Consentimento</h2>
        <p className="text-sm text-slate-600">
          Leia o <a href="/termo" className="text-brand-700 underline" target="_blank" rel="noopener">Termo de Consentimento e Aviso de Privacidade</a>. Para enviar, marque <strong>todas</strong> as confirmações abaixo. Nenhuma vem pré-marcada.
        </p>
        <ul className="space-y-3">
          {CONSENT_TEXTOS.map(({ id, texto }, idx) => (
            <li key={id}>
              <label className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={consent[id]}
                  onChange={(e) => setConsentField(id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-600"
                />
                <span>
                  <span className="mr-1 font-medium">{idx + 1}.</span>
                  {texto}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Turnstile */}
      <section className="space-y-3">
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          options={{ theme: "light", language: "pt-br" }}
          onSuccess={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken("")}
          onError={() => setTurnstileToken("")}
        />
      </section>

      {erroGeral && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {erroGeral}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={!podeEnviar}
          className="inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {enviando ? "Enviando…" : "Enviar contribuição"}
        </button>
        {!podeEnviar && !enviando && (
          <p className="text-xs text-slate-500">
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
      <label htmlFor={props.id} className="block text-sm font-medium text-slate-800">
        {props.rotulo}
        {props.obrigatorio && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
      </label>
      <div className="mt-1">{props.children}</div>
      {props.ajuda && !props.erro && (
        <p className="mt-1 text-xs text-slate-500">{props.ajuda}</p>
      )}
      {props.erro && <p className="mt-1 text-xs text-red-600">{props.erro}</p>}
    </div>
  );
}

function inputClasse(erro: boolean): string {
  return [
    "block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500",
    erro ? "border-red-400" : "border-slate-300",
  ].join(" ");
}
