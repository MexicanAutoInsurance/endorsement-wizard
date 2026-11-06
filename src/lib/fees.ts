import type { EndorsementSession, TermOption } from "../types";

/**
 * Fee helpers for the staff endorsement wizard.
 *
 * STAFF-ONLY: `feeWaived` / waive UI must never appear on future client-facing
 * surfaces (magic-link / public forms). Clients may see the resulting Fee: $N
 * or Fee: Waived line in a confirmation email after staff decided.
 */

/** Short-term 1–20 days → $15; 1 Month+ → $40 */
export function feeAmountForTerm(term: TermOption | "" | undefined): 15 | 40 {
  if (term === "1–20 Days") return 15;
  return 40;
}

/**
 * Prefer new term after a term change; else current term on the change;
 * else infer nothing → default $40 (month+ class).
 */
export function resolveFeeTerm(session: EndorsementSession): TermOption | "" {
  if (session.changeTypes.includes("change_term")) {
    if (session.termChange.newTerm) return session.termChange.newTerm;
    if (session.termChange.currentTerm) return session.termChange.currentTerm;
  }
  // Staff can still set current term without selecting change_term via termChange.currentTerm
  if (session.termChange.currentTerm) return session.termChange.currentTerm;
  if (session.termChange.newTerm) return session.termChange.newTerm;
  return "";
}

export function endorsementFeeAmount(session: EndorsementSession): 15 | 40 {
  return feeAmountForTerm(resolveFeeTerm(session));
}

export function feeLine(session: EndorsementSession): string {
  const amount = endorsementFeeAmount(session);
  if (session.feeWaived) {
    const reason = session.feeWaiveReason.trim();
    return reason ? `Fee: Waived ($${amount} — ${reason})` : `Fee: Waived ($${amount})`;
  }
  return `Fee: $${amount}`;
}

export function feeContextLabel(session: EndorsementSession): string {
  const amount = endorsementFeeAmount(session);
  const term = resolveFeeTerm(session);
  const termNote = term
    ? term === "1–20 Days"
      ? "short-term 1–20 days"
      : `${term} (1 Month or longer)`
    : "defaulting to $40 until term is known";
  return `$${amount} endorsement fee (${termNote}; one fee for this stacked session)`;
}
