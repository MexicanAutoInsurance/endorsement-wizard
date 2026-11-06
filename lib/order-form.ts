import type { ChangeType, EndorsementSession } from "@/lib/types";
import { CHANGE_TYPE_LABELS, TOWED_ACTION_LABELS, TOWED_TYPE_LABELS } from "@/lib/types";
import { buildSummary } from "@/lib/summary";
import { feeLine, endorsementFeeAmount } from "@/lib/fees";

export type OrderFormCheckbox =
  | "personal"
  | "vehicle"
  | "towed"
  | "optional"
  | "other"
  | "special_send";

const PERSONAL: ChangeType[] = [
  "insured_name",
  "contact_fields",
  "special_named_insured",
  "special_dob",
  "special_dl",
];
const VEHICLE: ChangeType[] = ["change_vehicle", "correct_vehicle"];
const TOWED: ChangeType[] = ["towed_units"];
const OPTIONAL: ChangeType[] = ["optional_coverages"];
const OTHER: ChangeType[] = ["effective_date", "change_term", "other_drivers"];

export function orderFormChecks(
  session: EndorsementSession,
): Record<OrderFormCheckbox, boolean> {
  const t = new Set(session.changeTypes);
  return {
    personal: PERSONAL.some((c) => t.has(c)),
    vehicle: VEHICLE.some((c) => t.has(c)),
    towed: TOWED.some((c) => t.has(c)) || session.towedBringing === "yes",
    optional: OPTIONAL.some((c) => t.has(c)),
    other: OTHER.some((c) => t.has(c)),
    special_send: false,
  };
}

/** Lined “notes” body for the Renewal–Endorsement order form (from → to). */
export function orderFormChangeLines(session: EndorsementSession): string[] {
  const lines: string[] = [];
  const types = session.changeTypes;

  if (types.length) {
    lines.push(
      `Requested stack: ${types.map((t) => CHANGE_TYPE_LABELS[t]).join("; ")}`,
    );
  }

  if (session.effectiveDate) {
    if (types.includes("effective_date") && session.priorEffectiveDate) {
      lines.push(
        `Effective date: ${session.priorEffectiveDate} → ${session.effectiveDate}`,
      );
    } else {
      lines.push(`Endorsement effective: ${session.effectiveDate}`);
    }
  }

  if (types.includes("change_term")) {
    lines.push(
      `Term: ${session.termChange.currentTerm || "?"} → ${session.termChange.newTerm || "?"}`,
    );
  }

  if (types.includes("insured_name")) {
    lines.push(
      `Insured name: ${session.nameChange.currentName || "?"} → ${session.nameChange.newName || "?"}`,
    );
  }

  if (types.includes("contact_fields")) {
    const c = session.contactChange;
    const bits = [
      c.mailingAddress && `address ${c.mailingAddress}`,
      [c.city, c.state, c.zip].filter(Boolean).join(", "),
      c.phone && `phone ${c.phone}`,
      c.email && `email ${c.email}`,
      c.fax && `fax ${c.fax}`,
      c.notes && c.notes,
    ].filter(Boolean);
    lines.push(`Contact / mailing: ${bits.join(" · ") || "(see notes)"}`);
  }

  if (types.includes("special_named_insured")) {
    lines.push(
      `Named Insured (special): ${session.specialChange.namedInsuredFrom || "?"} → ${session.specialChange.namedInsuredTo || "?"}`,
    );
  }
  if (types.includes("special_dob")) {
    lines.push(
      `DOB (special): ${session.specialChange.dobFrom || "?"} → ${session.specialChange.dobTo || "?"}`,
    );
  }
  if (types.includes("special_dl")) {
    lines.push(
      `DL (special): ${session.specialChange.dlNumberFrom || "?"} ${session.specialChange.dlStateFrom || ""} → ${session.specialChange.dlNumberTo || "?"} ${session.specialChange.dlStateTo || ""}`,
    );
  }

  if (types.includes("change_vehicle")) {
    const d = session.vehicleChange.deleteVehicle;
    const a = session.vehicleChange.addVehicle;
    lines.push(
      `Vehicle REMOVE: ${[d.year, d.make, d.model, d.vin && `VIN ${d.vin}`].filter(Boolean).join(" ") || "(blank)"}`,
    );
    lines.push(
      `Vehicle ADD: ${[a.year, a.make, a.model, a.vin && `VIN ${a.vin}`, a.plate && `plate ${a.plate}`, a.state, a.cmv !== "" && `CMV $${a.cmv}`].filter(Boolean).join(" ") || "(blank)"}`,
    );
  }

  if (types.includes("correct_vehicle")) {
    for (const row of session.vehicleCorrections) {
      if (!row.field.trim() && !row.toValue.trim()) continue;
      lines.push(
        `Vehicle field ${row.field || "?"}: ${row.fromValue || "?"} → ${row.toValue || "?"}${row.notes ? ` (${row.notes})` : ""}`,
      );
    }
  }

  if (session.towedBringing === "no") {
    lines.push("Towed units: NO — client attested nothing towed.");
  } else if (session.towedBringing === "yes" || types.includes("towed_units")) {
    lines.push("Towed units: YES");
    session.towedUnits.forEach((u, i) => {
      if (
        !(
          u.make ||
          u.model ||
          u.vin ||
          u.type ||
          u.action ||
          u.notes
        )
      ) {
        return;
      }
      const action = u.action ? TOWED_ACTION_LABELS[u.action] : "?";
      const type = u.type ? TOWED_TYPE_LABELS[u.type] : "unit";
      lines.push(
        `  ${action} ${type} #${i + 1}: ${[u.year, u.make, u.model, u.vin && `ID ${u.vin}`, u.plate && `plate ${u.plate}`, u.state, u.value !== "" && `$${u.value}`].filter(Boolean).join(" ") || u.notes || "(details)"}`,
      );
    });
  }

  if (types.includes("optional_coverages")) {
    for (const c of session.optionalCoverages) {
      if (!c.name.trim() && !c.action) continue;
      lines.push(
        `Optional coverage: ${c.action || "?"} ${c.name || "?"}${c.notes ? ` — ${c.notes}` : ""}`,
      );
    }
  }

  if (types.includes("other_drivers")) {
    for (const d of session.otherDrivers) {
      if (!d.name.trim() && !d.action) continue;
      lines.push(
        `Other driver: ${d.action || "?"} ${d.name || "?"}${d.licenseNumber ? ` DL ${d.licenseNumber} ${d.licenseState}` : ""}`,
      );
    }
  }

  lines.push(feeLine(session));
  if (session.missedInfoFeeAcknowledged) {
    lines.push(
      `Missed-info ack: yes (additional $${endorsementFeeAmount(session)} fee if incomplete).`,
    );
  }

  // Fall back to summary changes if we somehow produced nothing useful
  if (lines.length < 2) {
    const { changes } = buildSummary(session);
    return changes;
  }
  return lines;
}

export function orderFormContactLine(session: EndorsementSession): string {
  return [session.policy.phone, session.policy.email].filter(Boolean).join("  ·  ");
}
