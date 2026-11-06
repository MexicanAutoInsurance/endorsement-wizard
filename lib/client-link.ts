import type { EndorsementSession } from "./types";

export function clientFillUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/client/${encodeURIComponent(token)}`;
}

export function buildClientInviteEmail(
  session: EndorsementSession,
  link: string,
): { subject: string; body: string } {
  const name = session.policy.insuredName.trim() || "there";
  const crt = session.policy.crtNumber.trim() || "(policy)";
  const types =
    session.changeTypes.length > 0
      ? session.changeTypes
          .map((t) => t.replace(/_/g, " "))
          .join(", ")
      : null;

  const subject = `Mexican Auto Insurance — please complete your endorsement details (${crt})`;
  const body = [
    `Hello ${name},`,
    "",
    `Lewis and Lewis / MexicanAutoInsurance.com needs a few details to process an endorsement on policy ${crt}.`,
    "",
    `Please open this secure link on your phone or computer and complete the short form:`,
    link,
    "",
    types
      ? `You’ll only be asked about: ${types} — plus a required towed-unit question.`
      : `The form will ask which changes you need, plus a required towed-unit question.`,
    "",
    `Important:`,
    `• Mexican law requires every towed unit (trailer, boat, outboard, dinghy, camper, etc.) to be listed — boat trailer, boat, outboard, and dinghy are SEPARATE units.`,
    `• If anything needed is missing, we may need another endorsement request and another fee ($15 for 1–20 day policies / $40 for 1 Month or longer).`,
    "",
    `Questions? Call (800) 966-6830 or email Info@MexicanAutoInsurance.com.`,
    "",
    `Thank you,`,
    `Lewis and Lewis Insurance Agency, Inc.`,
  ].join("\n");

  return { subject, body };
}
