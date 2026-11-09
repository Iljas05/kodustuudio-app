// Self-check for API validation, rate limiting and safe error handling.
// Run with: npm run test:validation   (no database or dev server needed)
import { ApiError } from "../src/lib/api-error";
import { handleError } from "../src/lib/api";
import { LIMITS } from "../src/lib/constants";
import { checkRateLimit, resetRateLimits } from "../src/lib/rate-limit";
import {
  isValidId, titleFromMessage, validateAttachment, validateMessageInput, validatePromptInput, validateSettingsPatch,
} from "../src/lib/validation";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}

/** Runs fn and returns the ApiError it throws (or null if it does not throw). */
function errorOf(fn: () => unknown): ApiError | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof ApiError ? error : null;
  }
}
function rejects(name: string, fn: () => unknown, messagePart: string) {
  const error = errorOf(fn);
  check(name, error?.status === 400 && error.message.includes(messagePart), error ? `${error.status} ${error.message}` : "no error");
}

// ---- Prompts ----
const okPrompt = validatePromptInput({ name: "  Minu viip  ", content: "  Tekst  " });
check("prompt: whitespace trimmed", okPrompt.name === "Minu viip" && okPrompt.content === "Tekst");
rejects("prompt: empty name", () => validatePromptInput({ name: "   ", content: "x" }), "nimi");
rejects("prompt: empty content", () => validatePromptInput({ name: "x", content: "" }), "tekst");
rejects("prompt: name too long", () => validatePromptInput({ name: "a".repeat(61), content: "x" }), "60");
rejects("prompt: content too long", () => validatePromptInput({ name: "x", content: "a".repeat(1001) }), "1000");
check("prompt: name of exactly 60 accepted", validatePromptInput({ name: "a".repeat(60), content: "x" }).name.length === 60);
rejects("prompt: not an object", () => validatePromptInput("hello"), "vigane");
rejects("prompt: numbers rejected as text", () => validatePromptInput({ name: 5, content: 6 }), "nimi");
check("prompt: control characters removed", validatePromptInput({ name: "a\u0000b", content: "x" }).name === "ab");

// ---- Settings ----
const ok = validateSettingsPatch({ model: "Claude", temperature: 1.234, topP: 0.5, title: " Köök " });
check("settings: valid values accepted and rounded", ok.model === "Claude" && ok.temperature === 1.23 && ok.topP === 0.5 && ok.title === "Köök");
rejects("settings: unknown model", () => validateSettingsPatch({ model: "GPT-9000" }), "mudel");
rejects("settings: temperature too high", () => validateSettingsPatch({ temperature: 2.5 }), "Temperatuur");
rejects("settings: temperature negative", () => validateSettingsPatch({ temperature: -1 }), "Temperatuur");
rejects("settings: temperature not a number", () => validateSettingsPatch({ temperature: "hot" }), "Temperatuur");
rejects("settings: temperature NaN", () => validateSettingsPatch({ temperature: Number.NaN }), "Temperatuur");
rejects("settings: topP above 1", () => validateSettingsPatch({ topP: 1.01 }), "Top-P");
rejects("settings: empty title", () => validateSettingsPatch({ title: "  " }), "pealkiri");
rejects("settings: title too long", () => validateSettingsPatch({ title: "a".repeat(81) }), "pealkiri");
rejects("settings: weird prompt id", () => validateSettingsPatch({ systemPromptId: "x'; DROP TABLE" }), "viipa");
check("settings: unknown fields ignored", Object.keys(validateSettingsPatch({ isAdmin: true, id: "x" })).length === 0);
check("settings: empty body gives empty patch", Object.keys(validateSettingsPatch({})).length === 0);

// ---- Messages and attachments ----
const msg = validateMessageInput({ content: "  Kuhu panna diivan?  " });
check("message: trimmed, no attachment", msg.content === "Kuhu panna diivan?" && msg.attachment === undefined);
rejects("message: empty", () => validateMessageInput({ content: "   " }), "Kirjuta");
rejects("message: too long", () => validateMessageInput({ content: "a".repeat(LIMITS.messageLength + 1) }), "liiga pikk");
check("message: max length accepted", validateMessageInput({ content: "a".repeat(LIMITS.messageLength) }).content.length === LIMITS.messageLength);

const goodFile = { name: "tuba.jpg", type: "image/jpeg", size: 1234 };
check("attachment: valid file accepted", validateMessageInput({ content: "x", attachment: goodFile }).attachment?.name === "tuba.jpg");
for (const type of ["image/png", "image/webp", "application/pdf", "text/plain"]) {
  check(`attachment: ${type} accepted`, validateAttachment({ ...goodFile, type }).type === type);
}
rejects("attachment: unsupported type (exe)", () => validateAttachment({ ...goodFile, type: "application/x-msdownload" }), "ei ole lubatud");
rejects("attachment: unsupported type (gif)", () => validateAttachment({ ...goodFile, type: "image/gif" }), "ei ole lubatud");
rejects("attachment: over 5 MB", () => validateAttachment({ ...goodFile, size: 5 * 1024 * 1024 + 1 }), "liiga suur");
check("attachment: exactly 5 MB accepted", validateAttachment({ ...goodFile, size: 5 * 1024 * 1024 }).size === 5 * 1024 * 1024);
rejects("attachment: zero size", () => validateAttachment({ ...goodFile, size: 0 }), "suurus");
rejects("attachment: fractional size", () => validateAttachment({ ...goodFile, size: 10.5 }), "suurus");
check("attachment: folder path stripped from name", validateAttachment({ ...goodFile, name: "C:\\Users\\me\\secret\\foto.png" }).name === "foto.png");
rejects("attachment: empty name", () => validateAttachment({ ...goodFile, name: "" }), "nimi");
check("attachment: extra fields (e.g. file contents) ignored", !("data" in validateAttachment({ ...goodFile, data: "AAAA" })));

// ---- Ids and titles ----
check("id: normal cuid accepted", isValidId("cmabc123def456ghi789jkl0m"));
check("id: SQL-like text rejected", !isValidId("1; DROP TABLE"));
check("id: empty rejected", !isValidId(""));
check("title: short message kept", titleFromMessage("Kuhu panna diivan?") === "Kuhu panna diivan?");
check("title: long message shortened", titleFromMessage("a".repeat(100)).length <= 41 && titleFromMessage("a".repeat(100)).endsWith("…"));

// ---- Rate limiting ----
resetRateLimits();
let allowed = 0;
for (let i = 0; i < 20; i++) if (checkRateLimit("v1", 15, 60_000, 1000) === 0) allowed++;
check("rate limit: 15 of 20 requests allowed", allowed === 15, String(allowed));
check("rate limit: blocked visitor told how long to wait", checkRateLimit("v1", 15, 60_000, 1000) > 0);
check("rate limit: other visitors unaffected", checkRateLimit("v2", 15, 60_000, 1000) === 0);
check("rate limit: allowed again after the window", checkRateLimit("v1", 15, 60_000, 1000 + 60_001) === 0);

// ---- Safe error handling ----
async function bodyOf(error: unknown) {
  const response = handleError(error);
  return { status: response.status, text: JSON.stringify(await response.json()) };
}
(async () => {
  const quiet = console.error;
  console.error = () => {}; // handleError logs; keep the test output readable
  try {
    // Built from pieces so secret scanners do not mistake this fake test value for a real credential.
    const secret = ["postgresql:", "//admin:", "SuperSecret123", "@db.internal:5432/prod"].join("");
    const dbDown = Object.assign(new Error(`connect ECONNREFUSED ${secret}`), { code: "ECONNREFUSED" });
    const result = await bodyOf(dbDown);
    check("errors: database down -> 503", result.status === 503, String(result.status));
    check("errors: connection string not leaked", !result.text.includes("SuperSecret123") && !result.text.includes("db.internal"), result.text);
    check("errors: message is Estonian", result.text.includes("Andmebaas"));

    const wrapped = await bodyOf(new Error("query failed", { cause: Object.assign(new Error("x"), { code: "P1001" }) }));
    check("errors: wrapped database error detected", wrapped.status === 503, String(wrapped.status));

    const missingUrl = await bodyOf(new Error("DATABASE_URL is not set"));
    check("errors: missing DATABASE_URL -> 503 without details", missingUrl.status === 503 && !missingUrl.text.includes("DATABASE_URL"), missingUrl.text);

    const unknown = await bodyOf(new Error(`SELECT * FROM "Message" WHERE secret = '${secret}'`));
    check("errors: unknown error -> generic 500, no SQL", unknown.status === 500 && !unknown.text.includes("SELECT") && !unknown.text.includes("SuperSecret123"), unknown.text);

    const apiError = await bodyOf(new ApiError(404, "Vestlust ei leitud."));
    check("errors: ApiError keeps its status and message", apiError.status === 404 && apiError.text.includes("Vestlust ei leitud."));
  } finally {
    console.error = quiet;
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
})();
