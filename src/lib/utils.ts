export function genId(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Local-timezone YYYY-MM-DD, unlike Date#toISOString() which is UTC-based. */
export function toLocalISODate(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}

export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function formatDisplayDate(iso: string): string {
  return formatDateIndian(iso);
}

export function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Local daypart used to soft-suggest Morning Plan vs Evening Review mode. */
export function getDaypart(): "morning" | "day" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "day";
  return "evening";
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateIndian(iso: string): string {
  if (!iso) return "";
  const dateMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${day}-${month}-${year}`;
  }
  return iso;
}

export function formatTimestampIndian(iso: string): string {
  if (!iso) return "";
  try {
    // If it's already DD-MM-YYYY format, return as is
    if (iso.match(/^(\d{2})-(\d{2})-(\d{4})/)) {
      return iso;
    }

    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

const AVATAR_COLORS = ["#2dd4bf", "#f97316", "#60a5fa", "#f472b6", "#a78bfa", "#facc15", "#34d399", "#fb7185"];

export function colorForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
