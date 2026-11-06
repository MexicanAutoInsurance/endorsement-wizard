import type { EndorsementSession } from "../types";
import { createSession } from "../types";

const KEY = "mai-endorsement-sessions-v2";
const ACTIVE_KEY = "mai-endorsement-active-v2";

export function loadSessions(): EndorsementSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EndorsementSession[];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: EndorsementSession[]): void {
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function upsertSession(session: EndorsementSession): void {
  const all = loadSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  const next = { ...session, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  saveSessions(all);
  localStorage.setItem(ACTIVE_KEY, next.id);
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSessionId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function deleteSession(id: string): void {
  const all = loadSessions().filter((s) => s.id !== id);
  saveSessions(all);
  if (getActiveSessionId() === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function startNewSession(): EndorsementSession {
  const session = createSession();
  upsertSession(session);
  return session;
}
