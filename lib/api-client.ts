import type { EndorsementSession } from "./types";

const STAFF_KEY = "mai-staff-access-v1";

export function getStaffAccessCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STAFF_KEY) || "";
}

export function setStaffAccessCode(code: string): void {
  sessionStorage.setItem(STAFF_KEY, code);
}

export function clearStaffAccessCode(): void {
  sessionStorage.removeItem(STAFF_KEY);
}

function staffHeaders(extra?: HeadersInit): HeadersInit {
  const code = getStaffAccessCode();
  return {
    "content-type": "application/json",
    ...(code ? { "x-staff-access": code } : {}),
    ...extra,
  };
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function apiListSessions(): Promise<EndorsementSession[]> {
  const res = await fetch("/api/sessions", { headers: staffHeaders(), cache: "no-store" });
  const data = await parse<{ sessions: EndorsementSession[] }>(res);
  return data.sessions;
}

export async function apiCreateSession(): Promise<EndorsementSession> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: staffHeaders(),
    body: "{}",
  });
  const data = await parse<{ session: EndorsementSession }>(res);
  return data.session;
}

export async function apiGetSession(id: string): Promise<EndorsementSession> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
    headers: staffHeaders(),
    cache: "no-store",
  });
  const data = await parse<{ session: EndorsementSession }>(res);
  return data.session;
}

export async function apiSaveSession(
  session: EndorsementSession,
): Promise<EndorsementSession> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(session.id)}`, {
    method: "PUT",
    headers: staffHeaders(),
    body: JSON.stringify({ session }),
  });
  const data = await parse<{ session: EndorsementSession }>(res);
  return data.session;
}

export async function apiDeleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: staffHeaders(),
  });
  await parse<{ ok: boolean }>(res);
}

export async function apiMarkInviteSent(
  id: string,
): Promise<{ session: EndorsementSession; clientUrl: string }> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}/invite`, {
    method: "POST",
    headers: staffHeaders(),
    body: "{}",
  });
  return parse(res);
}

export async function apiGetClientSession(
  token: string,
): Promise<EndorsementSession> {
  const res = await fetch(`/api/client/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const data = await parse<{ session: EndorsementSession }>(res);
  return data.session;
}

export async function apiSaveClientSession(
  token: string,
  session: Partial<EndorsementSession>,
  submit: boolean,
): Promise<EndorsementSession> {
  const res = await fetch(`/api/client/${encodeURIComponent(token)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session, submit }),
  });
  const data = await parse<{ session: EndorsementSession }>(res);
  return data.session;
}

export async function apiUnlockStaff(code: string): Promise<boolean> {
  const res = await fetch("/api/staff/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Invalid access code");
  }
  setStaffAccessCode(code);
  return true;
}
