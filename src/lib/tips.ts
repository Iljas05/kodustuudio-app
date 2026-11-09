// Loads and validates the interior design tips from data/kodustuudio_sisustusnouanded.csv.
// The CSV is the single source of truth: it is parsed once on the server and kept in memory.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

export interface Tip {
  id: string;
  category: string;
  room: string;
  keywords: string[];
  tip: string;
  caveat: string;
}

export const EXPECTED_TIP_COUNT = 96;
const REQUIRED_COLUMNS = ["id", "category", "room", "keywords_et", "tip_et", "caveat_et"] as const;
const CSV_PATH = path.join(process.cwd(), "data", "kodustuudio_sisustusnouanded.csv");

/** Thrown when the CSV is missing or invalid. The message is safe to show to users. */
export class TipsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TipsDataError";
  }
}

/** Parses and validates CSV text. Exported separately so it can be tested without the file system. */
export function parseTips(csvText: string): Tip[] {
  let rows: Record<string, string>[];
  try {
    rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true, // tolerate a UTF-8 byte order mark
      trim: true,
    });
  } catch {
    throw new TipsDataError("Sisustusnõuannete CSV-faili ei õnnestunud lugeda: faili vorming on vigane.");
  }

  if (rows.length === 0) {
    throw new TipsDataError("Sisustusnõuannete CSV-fail on tühi.");
  }

  const missing = REQUIRED_COLUMNS.filter((column) => !(column in rows[0]));
  if (missing.length > 0) {
    throw new TipsDataError(`Sisustusnõuannete CSV-failist puuduvad veerud: ${missing.join(", ")}.`);
  }

  if (rows.length !== EXPECTED_TIP_COUNT) {
    throw new TipsDataError(
      `Sisustusnõuannete CSV-failis peab olema täpselt ${EXPECTED_TIP_COUNT} rida, kuid leiti ${rows.length}.`,
    );
  }

  const seenIds = new Set<string>();
  return rows.map((row, index) => {
    const line = index + 2; // +1 for the header, +1 because humans count from 1
    for (const column of REQUIRED_COLUMNS) {
      if (!row[column]) {
        throw new TipsDataError(`Sisustusnõuannete CSV-failis on real ${line} tühi veerg „${column}”.`);
      }
    }
    if (seenIds.has(row.id)) {
      throw new TipsDataError(`Sisustusnõuannete CSV-failis kordub id „${row.id}”.`);
    }
    seenIds.add(row.id);

    return {
      id: row.id,
      category: row.category,
      room: row.room,
      keywords: row.keywords_et
        .split(";")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      tip: row.tip_et,
      caveat: row.caveat_et,
    };
  });
}

let cachedTips: Tip[] | null = null;

/** Returns all tips, reading the CSV file only the first time. */
export function loadTips(): Tip[] {
  if (cachedTips) return cachedTips;

  let csvText: string;
  try {
    csvText = readFileSync(CSV_PATH, "utf-8"); // CSV is UTF-8, so õ, ä, ö, ü are preserved
  } catch {
    throw new TipsDataError("Sisustusnõuannete CSV-faili ei leitud. Kontrolli, et fail data/kodustuudio_sisustusnouanded.csv on olemas.");
  }

  cachedTips = parseTips(csvText);
  return cachedTips;
}
