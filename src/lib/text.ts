// Text normalisation for Estonian questions and CSV keywords.
// Estonian words change form a lot (vaip, vaiba, vaipa), so we use a small, explicit rule set
// instead of a full morphology library. The same function is applied to user text and CSV keywords,
// so both sides are always compared in the same "canonical" form.

// Irregular forms that a prefix comparison cannot catch. Each rule maps an ending to a base form.
const LEMMA_RULES: Array<[RegExp, string]> = [
  [/toa(s|st|l|le|lt)?$/, "tuba"], // elutoa, magamistoas -> elutuba, magamistuba
  [/tuppa$/, "tuba"], // elutuppa -> elutuba
  [/laua(s|l|le|lt|st)?$/, "laud"], // söögilaua, laual -> söögilaud, laud
  [/kap(i|id|ile|is|ist)$/, "kapp"], // öökapi, kapid -> öökapp, kapp
  [/ping(i|id|ile)$/, "pink"], // esikupingi -> esikupink
  [/peegl(i|id|it|is|ist|ile|iga)$/, "peegel"], // peegli -> peegel
  [/mööbl(i|it|id|is|ist|iga)$/, "mööbel"], // mööbli -> mööbel
  [/^teler(i|it|is|ile)?$/, "teleka"], // colloquial "teler" -> the CSV keyword "teleka"
];

/** Lowercases, removes punctuation and returns canonical word tokens. */
export function normalizeText(input: string): string[] {
  return input
    .normalize("NFC")
    .toLocaleLowerCase("et")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    .map(canonicalToken);
}

function canonicalToken(token: string): string {
  let result = token;
  for (const [pattern, replacement] of LEMMA_RULES) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      break;
    }
  }
  // Estonian consonant gradation: vaip/vaiba, köök/köögi. Fold voiced and voiceless stops together.
  return result.replace(/b/g, "p").replace(/d/g, "t").replace(/g/g, "k");
}

/**
 * Decides whether two canonical tokens are forms of the same word.
 * - Short words (up to 3 letters) and numbers must match exactly.
 * - 4-letter words must be a prefix of the other word (sein / seinad).
 * - Longer words must share at least 5 starting letters (diivan / diivani); words of 7+ letters
 *   need 6, so compounds such as "esikuga" and "esikupink" are not treated as the same word.
 * The 5-letter rule keeps "valge" (white) and "valgus" (light) apart.
 */
export function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shortest = Math.min(a.length, b.length);
  if (shortest <= 3 || /\d/.test(a) || /\d/.test(b)) return false;

  let common = 0;
  while (common < shortest && a[common] === b[common]) common++;

  if (shortest === 4) return common === 4;
  return common >= (shortest <= 6 ? 5 : 6);
}
