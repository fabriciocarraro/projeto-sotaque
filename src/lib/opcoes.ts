export const SOTAQUES = [
  { valor: "caipira", rotulo: "Caipira" },
  { valor: "fluminense", rotulo: "Fluminense" },
  { valor: "gaucho", rotulo: "Gaúcho" },
  { valor: "mineiro", rotulo: "Mineiro" },
  { valor: "nordestino", rotulo: "Nordestino" },
  { valor: "nortista", rotulo: "Nortista" },
  { valor: "paulistano", rotulo: "Paulistano" },
  { valor: "sertanejo", rotulo: "Sertanejo" },
  { valor: "sulista", rotulo: "Sulista" },
  { valor: "florianopolitano", rotulo: "Florianopolitano" },
  { valor: "baiano", rotulo: "Baiano" },
  { valor: "recifense", rotulo: "Recifense" },
  { valor: "carioca", rotulo: "Carioca" },
  { valor: "outro", rotulo: "Outro / não sei dizer" },
] as const;

export const REGIOES = [
  { valor: "norte", rotulo: "Norte" },
  { valor: "nordeste", rotulo: "Nordeste" },
  { valor: "centro-oeste", rotulo: "Centro-Oeste" },
  { valor: "sudeste", rotulo: "Sudeste" },
  { valor: "sul", rotulo: "Sul" },
] as const;

export const ESTADOS = [
  { valor: "AC", rotulo: "Acre" },
  { valor: "AL", rotulo: "Alagoas" },
  { valor: "AP", rotulo: "Amapá" },
  { valor: "AM", rotulo: "Amazonas" },
  { valor: "BA", rotulo: "Bahia" },
  { valor: "CE", rotulo: "Ceará" },
  { valor: "DF", rotulo: "Distrito Federal" },
  { valor: "ES", rotulo: "Espírito Santo" },
  { valor: "GO", rotulo: "Goiás" },
  { valor: "MA", rotulo: "Maranhão" },
  { valor: "MT", rotulo: "Mato Grosso" },
  { valor: "MS", rotulo: "Mato Grosso do Sul" },
  { valor: "MG", rotulo: "Minas Gerais" },
  { valor: "PA", rotulo: "Pará" },
  { valor: "PB", rotulo: "Paraíba" },
  { valor: "PR", rotulo: "Paraná" },
  { valor: "PE", rotulo: "Pernambuco" },
  { valor: "PI", rotulo: "Piauí" },
  { valor: "RJ", rotulo: "Rio de Janeiro" },
  { valor: "RN", rotulo: "Rio Grande do Norte" },
  { valor: "RS", rotulo: "Rio Grande do Sul" },
  { valor: "RO", rotulo: "Rondônia" },
  { valor: "RR", rotulo: "Roraima" },
  { valor: "SC", rotulo: "Santa Catarina" },
  { valor: "SP", rotulo: "São Paulo" },
  { valor: "SE", rotulo: "Sergipe" },
  { valor: "TO", rotulo: "Tocantins" },
] as const;

export const FAIXAS_ETARIAS = [
  { valor: "18-24", rotulo: "18 a 24 anos" },
  { valor: "25-34", rotulo: "25 a 34 anos" },
  { valor: "35-44", rotulo: "35 a 44 anos" },
  { valor: "45-54", rotulo: "45 a 54 anos" },
  { valor: "55-64", rotulo: "55 a 64 anos" },
  { valor: "65+", rotulo: "65 anos ou mais" },
] as const;

export const GENEROS = [
  { valor: "mulher", rotulo: "Mulher" },
  { valor: "homem", rotulo: "Homem" },
  { valor: "nao-binario", rotulo: "Não-binário" },
  { valor: "outro", rotulo: "Outro" },
  { valor: "prefiro-nao-informar", rotulo: "Prefiro não informar" },
] as const;

export const DISPOSITIVOS = [
  { valor: "celular", rotulo: "Celular" },
  { valor: "computador", rotulo: "Computador / notebook" },
  { valor: "tablet", rotulo: "Tablet" },
  { valor: "gravador", rotulo: "Gravador dedicado" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export const MICROFONES = [
  { valor: "embutido", rotulo: "Microfone embutido do dispositivo" },
  { valor: "headset", rotulo: "Fone com microfone / headset" },
  { valor: "usb", rotulo: "Microfone USB externo" },
  { valor: "condensador", rotulo: "Microfone condensador / estúdio" },
  { valor: "lapela", rotulo: "Lapela" },
  { valor: "outro", rotulo: "Outro" },
  { valor: "nao-sei", rotulo: "Não sei" },
] as const;

export const AMBIENTES = [
  { valor: "silencioso", rotulo: "Silencioso (sem ruído perceptível)" },
  { valor: "ruido-leve", rotulo: "Ruído leve (leve fundo)" },
  { valor: "ruido-moderado", rotulo: "Ruído moderado" },
  { valor: "ruido-alto", rotulo: "Ruído alto" },
] as const;

export const QUALIDADE = [1, 2, 3, 4, 5] as const;

export const MIMETYPES_PERMITIDOS = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "audio/opus",
] as const;

export const EXTENSOES_PERMITIDAS = [
  ".wav",
  ".mp3",
  ".flac",
  ".m4a",
  ".ogg",
  ".webm",
  ".opus",
] as const;

export const AUDIO_TAMANHO_MAX = 100 * 1024 * 1024;

export function valoresDe<T extends ReadonlyArray<{ valor: string }>>(lista: T): [T[number]["valor"], ...T[number]["valor"][]] {
  const v = lista.map((x) => x.valor) as T[number]["valor"][];
  return v as [T[number]["valor"], ...T[number]["valor"][]];
}
