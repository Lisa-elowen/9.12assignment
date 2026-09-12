import { Session } from "./types";

const KEY = "pressurecoach_sessions";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  try {
    const all = [session, ...loadSessions()].slice(0, 20);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export function loadSessionById(id: string): Session | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}
