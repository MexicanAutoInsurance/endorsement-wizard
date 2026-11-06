import { sql } from "./db";
import {
  createSession,
  type EndorsementSession,
  type SessionStatus,
} from "./types";

interface SessionRow {
  id: string;
  client_token: string;
  status: string;
  payload: EndorsementSession | string;
  created_at: string;
  updated_at: string;
  client_link_sent_at: string | null;
  client_submitted_at: string | null;
}

function parsePayload(raw: EndorsementSession | string): EndorsementSession {
  if (typeof raw === "string") return JSON.parse(raw) as EndorsementSession;
  return raw;
}

function hydrate(row: SessionRow): EndorsementSession {
  const payload = parsePayload(row.payload);
  return {
    ...payload,
    id: row.id,
    clientToken: row.client_token,
    status: row.status as SessionStatus,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString(),
    updatedAt:
      typeof row.updated_at === "string"
        ? row.updated_at
        : new Date(row.updated_at).toISOString(),
    clientLinkSentAt: row.client_link_sent_at
      ? typeof row.client_link_sent_at === "string"
        ? row.client_link_sent_at
        : new Date(row.client_link_sent_at).toISOString()
      : null,
    clientSubmittedAt: row.client_submitted_at
      ? typeof row.client_submitted_at === "string"
        ? row.client_submitted_at
        : new Date(row.client_submitted_at).toISOString()
      : null,
  };
}

export async function listSessions(): Promise<EndorsementSession[]> {
  const rows = await sql<SessionRow>(
    `select id, client_token, status, payload, created_at, updated_at,
            client_link_sent_at, client_submitted_at
       from endorsement_sessions
      order by updated_at desc`,
  );
  return rows.map(hydrate);
}

export async function getSessionById(id: string): Promise<EndorsementSession | null> {
  const rows = await sql<SessionRow>(
    `select id, client_token, status, payload, created_at, updated_at,
            client_link_sent_at, client_submitted_at
       from endorsement_sessions
      where id = $1`,
    [id],
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function getSessionByToken(
  token: string,
): Promise<EndorsementSession | null> {
  const rows = await sql<SessionRow>(
    `select id, client_token, status, payload, created_at, updated_at,
            client_link_sent_at, client_submitted_at
       from endorsement_sessions
      where client_token = $1`,
    [token],
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function insertSession(
  session: EndorsementSession = createSession(),
): Promise<EndorsementSession> {
  const now = new Date().toISOString();
  const next: EndorsementSession = {
    ...session,
    createdAt: session.createdAt || now,
    updatedAt: now,
  };
  await sql(
    `insert into endorsement_sessions
      (id, client_token, status, payload, created_at, updated_at, client_link_sent_at, client_submitted_at)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
    [
      next.id,
      next.clientToken,
      next.status,
      JSON.stringify(next),
      next.createdAt,
      next.updatedAt,
      next.clientLinkSentAt,
      next.clientSubmittedAt,
    ],
  );
  return next;
}

export async function saveSession(
  session: EndorsementSession,
): Promise<EndorsementSession> {
  const now = new Date().toISOString();
  const next: EndorsementSession = { ...session, updatedAt: now };
  await sql(
    `update endorsement_sessions
        set status = $2,
            payload = $3::jsonb,
            updated_at = $4,
            client_link_sent_at = $5,
            client_submitted_at = $6,
            client_token = $7
      where id = $1`,
    [
      next.id,
      next.status,
      JSON.stringify(next),
      next.updatedAt,
      next.clientLinkSentAt,
      next.clientSubmittedAt,
      next.clientToken,
    ],
  );
  return next;
}

export async function deleteSession(id: string): Promise<void> {
  await sql(`delete from endorsement_sessions where id = $1`, [id]);
}

/**
 * Merge a client submission into the stored session.
 * Never accepts feeWaived / feeWaiveReason / attestation from the client.
 */
export function mergeClientSubmission(
  current: EndorsementSession,
  incoming: Partial<EndorsementSession>,
  opts: { submit: boolean },
): EndorsementSession {
  const locked = current.changeTypesLockedByStaff && current.changeTypes.length > 0;
  let changeTypes = locked
    ? [...current.changeTypes]
    : Array.isArray(incoming.changeTypes)
      ? incoming.changeTypes
      : current.changeTypes;
  // Forced towed Yes may add towed_units even when staff locked other types
  if (
    (incoming.towedBringing === "yes" || current.towedBringing === "yes") &&
    !changeTypes.includes("towed_units")
  ) {
    changeTypes = [...changeTypes, "towed_units"];
  }

  const next: EndorsementSession = {
    ...current,
    policy: {
      ...current.policy,
      // Client may update phone; CRT/name/email stay staff-owned unless empty
      phone:
        typeof incoming.policy?.phone === "string"
          ? incoming.policy.phone
          : current.policy.phone,
      email: current.policy.email,
      insuredName: current.policy.insuredName,
      crtNumber: current.policy.crtNumber,
      beforeNotes: current.policy.beforeNotes,
    },
    changeTypes,
    changeTypesLockedByStaff: current.changeTypesLockedByStaff,
    effectiveDate:
      typeof incoming.effectiveDate === "string"
        ? incoming.effectiveDate
        : current.effectiveDate,
    priorEffectiveDate:
      typeof incoming.priorEffectiveDate === "string"
        ? incoming.priorEffectiveDate
        : current.priorEffectiveDate,
    feeAcknowledged: Boolean(incoming.feeAcknowledged) || current.feeAcknowledged,
    // STAFF-ONLY — ignore any client attempt to waive
    feeWaived: current.feeWaived,
    feeWaiveReason: current.feeWaiveReason,
    missedInfoFeeAcknowledged:
      Boolean(incoming.missedInfoFeeAcknowledged) || current.missedInfoFeeAcknowledged,
    towedBringing:
      incoming.towedBringing === "yes" || incoming.towedBringing === "no"
        ? incoming.towedBringing
        : current.towedBringing,
    vehicleChange: incoming.vehicleChange ?? current.vehicleChange,
    vehicleCorrections: incoming.vehicleCorrections ?? current.vehicleCorrections,
    towedUnits: incoming.towedUnits ?? current.towedUnits,
    termChange: incoming.termChange ?? current.termChange,
    nameChange: incoming.nameChange ?? current.nameChange,
    contactChange: incoming.contactChange ?? current.contactChange,
    specialChange: incoming.specialChange ?? current.specialChange,
    optionalCoverages: incoming.optionalCoverages ?? current.optionalCoverages,
    otherDrivers: incoming.otherDrivers ?? current.otherDrivers,
    attestation: current.attestation,
  };

  if (opts.submit) {
    next.clientSubmittedAt = new Date().toISOString();
    next.status = "client_submitted";
  }

  return next;
}
