import { fetchSheet } from "./sheetsClient";

/**
 * Header-driven access to sheet data. Every repo in repo.ts reads and writes
 * columns by NAME (e.g. "Status", "Last Login"), not by position — so adding
 * a new column, reordering existing ones, or extending a tab in the Google
 * Sheet never requires a code change here. Renaming a column the app
 * actually uses will surface as a clear "Column X was not found" error
 * instead of silently writing to the wrong cell.
 */

const HEADER_CACHE_TTL_MS = 15_000;
const headerCache = new Map<string, { headers: string[]; expiresAt: number }>();

export interface SheetRow {
  /** 1-based row number in the actual sheet (header row is 1). */
  rowIndex: number;
  cells: Record<string, string>;
}

function cacheHeaders(sheetName: string, headers: string[]) {
  headerCache.set(sheetName, { headers, expiresAt: Date.now() + HEADER_CACHE_TTL_MS });
}

/**
 * Current header row for a tab, briefly cached so a burst of writes (e.g.
 * checking off several tasks in a row) doesn't re-fetch the sheet every
 * time. A real column edit is picked up within ~15s, or immediately after
 * any `fetchRows` call for that sheet.
 */
export async function getHeaders(sheetName: string): Promise<string[]> {
  const cached = headerCache.get(sheetName);
  if (cached && cached.expiresAt > Date.now()) return cached.headers;
  const rows = await fetchSheet(sheetName);
  const headers = rows[0] ?? [];
  cacheHeaders(sheetName, headers);
  return headers;
}

/**
 * Some tabs (e.g. "Md Reports") reuse the same header text for two distinct
 * columns (a "File Url"/"Remark" pair at creation time, and another
 * "File Url"/"Remark" pair for completion). The first occurrence keeps the
 * plain header name; the 2nd, 3rd, etc. get a "#2", "#3" suffix so both are
 * reachable instead of the later one silently clobbering the earlier one.
 */
function disambiguatedKey(header: string, occurrence: number): string {
  return occurrence === 1 ? header : `${header}#${occurrence}`;
}

/** Fetch every data row of a sheet, keyed by its own header row. */
export async function fetchRows(sheetName: string): Promise<SheetRow[]> {
  const rows = await fetchSheet(sheetName);
  const headers = rows[0] ?? [];
  cacheHeaders(sheetName, headers);
  return rows.slice(1).map((row, i) => {
    const cells: Record<string, string> = {};
    const counts = new Map<string, number>();
    headers.forEach((h, idx) => {
      if (!h) return;
      const occurrence = (counts.get(h) ?? 0) + 1;
      counts.set(h, occurrence);
      cells[disambiguatedKey(h, occurrence)] = row[idx] ?? "";
    });
    return { rowIndex: i + 2, cells };
  });
}

/**
 * Build a row array in the sheet's *current* column order from a
 * {header: value} map. Columns the caller doesn't mention come out as ""
 * (which the Apps Script `update` action treats as "leave unchanged", and
 * `insert` simply leaves blank) — so unknown/extra columns are never touched.
 * For a header that appears more than once, target the 2nd/3rd/etc. one with
 * the same "#2"/"#3" suffixed key `fetchRows` and `columnNumberNth` use.
 */
export function buildRow(headers: string[], values: Record<string, unknown>): unknown[] {
  const counts = new Map<string, number>();
  return headers.map((h) => {
    if (!h) return "";
    const occurrence = (counts.get(h) ?? 0) + 1;
    counts.set(h, occurrence);
    const key = disambiguatedKey(h, occurrence);
    return values[key] !== undefined && values[key] !== null ? values[key] : "";
  });
}

/** 1-based column number for a header name. Throws instead of silently mis-writing. */
export function columnNumber(headers: string[], name: string): number {
  const idx = headers.indexOf(name);
  if (idx === -1) {
    throw new Error(`Column "${name}" was not found — add a column with this exact header to use this feature.`);
  }
  return idx + 1;
}

/** 1-based column number for the Nth column sharing a header name (e.g. the 2nd "File Url"). */
export function columnNumberNth(headers: string[], name: string, occurrence: number): number {
  let seen = 0;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === name) {
      seen++;
      if (seen === occurrence) return i + 1;
    }
  }
  throw new Error(`Column "${name}" (occurrence ${occurrence}) was not found.`);
}
