// ============================================================================
// CONTROLE DE QUALIDADE DAS QUESTÕES
// Detecta duplicatas aproximadas e alternativas que "entregam" o gabarito.
// ============================================================================

const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
  "e", "em", "no", "na", "nos", "nas", "para", "por", "com", "sem", "que", "qual",
  "quais", "se", "ao", "aos", "ou", "sua", "seu", "suas", "seus", "mais", "menos",
  "como", "esta", "este", "essa", "esse", "isso", "pela", "pelo", "pelas", "pelos",
  "entre", "sobre", "ser", "sao", "uso", "usar", "deve", "pode", "precisa", "empresa",
  "aws", "amazon", "servico", "servicos", "recurso", "recursos", "melhor", "atende",
  "cenario", "solucao", "opcao", "alternativa",
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contentTokens(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

/** Similaridade de Jaccard entre os termos relevantes de dois enunciados (0 a 1). */
export function stemSimilarity(a: string, b: string): number {
  const ta = contentTokens(a);
  const tb = contentTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export const NEAR_DUPLICATE_THRESHOLD = 0.6;

export function isNearDuplicate(stem: string, existingStems: string[]): boolean {
  return existingStems.some((s) => stemSimilarity(stem, s) >= NEAR_DUPLICATE_THRESHOLD);
}

interface QualityCheckInput {
  stem: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

const FORBIDDEN_OPTION_PATTERNS = [
  /todas as (anteriores|alternativas|opcoes)/,
  /nenhuma das (anteriores|alternativas|opcoes)/,
  /^nao sei$/,
  /\b(correta|correto|gabarito|resposta certa)\b/,
];

/**
 * Retorna o motivo pelo qual a questão permite inferir a resposta sem conhecimento
 * (ou null quando a questão é aceitável).
 */
export function detectAnswerLeak(q: QualityCheckInput): string | null {
  const correct = q.options.find((o) => o.id === q.correctOptionId);
  if (!correct) return "Gabarito não corresponde a nenhuma alternativa";

  const normalizedTexts = q.options.map((o) => normalizeText(o.text));
  if (new Set(normalizedTexts).size !== q.options.length) {
    return "Alternativas repetidas";
  }

  for (const text of normalizedTexts) {
    if (FORBIDDEN_OPTION_PATTERNS.some((p) => p.test(text))) {
      return "Alternativa com texto proibido";
    }
  }

  const distractors = q.options.filter((o) => o.id !== q.correctOptionId);
  const avgDistractorLength =
    distractors.reduce((sum, o) => sum + o.text.length, 0) / distractors.length;
  const isLongest = distractors.every((o) => correct.text.length > o.text.length);
  if (isLongest && correct.text.length > avgDistractorLength * 1.6) {
    return "Alternativa correta muito mais longa que as demais";
  }

  const normalizedStem = normalizeText(q.stem);
  const normalizedCorrect = normalizeText(correct.text);
  if (normalizedCorrect.split(" ").length >= 2 && normalizedStem.includes(normalizedCorrect)) {
    return "Enunciado contém o texto da alternativa correta";
  }

  const stemTokens = contentTokens(q.stem);
  const distractorTokens = new Set<string>();
  for (const d of distractors) for (const t of contentTokens(d.text)) distractorTokens.add(t);
  const exclusiveEchoes = [...contentTokens(correct.text)].filter(
    (t) => stemTokens.has(t) && !distractorTokens.has(t)
  );
  if (exclusiveEchoes.length >= 2) {
    return "Enunciado repete termos exclusivos da alternativa correta";
  }

  return null;
}
