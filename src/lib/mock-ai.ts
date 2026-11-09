// Mock AI: deterministic keyword matching against the CSV tips. No random choices and no real AI calls.
// The same question always produces the same answer, which makes the assistant easy to test.
import type { Tip } from "@/lib/tips";
import { normalizeText, wordsMatch } from "@/lib/text";

export type ReplyStyle = "SHORT" | "DETAILED" | "BEGINNER" | "NONE";
export type ReplyKind = "tips" | "greeting" | "thanks" | "fallback";

export interface MockReply {
  text: string;
  kind: ReplyKind;
  tipIds: string[];
}

export const EXAMPLE_QUESTIONS = [
  "Kuidas sisustada väikest elutuba?",
  "Millised värvid sobivad beeži diivaniga?",
  "Kuidas muuta magamistuba hubasemaks?",
  "Millist valgust kodukontorisse valida?",
];

export const ATTACHMENT_NOTICE = "Fail on valitud, kuid demoversioon ei analüüsi piltide ega dokumentide sisu.";

// ---- Scoring settings (kept in one place so they are easy to explain and tune) ----
const FULL_PHRASE_BONUS = 4; // every word of a CSV keyword phrase appears in the question
const MAX_FULL_PHRASES = 2; // so one tip with many similar keywords cannot run away with the score
const ROOM_BONUS = 1.5; // lower than keyword matches, as agreed
const CATEGORY_BONUS = 1;
const MIN_KEYWORD_SCORE = 5.5; // a tip needs real keyword evidence; room/category alone never qualifies
const SECOND_TIP_RATIO = 0.6; // the 2nd tip must be at least 60% as good as the 1st
const MAX_TIPS = 2;

const GREETING_WORDS = new Set(["tere", "tervist", "tsau", "hei", "hommikust", "päevast", "õhtust", "head", "tervitus", "hello", "hi"]);
const THANKS_WORDS = new Set(["aitäh", "aitüma", "tänan", "tänud", "tänu", "suur", "palun", "super", "hea"]);

// Intensifiers that appear in some CSV keywords ("väga kitsas esik") but that users rarely type.
const FILLER_WORDS = new Set(["väga", "liiga"].map((word) => normalizeText(word)[0]));

// "sisustada / sisustamine / sisustus ..." means "decorating" in every question, so it says nothing
// about the topic. Ignoring it stops "Kuidas sisustada?" from matching "sisustustaimed".
const isGenericWord = (word: string) => word.startsWith("sisust");

interface IndexedTip {
  tip: Tip;
  phrases: string[][]; // keyword phrases, each as a list of canonical words
  roomTokens: string[];
  categoryTokens: string[];
}

interface TipIndex {
  items: IndexedTip[];
  weights: Map<string, number>; // rare words weigh more than words found in many tips
}

const indexCache = new WeakMap<Tip[], TipIndex>();

function buildIndex(tips: Tip[]): TipIndex {
  const items: IndexedTip[] = tips.map((tip) => ({
    tip,
    phrases: tip.keywords
      .map((keyword) => normalizeText(keyword).filter((word) => !FILLER_WORDS.has(word) && !isGenericWord(word)))
      .filter((phrase) => phrase.length > 0),
    roomTokens: tip.room === "üldine" ? [] : normalizeText(tip.room),
    categoryTokens: normalizeText(tip.category),
  }));

  // Weight of a keyword word = 1 + ln(totalTips / tipsThatContainIt).
  const uniqueWords = new Set(items.flatMap((item) => item.phrases.flat()));
  const weights = new Map<string, number>();
  for (const word of uniqueWords) {
    const documentCount = items.filter((item) => item.phrases.some((phrase) => phrase.some((w) => wordsMatch(w, word)))).length;
    weights.set(word, 1 + Math.log(items.length / documentCount));
  }
  return { items, weights };
}

function getIndex(tips: Tip[]): TipIndex {
  let index = indexCache.get(tips);
  if (!index) {
    index = buildIndex(tips);
    indexCache.set(tips, index);
  }
  return index;
}

export interface TipMatch {
  tip: Tip;
  keywordScore: number;
  totalScore: number;
}

/** Returns the best matching tips (at most 2), best first. Empty if nothing is relevant enough. */
export function findMatches(message: string, tips: Tip[]): TipMatch[] {
  const queryTokens = normalizeText(message).filter((word) => !isGenericWord(word));
  if (queryTokens.length === 0) return [];
  const { items, weights } = getIndex(tips);
  const inQuestion = (word: string) => queryTokens.some((q) => wordsMatch(word, q));

  const scored: TipMatch[] = [];
  for (const item of items) {
    // Each word of the question counts once per tip, at the weight of its best-matching keyword word.
    // This stops "valgust" from being counted separately for "valgus" and "valgustus".
    const bestWeightPerQueryWord = new Map<string, number>();
    let hasExactWordMatch = false;
    let fullPhrases = 0;
    for (const phrase of item.phrases) {
      let hitCount = 0;
      for (const word of phrase) {
        let hit = false;
        for (const queryWord of queryTokens) {
          if (!wordsMatch(word, queryWord)) continue;
          hit = true;
          if (word === queryWord) hasExactWordMatch = true;
          const weight = weights.get(word) ?? 0;
          if (weight > (bestWeightPerQueryWord.get(queryWord) ?? 0)) bestWeightPerQueryWord.set(queryWord, weight);
        }
        if (hit) hitCount++;
      }
      if (hitCount === phrase.length) fullPhrases++;
    }

    let keywordScore = Math.min(fullPhrases, MAX_FULL_PHRASES) * FULL_PHRASE_BONUS;
    for (const weight of bestWeightPerQueryWord.values()) keywordScore += weight;
    if (keywordScore < MIN_KEYWORD_SCORE) continue;
    // Weak evidence guard: with no full keyword phrase and only one matching word, that word must match exactly
    // (not just share a stem). This keeps "pesta" (wash) from matching "pestav" (washable).
    if (fullPhrases === 0 && bestWeightPerQueryWord.size < 2 && !hasExactWordMatch) continue;

    let totalScore = keywordScore;
    if (item.roomTokens.length > 0 && item.roomTokens.every(inQuestion)) totalScore += ROOM_BONUS;
    if (item.categoryTokens.some(inQuestion)) totalScore += CATEGORY_BONUS;
    scored.push({ tip: item.tip, keywordScore, totalScore });
  }

  // Highest score first; equal scores keep the CSV order (Array.sort is stable), so results are deterministic.
  scored.sort((a, b) => b.totalScore - a.totalScore);
  if (scored.length === 0) return [];

  const best = scored[0];
  return scored.filter((match, position) => position === 0 || (position < MAX_TIPS && match.totalScore >= best.totalScore * SECOND_TIP_RATIO));
}

// ---- Reply building ----

function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?](?=\s+[A-ZÕÄÖÜŠŽ]|$)/);
  return match ? match[0] : text;
}

function formatTips(matches: TipMatch[], style: ReplyStyle): string {
  if (style === "SHORT") {
    return matches.map((m) => (matches.length > 1 ? `• ${firstSentence(m.tip.tip)}` : firstSentence(m.tip.tip))).join("\n");
  }

  if (style === "DETAILED") {
    return matches
      .map((m) => `${m.tip.tip}\n\nPane tähele: ${m.tip.caveat}\n(Teema: ${m.tip.category}, ruum: ${m.tip.room})`)
      .join("\n\n---\n\n");
  }

  // BEGINNER, and NONE (demo/custom prompts are cosmetic, so they use the friendly default format).
  const blocks = matches.map((m) => `${m.tip.tip}\n\nPraktiline märkus: ${m.tip.caveat}`);
  return `Hea küsimus! Lihtsalt öeldes:\n\n${blocks.join("\n\n")}\n\nKui soovid, küsi julgelt täpsemalt edasi.`;
}

function tokensAreAll(message: string, allowed: Set<string>): boolean {
  const words = message
    .toLocaleLowerCase("et")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);
  return words.length > 0 && words.every((word) => allowed.has(word));
}

/** Builds the assistant's reply for one user message. */
export function generateReply(
  message: string,
  tips: Tip[],
  options: { style?: ReplyStyle; hasAttachment?: boolean } = {},
): MockReply {
  const style = options.style ?? "BEGINNER";
  const notice = options.hasAttachment ? `\n\n${ATTACHMENT_NOTICE}` : "";
  const examples = EXAMPLE_QUESTIONS.map((question) => `• ${question}`).join("\n");

  const matches = findMatches(message, tips);
  if (matches.length > 0) {
    return { text: formatTips(matches, style) + notice, kind: "tips", tipIds: matches.map((m) => m.tip.id) };
  }

  if (tokensAreAll(message, GREETING_WORDS)) {
    return {
      text: `Tere! Mina olen KoduStuudio sisustusabiline. Aitan sind värvide, valguse, mööbli paigutuse ja kodukaunistuste küsimustes. Proovi näiteks:\n\n${examples}${notice}`,
      kind: "greeting",
      tipIds: [],
    };
  }

  if (tokensAreAll(message, new Set([...THANKS_WORDS, ...GREETING_WORDS]))) {
    return { text: `Palun! Kui tekib veel sisustusküsimusi, küsi julgelt.${notice}`, kind: "thanks", tipIds: [] };
  }

  return {
    text: `Vabandust, sellele küsimusele ei leidnud ma sobivat nõuannet. Proovi küsida konkreetsemalt toa, värvi, valguse või mööbli kohta, näiteks:\n\n${examples}${notice}`,
    kind: "fallback",
    tipIds: [],
  };
}
