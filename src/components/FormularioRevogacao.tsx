import { useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { revogacaoSchema } from "../lib/revogacao";

type Props = {
  turnstileSiteKey: string;
};

export default function FormularioRevogacao({ turnstileSiteKey }: Props) {
  const [email, setEmail] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [token, setToken] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const turnstileRef = useRef<TurnstileInstance | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErros({});
    setErroGeral(null);

    const payload = {
      email: email.trim(),
      submission_id: submissionId.trim() || undefined,
      motivo: motivo.trim() || undefined,
      turnstileToken: token,
    };
    const parsed = revogacaoSchema.safeParse(payload);
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = i.path.join(".");
        if (!m[k]) m[k] = i.message;
      }
      setErros(m);
      return;
    }

    setEnviando(true);
    try {
      const resp = await fetch("/api/revogacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
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
      setEnviado(true);
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro desconhecido.");
      turnstileRef.current?.reset();
      setToken("");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-semibold">Pedido de revogação recebido.</p>
        <p className="mt-2">
          Registramos sua solicitação. O Projeto processará o pedido e, quando concluído, enviaremos
          uma confirmação para o e-mail informado. Para acompanhar ou complementar o pedido, escreva
          para{" "}
          <a className="underline" href="mailto:contato@fabriciocarraro.com.br">
            contato@fabriciocarraro.com.br
          </a>.
        </p>
        <p className="mt-2 text-xs">
          Importante: conforme o Termo, a revogação não apaga cópias já redistribuídas nem modelos já
          treinados com a contribuição.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-verde-900">
          E-mail usado na contribuição <span className="text-red-600">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-verde-500 ${erros["email"] ? "border-red-400" : "border-stone-300"}`}
          required
        />
        {erros["email"] && <p className="mt-1 text-xs text-red-600">{erros["email"]}</p>}
      </div>

      <div>
        <label htmlFor="submission_id" className="block text-sm font-medium text-verde-900">
          Identificador da submissão
        </label>
        <input
          id="submission_id"
          type="text"
          value={submissionId}
          onChange={(e) => setSubmissionId(e.target.value)}
          placeholder="Opcional — se você tiver guardado o ID da contribuição"
          className={`mt-1 block w-full rounded-md border px-3 py-2 font-mono text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-verde-500 ${erros["submission_id"] ? "border-red-400" : "border-stone-300"}`}
        />
        {erros["submission_id"] && <p className="mt-1 text-xs text-red-600">{erros["submission_id"]}</p>}
        <p className="mt-1 text-xs text-stone-500">
          Se não souber, deixe em branco. Vamos localizar suas contribuições pelo e-mail.
        </p>
      </div>

      <div>
        <label htmlFor="motivo" className="block text-sm font-medium text-verde-900">
          Motivo / observações
        </label>
        <textarea
          id="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={2000}
          rows={4}
          className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
        />
        <p className="mt-1 text-xs text-stone-500">
          Opcional. Ajuda a processar o pedido mais rápido, mas não é obrigatório informar.
        </p>
      </div>

      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ theme: "light", language: "pt-br" }}
        onSuccess={(t) => setToken(t)}
        onExpire={() => setToken("")}
        onError={() => setToken("")}
      />

      {erroGeral && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {erroGeral}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando || !token || !email}
        className="inline-flex items-center rounded-md bg-verde-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-verde-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {enviando ? "Enviando…" : "Enviar pedido de revogação"}
      </button>
    </form>
  );
}
