import type { EndorsementSession, VehicleFields, TowedUnit } from "@/lib/types";
import {
  CHANGE_TYPE_LABELS,
  TOWED_TYPE_LABELS,
  TOWED_ACTION_LABELS,
  TOWED_SEPARATE_UNITS_HINT,
  WATERCRAFT_RELATED_TYPES,
  isSpecialChange,
} from "@/lib/types";
import { feeLine, feeContextLabel, endorsementFeeAmount } from "@/lib/fees";

function formatVehicle(v: VehicleFields, label: string): string {
  const parts = [
    v.year,
    v.make,
    v.model,
    v.length ? `len ${v.length}` : "",
    v.vin ? `VIN ${v.vin}` : "",
    v.plate ? `plate ${v.plate}` : "",
    v.state,
    v.cmv !== "" ? `CMV $${v.cmv}` : "",
    v.lienholder ? `lienholder ${v.lienholder}` : "",
    v.otherInsurer ? `other insurer ${v.otherInsurer}` : "",
  ].filter(Boolean);
  return `${label}: ${parts.join(" · ") || "(not entered)"}`;
}

function formatTowed(u: TowedUnit, index: number): string {
  const action = u.action ? TOWED_ACTION_LABELS[u.action] : "Action?";
  const type = u.type ? TOWED_TYPE_LABELS[u.type] : "Unit";
  const parts = [
    u.year,
    u.make,
    u.model,
    u.length ? `len ${u.length}` : "",
    u.vin ? `ID/VIN ${u.vin}` : "",
    u.plate ? `plate ${u.plate}` : "",
    u.state,
    u.value !== "" ? `value $${u.value}` : "",
    u.registeredOwner ? `owner ${u.registeredOwner}` : "",
    u.lienholder ? `lienholder ${u.lienholder}` : "",
    u.notes ? `notes ${u.notes}` : "",
  ].filter(Boolean);
  return `${action} ${type} #${index + 1}: ${parts.join(" · ") || "(not entered)"}`;
}

export interface SummaryBlock {
  changes: string[];
  staysSame: string[];
  specialWarnings: string[];
}

export function buildSummary(session: EndorsementSession): SummaryBlock {
  const changes: string[] = [];
  const staysSame: string[] = [];
  const specialWarnings: string[] = [];
  const types = new Set(session.changeTypes);

  const stacked = session.changeTypes.map((t) => CHANGE_TYPE_LABELS[t]).join("; ");
  if (stacked) {
    changes.push(`Requested endorsement stack: ${stacked}`);
  }

  if (types.has("effective_date")) {
    changes.push(
      `Effective date: ${session.priorEffectiveDate || "(prior?)"} → ${session.effectiveDate || "(new?)"}`
    );
  } else {
    changes.push(
      `Effective date of change(s): ${session.effectiveDate || "(not set)"}`
    );
  }

  changes.push(`${feeLine(session)} — ${feeContextLabel(session)}`);
  if (session.missedInfoFeeAcknowledged) {
    changes.push(
      `Acknowledgment: confirming means incomplete or missed details may require a new endorsement request and an additional fee ($${endorsementFeeAmount(session)} per fee rules)`
    );
  }

  if (types.has("change_term")) {
    changes.push(
      `Term amount: ${session.termChange.currentTerm || "?"} → ${session.termChange.newTerm || "?"}`
    );
  } else {
    staysSame.push("Policy term amount: unchanged (not part of this request)");
  }

  if (types.has("insured_name")) {
    changes.push(
      `Insured name: ${session.nameChange.currentName || "?"} → ${session.nameChange.newName || "?"}`
    );
  } else {
    staysSame.push(
      `Insured name on policy: ${session.policy.insuredName || "(as on file)"}`
    );
  }

  if (types.has("contact_fields")) {
    const c = session.contactChange;
    const parts = [
      c.mailingAddress,
      [c.city, c.state, c.zip].filter(Boolean).join(", "),
      c.phone ? `phone ${c.phone}` : "",
      c.email ? `email ${c.email}` : "",
      c.fax ? `fax ${c.fax}` : "",
      c.notes,
    ].filter(Boolean);
    changes.push(`Mailing / contact update: ${parts.join(" · ") || "(details pending)"}`);
  }

  const specialTypes = session.changeTypes.filter(isSpecialChange);
  if (specialTypes.length) {
    specialWarnings.push(
      "SPECIAL CHANGE — supporting documents may be required before issue (Named Insured, DOB, and/or Driver’s License)."
    );
  }

  if (types.has("special_named_insured")) {
    changes.push(
      `SPECIAL — Named Insured: ${session.specialChange.namedInsuredFrom || "?"} → ${session.specialChange.namedInsuredTo || "?"} (docs may be required)`
    );
  }
  if (types.has("special_dob")) {
    changes.push(
      `SPECIAL — Date of birth: ${session.specialChange.dobFrom || "?"} → ${session.specialChange.dobTo || "?"} (docs may be required)`
    );
  }
  if (types.has("special_dl")) {
    const from = [
      session.specialChange.dlNumberFrom,
      session.specialChange.dlStateFrom,
    ]
      .filter(Boolean)
      .join(" / ");
    const to = [
      session.specialChange.dlNumberTo,
      session.specialChange.dlStateTo,
    ]
      .filter(Boolean)
      .join(" / ");
    changes.push(
      `SPECIAL — Driver’s license #: ${from || "?"} → ${to || "?"} (docs may be required)`
    );
  }
  if (specialTypes.length && session.specialChange.notes.trim()) {
    changes.push(`Special-change notes: ${session.specialChange.notes.trim()}`);
  }

  if (types.has("change_vehicle")) {
    changes.push(formatVehicle(session.vehicleChange.deleteVehicle, "REMOVE vehicle"));
    changes.push(formatVehicle(session.vehicleChange.addVehicle, "ADD / REPLACE with"));
  } else if (!types.has("correct_vehicle")) {
    staysSame.push("Self-propelled vehicle: unchanged (not part of this request)");
  }

  if (types.has("correct_vehicle")) {
    session.vehicleCorrections
      .filter((c) => c.field.trim() || c.toValue.trim())
      .forEach((c) => {
        changes.push(
          `Vehicle field correction — ${c.field || "(field)"}: ${c.fromValue || "(blank)"} → ${c.toValue || "(blank)"}${c.notes ? ` (${c.notes})` : ""}`
        );
      });
  }

  if (session.towedBringing === "no") {
    staysSame.push(
      "Towed units / attachments: client confirms they are NOT bringing a trailer, boat, camper, or anything else towed"
    );
  } else if (session.towedBringing === "yes" || types.has("towed_units")) {
    const units = session.towedUnits.filter(
      (u) => u.make.trim() || u.model.trim() || u.type || u.action || u.notes.trim()
    );
    const hasWatercraftRelated = units.some(
      (u) => u.type && WATERCRAFT_RELATED_TYPES.includes(u.type)
    );
    if (units.length === 0) {
      changes.push("Towed units: Yes / change selected — details pending");
    } else {
      units.forEach((u, i) => changes.push(`TOWED — ${formatTowed(u, i)}`));
      if (hasWatercraftRelated) {
        changes.push(`NOTE — ${TOWED_SEPARATE_UNITS_HINT}`);
      }
    }
  }

  if (types.has("optional_coverages")) {
    session.optionalCoverages
      .filter((c) => c.name.trim() || c.action)
      .forEach((c) => {
        changes.push(
          `Optional coverage ${c.action || "?"}: ${c.name || "(name)"}${c.notes ? ` — ${c.notes}` : ""}`
        );
      });
  } else {
    staysSame.push("Optional coverages: unchanged (not part of this request)");
  }

  if (types.has("other_drivers")) {
    session.otherDrivers
      .filter((d) => d.name.trim() || d.action)
      .forEach((d) => {
        const bits = [
          d.name,
          d.dob ? `DOB ${d.dob}` : "",
          d.licenseNumber ? `DL ${d.licenseNumber}` : "",
          d.licenseState,
          d.notes,
        ].filter(Boolean);
        changes.push(`Other driver ${d.action || "?"}: ${bits.join(" · ")}`);
      });
  } else {
    staysSame.push("Other drivers: unchanged (not part of this request)");
  }

  staysSame.push(`Policy / CRT #: ${session.policy.crtNumber || "(as on file)"}`);

  if (session.policy.beforeNotes.trim()) {
    staysSame.push(
      `Current policy notes (from FoxPro / staff): ${session.policy.beforeNotes.trim()}`
    );
  }

  staysSame.push(
    "Coverage territory, plan options, and premium: unchanged unless staff notes otherwise in FoxPro after rating"
  );

  return { changes, staysSame, specialWarnings };
}

export function buildConfirmationEmail(session: EndorsementSession): {
  subject: string;
  body: string;
} {
  const { changes, staysSame, specialWarnings } = buildSummary(session);
  const name = session.policy.insuredName || "Valued Client";
  const amount = endorsementFeeAmount(session);
  const subject = `Please confirm your Mexican Auto Insurance endorsement — Policy ${session.policy.crtNumber || "(CRT#)"}`;

  const specialBlock = specialWarnings.length
    ? `\nSPECIAL NOTICE\n${specialWarnings.map((c) => `• ${c}`).join("\n")}\n`
    : "";

  const feeBlock = session.feeWaived
    ? `FEE\n${feeLine(session)}. The usual $${amount} endorsement/policy fee is waived for this request.${session.feeWaiveReason.trim() ? ` Reason: ${session.feeWaiveReason.trim()}.` : ""}`
    : `FEE\n${feeLine(session)}. A $${amount} endorsement/policy fee applies to this change request (one fee even when several changes are stacked; $15 for short-term 1–20 day policies, $40 for 1 Month or longer). Payment is handled through our usual office process — this email is not a bill or a binder.`;

  const body = `Dear ${name},

Thank you for contacting Lewis and Lewis / Mexican Auto Insurance about a change to your tourist Mexican auto policy.

Before we issue the endorsement, please review this summary and reply to this email with “I confirm” (or correct anything that is wrong).

WHAT CHANGES
${changes.map((c) => `• ${c}`).join("\n")}

WHAT STAYS THE SAME
${staysSame.map((c) => `• ${c}`).join("\n")}
${specialBlock}
IMPORTANT — TOWED UNITS
Mexican law requires every trailer, boat, camper, or other towed unit to be listed on the policy (at least for liability / $0 value). Please make sure the Yes/No answer and any unit details above are correct.

Boat trailer, boat, outboard motor, and dinghy are SEPARATE units — each must appear on its own line (not one combined “boat rig”). Example: boat on a trailer = at least trailer + boat; add outboard as a third; dinghy as another.

${feeBlock}

MISSED INFORMATION
By replying to confirm, you agree that if any needed information was missed or incomplete, we may need a new endorsement request for review — and that can mean an additional endorsement fee ($${amount}: $15 for short-term 1–20 day policies, $40 for 1 Month or longer).

This confirmation is not a binder of insurance. Coverage changes take effect only after we receive your written confirmation and issue the endorsement in our office system.

Reply to this email to confirm, or call us at (800) 966-6830 / (310) 207-7700 if you have questions.

Sincerely,
Lewis and Lewis Insurance Agency, Inc.
MexicanAutoInsurance.com
Info@MexicanAutoInsurance.com
CA Surplus Lines Broker #0645420
`;

  return { subject, body };
}

export function buildFoxProExport(session: EndorsementSession): string {
  const { changes, staysSame, specialWarnings } = buildSummary(session);
  const amount = endorsementFeeAmount(session);
  const lines = [
    "=== FOXPRO / DBASE PASTE BLOCK — ENDORSEMENT SESSION ===",
    `Session ID: ${session.id}`,
    `Status: ${session.status}`,
    `Updated: ${session.updatedAt}`,
    "",
    "--- POLICY ---",
    `CRT/Policy #: ${session.policy.crtNumber}`,
    `Insured: ${session.policy.insuredName}`,
    `Phone: ${session.policy.phone}`,
    `Email: ${session.policy.email}`,
    `Effective date of change: ${session.effectiveDate}`,
    `Prior effective date: ${session.priorEffectiveDate || "(n/a)"}`,
    `Fee amount: $${amount}`,
    `Fee waived: ${session.feeWaived ? "YES" : "NO"}`,
    `Fee waive reason: ${session.feeWaiveReason || "(none)"}`,
    `Fee line: ${feeLine(session)}`,
    `Fee acknowledged: ${session.feeAcknowledged ? "YES" : "NO"}`,
    `Missed-info / extra-fee acknowledgment: ${session.missedInfoFeeAcknowledged ? "YES" : "NO"}`,
    `Towed bringing?: ${session.towedBringing || "(unanswered)"}`,
    `Change types: ${session.changeTypes.join(", ") || "(none)"}`,
    "",
    "--- BEFORE NOTES (staff from FoxPro) ---",
    session.policy.beforeNotes || "(none)",
    "",
    "--- SPECIAL WARNINGS ---",
    ...(specialWarnings.length ? specialWarnings.map((c) => `* ${c}`) : ["(none)"]),
    "",
    "--- CHANGES ---",
    ...changes.map((c) => `* ${c}`),
    "",
    "--- STAYS SAME ---",
    ...staysSame.map((c) => `* ${c}`),
    "",
    "--- STAFF ATTESTATION ---",
    `Taken by: ${session.attestation.takenBy || "(blank)"}`,
    `Method: ${session.attestation.method || "(blank)"}`,
    `Date: ${session.attestation.date || "(blank)"}`,
    `Notes: ${session.attestation.notes || "(none)"}`,
    "",
    "=== END PASTE BLOCK ===",
  ];
  return lines.join("\n");
}
