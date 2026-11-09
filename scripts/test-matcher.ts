// Quick self-check for the CSV loader and the mock AI matcher.
// Run with: npm run test:matcher   (no database or dev server needed)
import { loadTips, parseTips, TipsDataError } from "../src/lib/tips";
import { EXAMPLE_QUESTIONS, findMatches, generateReply } from "../src/lib/mock-ai";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}

const tips = loadTips();
check("CSV has exactly 96 tips", tips.length === 96, String(tips.length));
check("Estonian characters survive", tips.some((t) => /[õäöü]/.test(t.tip)));

// Invalid CSV files must give a clear error.
for (const [label, csv] of [
  ["missing column", "id,category\nx,y\n"],
  ["wrong row count", "id,category,room,keywords_et,tip_et,caveat_et\na,b,c,d,e,f\n"],
] as const) {
  try {
    parseTips(csv);
    check(`invalid CSV rejected (${label})`, false, "no error thrown");
  } catch (error) {
    check(`invalid CSV rejected (${label})`, error instanceof TipsDataError);
  }
}

// Each question must put the expected tip first.
const expectations: Array<[string, string]> = [
  ["Kuidas sisustada väikest elutuba?", "small-living-room"],
  ["Millised värvid sobivad beeži diivaniga?", "beige-sofa"],
  ["Kuidas muuta magamistuba hubasemaks?", "cozy-bedroom"],
  ["Millist valgust kodukontorisse valida?", "home-office-light"],
  ["Mis suurusega vaip elutuppa sobib?", "rug-size"],
  ["Kuhu panna diivan?", "sofa-position"],
  ["Kuidas sisustada väikest magamistuba?", "small-bedroom"],
  ["Kuidas valida pimenduskardinaid?", "bedroom-blackout"],
  ["Mida teha liiga kitsa esikuga?", "entry-narrow"],
  ["Kas taimed sobivad rõdule?", "petite-balcony-plants"],
  ["Kuidas sisustada üürikorterit ilma puurimata?", "rental-friendly"],
  ["Mis on 60 30 10 reegel?", "colour-60-30-10"],
  ["Kuidas kasutada skandinaavialikku stiili?", "scandi-style"],
  ["Milline peegel sobib vannituppa?", "bathroom-mirror"],
  ["Kuidas valida söögilauda?", "dining-table"],
  ["Kuidas sisustada lastetuba?", "child-room-zones"],
  ["Mida teha liiga kitsa esikuga?", "entry-narrow"],
  ["Kuidas paigutada teler?", "tv-placement"],
  ["Tahan jaapani stiili", "japandi-style"],
  ["Kuidas peita juhtmeid kodukontoris?", "office-storage"],
  ["Milline valge sobib põhjapoolsesse tuppa?", "north-facing"],
];
for (const [question, expectedId] of expectations) {
  const top = findMatches(question, tips)[0];
  check(`"${question}" -> ${expectedId}`, top?.tip.id === expectedId, `got ${top?.tip.id ?? "no match"}`);
}

// The four example questions shown in the UI must all find an answer.
for (const question of EXAMPLE_QUESTIONS) {
  check(`example question works: "${question}"`, generateReply(question, tips).kind === "tips");
}

// Broad or unrelated questions must NOT produce irrelevant advice.
for (const question of ["Kuidas elada?", "Mis ilm homme on?", "elutuba", "asdfgh", "", "Kuidas sisustada?", "Kuidas pesta autot?", "Mis on parim telefon?", "Palun aita mind"]) {
  check(`no irrelevant match for "${question}"`, generateReply(question, tips).kind !== "tips", generateReply(question, tips).text.slice(0, 60));
}

// Greetings, thanks and fallback.
check("greeting: Tere", generateReply("Tere!", tips).kind === "greeting");
check("greeting + question answers the question", generateReply("Tere! Kuhu panna diivan?", tips).kind === "tips");
check("thanks: Aitäh", generateReply("Aitäh!", tips).kind === "thanks");
const fallback = generateReply("Mis on elu mõte?", tips);
check("fallback lists 4 examples", fallback.kind === "fallback" && fallback.text.split("•").length - 1 === 4);

// Deterministic: same input -> same output.
check("deterministic", generateReply("Kuhu panna diivan?", tips).text === generateReply("Kuhu panna diivan?", tips).text);

// At most 2 tips; reply styles differ; caveat included.
const q = "Millised värvid sobivad beeži diivaniga?";
const counts = findMatches(q, tips).length;
check("returns 1-2 tips", counts >= 1 && counts <= 2, String(counts));
const short = generateReply(q, tips, { style: "SHORT" }).text;
const detailed = generateReply(q, tips, { style: "DETAILED" }).text;
const beginner = generateReply(q, tips, { style: "BEGINNER" }).text;
check("short reply is shorter than detailed", short.length < detailed.length);
check("detailed reply contains caveat", detailed.includes("Pane tähele"));
check("beginner reply contains caveat", beginner.includes("Praktiline märkus"));
check("attachment notice added", generateReply(q, tips, { hasAttachment: true }).text.includes("demoversioon ei analüüsi"));

console.log("\n--- Sample replies ---");
for (const style of ["SHORT", "BEGINNER", "DETAILED"] as const) {
  console.log(`\n[${style}] ${q}\n${generateReply(q, tips, { style }).text}`);
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
