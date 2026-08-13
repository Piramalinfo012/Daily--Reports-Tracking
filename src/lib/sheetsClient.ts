/**
 * Thin client for the Google Apps Script web app that fronts our Google Sheet.
 *
 * Important: POST bodies are sent as `application/x-www-form-urlencoded`
 * (via URLSearchParams) rather than JSON. Apps Script's `doPost` reads
 * `e.parameter`, and a form-encoded body is a CORS "simple request" so the
 * browser never sends an OPTIONS preflight — which Apps Script deployments
 * do not handle. Switching this to JSON will break cross-origin requests.
 */

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export class SheetsApiError extends Error {}

/**
 * This Apps Script deployment does not handle overlapping requests reliably
 * — firing several at once (e.g. every sheet loading on page mount)
 * consistently 404s on the sandboxed script.googleusercontent.com/macros/echo
 * redirect, not just occasionally. So every request (read or write) goes
 * through one shared queue and runs strictly one at a time. fetchWithRetry
 * is a second safety net on top, for any other transient network blip.
 */
let requestQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const result = requestQueue.then(run, run);
  requestQueue = result.then(
    () => delay(800),
    () => delay(800),
  );
  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(baseUrl: string, attempts = 5): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      // Append a fresh cache-buster on EVERY attempt to avoid caching a broken 302 redirect
      const url = baseUrl.includes("?") ? `${baseUrl}&t=${Date.now()}` : `${baseUrl}?t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) return res;
      lastErr = new SheetsApiError(`Network error (${res.status})`);
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) await delay(800 * (i + 1));
  }
  throw lastErr;
}

interface RawSheetResponse {
  success: boolean;
  error?: string;
  data?: string[][];
  rows?: number;
}

interface RawActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  fileUrl?: string;
  rowsInserted?: number;
}

async function post(params: Record<string, string>): Promise<RawActionResponse> {
  return enqueue(async () => {
    const body = new URLSearchParams(params);
    // Add cache-buster to POST URL too — prevents stale 302 redirect caching
    const url = BASE_URL.includes("?") ? `${BASE_URL}&t=${Date.now()}` : `${BASE_URL}?t=${Date.now()}`;
    const res = await fetch(url, { method: "POST", body });
    if (!res.ok) throw new SheetsApiError(`Network error (${res.status})`);
    const json = (await res.json()) as RawActionResponse;
    if (!json.success) throw new SheetsApiError(json.error || "Request failed");
    return json;
  });
}

export async function fetchSheet(sheetName: string): Promise<string[][]> {
  return enqueue(async () => {
    const url = `${BASE_URL}?sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetchWithRetry(url);
    const json = (await res.json()) as RawSheetResponse;
    if (!json.success) throw new SheetsApiError(json.error || "Failed to load sheet");
    return json.data ?? [];
  });
}

export async function insertRow(sheetName: string, rowData: unknown[]): Promise<void> {
  await post({ action: "insert", sheetName, rowData: JSON.stringify(rowData) });
}

export async function batchInsert(sheetName: string, rowsData: unknown[][]): Promise<void> {
  await post({ action: "batchInsert", sheetName, rowsData: JSON.stringify(rowsData) });
}

/** Merge-update: empty/undefined values in rowData keep the existing cell value. */
export async function updateRow(sheetName: string, rowIndex: number, rowData: unknown[]): Promise<void> {
  await post({ action: "update", sheetName, rowIndex: String(rowIndex), rowData: JSON.stringify(rowData) });
}

export async function updateCell(
  sheetName: string,
  rowIndex: number,
  columnIndex: number,
  value: string,
): Promise<void> {
  await post({
    action: "updateCell",
    sheetName,
    rowIndex: String(rowIndex),
    columnIndex: String(columnIndex),
    value,
  });
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  await post({ action: "delete", sheetName, rowIndex: String(rowIndex) });
}

export async function uploadFile(
  base64Data: string,
  fileName: string,
  mimeType: string,
  folderId: string,
): Promise<string> {
  const res = await post({ action: "uploadFile", base64Data, fileName, mimeType, folderId });
  if (!res.fileUrl) throw new SheetsApiError("Upload succeeded but no file URL was returned");
  return res.fileUrl;
}
