import { useEffect, useState } from "react";
import { mdReportsRepo, plansRepo, reportsRepo } from "./repo";
import type { EODReport, MdReportEntry, PlanTask } from "./types";

/**
 * A tiny shared cache so Dashboard / Daily Tracker / EOD Report all read the
 * same in-memory copy of data instead of each re-fetching the API on every
 * visit. Switching pages paints instantly from cache while a background
 * refresh silently keeps it current. Writes call `mutate` to update the
 * screen immediately while the network call completes in the background.
 * `refresh(true)` force-resyncs from the server (e.g. after a delete).
 */
const POLL_INTERVAL_MS = 45_000;
/** Random delay so multiple caches don't all poll at the same moment. */
function jitter(maxMs = 10_000) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.random() * maxMs));
}

class DataCache<T> {
  private data: T | null = null;
  private inflight: Promise<T> | null = null;
  private lastFetchedAt = 0;
  private listeners = new Set<() => void>();
  private fetcher: () => Promise<T>;
  private minIntervalMs: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(fetcher: () => Promise<T>, minIntervalMs = 4000) {
    this.fetcher = fetcher;
    this.minIntervalMs = minIntervalMs;
  }

  get(): T | null {
    return this.data;
  }

  /** Polls in the background for as long as at least one component is subscribed. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    if (!this.pollTimer) {
      // Stagger poll start with random jitter so different caches
      // don't all fire their first poll at the exact same time.
      jitter().then(() => {
        if (this.listeners.size === 0) return; // unsubscribed before jitter elapsed
        this.pollTimer = setInterval(() => {
          this.refresh().catch(() => {});
        }, POLL_INTERVAL_MS);
      });
    }
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0 && this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  /** Apply a local change immediately — no network call, no waiting. */
  mutate(updater: (current: T | null) => T) {
    this.data = updater(this.data);
    this.notify();
  }

  /** Re-fetch from the server. `force` bypasses the min-interval throttle. */
  async refresh(force = false): Promise<T> {
    if (this.inflight) return this.inflight;
    if (!force && this.data !== null && Date.now() - this.lastFetchedAt < this.minIntervalMs) {
      return this.data;
    }
    this.inflight = this.fetcher()
      .then((d) => {
        this.data = d;
        this.lastFetchedAt = Date.now();
        this.notify();
        return d;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}

export const plansCache = new DataCache<PlanTask[]>(() => plansRepo.all());
export const reportsCache = new DataCache<EODReport[]>(() => reportsRepo.all());
export const mdReportsCache = new DataCache<MdReportEntry[]>(() => mdReportsRepo.all());

/** Subscribes a component to a DataCache: instant cached value on mount, live updates after. */
export function useSheetCache<T>(cache: DataCache<T>) {
  const [data, setData] = useState<T | null>(cache.get());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = cache.subscribe(() => setData(cache.get()));
    cache
      .refresh()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache]);

  return { data, error };
}
