import { promises as fs } from "fs";
import path from "path";

/**
 * Append a row to a local JSON file as a lightweight lead-capture backend.
 *
 * When GOOGLE_SHEETS_API_KEY and GOOGLE_SHEET_ID are set in .env.local,
 * this can be upgraded to write directly to Google Sheets.
 * For now, we persist to data/<sheet>.json so zero leads are lost.
 */
export async function appendToSheet(sheet: string, row: string[]) {
  const dataDir = path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, `${sheet}.json`);

  await fs.mkdir(dataDir, { recursive: true });

  let existing: string[][] = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // File doesn't exist yet
  }

  existing.push(row);
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf-8");
}
