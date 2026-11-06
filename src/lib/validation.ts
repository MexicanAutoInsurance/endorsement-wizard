import type {
  EndorsementSession,
  VehicleFields,
  TowedUnit,
  OptionalCoverageItem,
  OtherDriverItem,
  VehicleCorrection,
} from "../types";
import { isSpecialChange } from "../types";
import { endorsementFeeAmount } from "./fees";

export interface GateItem {
  id: string;
  label: string;
  ok: boolean;
}

function vehicleHasCore(v: VehicleFields): boolean {
  return Boolean(v.make.trim() && v.year.trim() && v.model.trim() && v.vin.trim());
}

function towedUnitComplete(u: TowedUnit): boolean {
  if (!u.action) return false;
  if (u.action === "delete") {
    return Boolean(
      u.make.trim() || u.model.trim() || u.vin.trim() || u.plate.trim() || u.notes.trim()
    );
  }
  return Boolean(
    u.type &&
      u.make.trim() &&
      u.year.trim() &&
      u.model.trim() &&
      (u.vin.trim() || u.plate.trim())
  );
}

function correctionComplete(c: VehicleCorrection): boolean {
  return Boolean(c.field.trim() && c.toValue.trim());
}

function coverageComplete(c: OptionalCoverageItem): boolean {
  return Boolean(c.action && c.name.trim());
}

function driverComplete(d: OtherDriverItem): boolean {
  return Boolean(d.action && d.name.trim());
}

export function getCompletenessGate(session: EndorsementSession): GateItem[] {
  const {
    policy,
    changeTypes,
    towedBringing,
    vehicleChange,
    vehicleCorrections,
    towedUnits,
    termChange,
    nameChange,
    contactChange,
    specialChange,
    optionalCoverages,
    otherDrivers,
  } = session;

  const feeAmt = endorsementFeeAmount(session);

  const items: GateItem[] = [
    {
      id: "crt",
      label: "Policy / CRT # pasted from FoxPro",
      ok: Boolean(policy.crtNumber.trim()),
    },
    {
      id: "name",
      label: "Insured name (contact for this session)",
      ok: Boolean(policy.insuredName.trim()),
    },
    {
      id: "phone",
      label: "Contact phone",
      ok: Boolean(policy.phone.trim()),
    },
    {
      id: "email",
      label: "Client email (for confirmation)",
      ok: Boolean(policy.email.trim() && policy.email.includes("@")),
    },
    {
      id: "changes",
      label: "At least one change type selected",
      ok: changeTypes.length > 0,
    },
    {
      id: "effective",
      label: "Effective date of change(s)",
      ok: Boolean(session.effectiveDate),
    },
    {
      id: "fee",
      label: session.feeWaived
        ? `Fee waived ($${feeAmt})`
        : `$${feeAmt} endorsement fee acknowledged (stacked = one fee)`,
      ok: session.feeWaived || session.feeAcknowledged,
    },
    {
      id: "missed-info",
      label: `Missed-info acknowledgment — incomplete details may require a new endorsement and another $${feeAmt} fee`,
      ok: session.missedInfoFeeAcknowledged,
    },
    {
      id: "towed",
      label: "Towed-unit question answered (Yes or No)",
      ok: towedBringing === "yes" || towedBringing === "no",
    },
  ];

  if (changeTypes.includes("effective_date")) {
    items.push({
      id: "eff-prior",
      label: "Prior effective date (what’s on the policy now)",
      ok: Boolean(session.priorEffectiveDate),
    });
  }

  if (changeTypes.includes("change_term")) {
    items.push({
      id: "term",
      label: "Current term and new term selected",
      ok: Boolean(termChange.currentTerm && termChange.newTerm),
    });
  }

  if (changeTypes.includes("insured_name")) {
    items.push({
      id: "name-change",
      label: "Current insured name and new insured name",
      ok: Boolean(nameChange.currentName.trim() && nameChange.newName.trim()),
    });
  }

  if (changeTypes.includes("contact_fields")) {
    const c = contactChange;
    const any =
      c.mailingAddress.trim() ||
      c.city.trim() ||
      c.state.trim() ||
      c.zip.trim() ||
      c.phone.trim() ||
      c.email.trim() ||
      c.fax.trim() ||
      c.notes.trim();
    items.push({
      id: "contact",
      label: "At least one mailing / contact field filled",
      ok: Boolean(any),
    });
  }

  if (changeTypes.includes("special_named_insured")) {
    items.push({
      id: "special-ni",
      label: "Named Insured: from and to values (supporting docs may be required)",
      ok: Boolean(
        specialChange.namedInsuredFrom.trim() && specialChange.namedInsuredTo.trim()
      ),
    });
  }

  if (changeTypes.includes("special_dob")) {
    items.push({
      id: "special-dob",
      label: "DOB: from and to values (supporting docs may be required)",
      ok: Boolean(specialChange.dobFrom.trim() && specialChange.dobTo.trim()),
    });
  }

  if (changeTypes.includes("special_dl")) {
    items.push({
      id: "special-dl",
      label: "Driver’s license #: from and to (supporting docs may be required)",
      ok: Boolean(specialChange.dlNumberFrom.trim() && specialChange.dlNumberTo.trim()),
    });
  }

  if (changeTypes.includes("change_vehicle")) {
    items.push({
      id: "veh-delete",
      label: "Vehicle to remove: make, year, model, VIN",
      ok: vehicleHasCore(vehicleChange.deleteVehicle),
    });
    items.push({
      id: "veh-add",
      label: "Replacement vehicle: make, year, model, VIN",
      ok: vehicleHasCore(vehicleChange.addVehicle),
    });
  }

  if (changeTypes.includes("correct_vehicle")) {
    const rows = vehicleCorrections.filter(
      (c) => c.field.trim() || c.fromValue.trim() || c.toValue.trim()
    );
    items.push({
      id: "veh-correct",
      label: "At least one vehicle field correction (field + new value)",
      ok: rows.length > 0 && rows.every(correctionComplete),
    });
  }

  if (towedBringing === "yes" || changeTypes.includes("towed_units")) {
    const units = towedUnits.filter(
      (u) =>
        u.make.trim() ||
        u.model.trim() ||
        u.vin.trim() ||
        u.type ||
        u.action ||
        u.notes.trim()
    );
    items.push({
      id: "towed-detail",
      label: "Towed unit(s): action + identifying details for each",
      ok: units.length > 0 && units.every(towedUnitComplete),
    });
  }

  if (changeTypes.includes("optional_coverages")) {
    const rows = optionalCoverages.filter((c) => c.name.trim() || c.action);
    items.push({
      id: "coverages",
      label: "Optional coverage(s): action + coverage name for each",
      ok: rows.length > 0 && rows.every(coverageComplete),
    });
  }

  if (changeTypes.includes("other_drivers")) {
    const rows = otherDrivers.filter((d) => d.name.trim() || d.action);
    items.push({
      id: "drivers",
      label: "Other driver(s): action + name for each",
      ok: rows.length > 0 && rows.every(driverComplete),
    });
  }

  if (changeTypes.some(isSpecialChange)) {
    items.push({
      id: "special-flag",
      label: "Special change selected — remind client supporting documents may be required",
      ok: true,
    });
  }

  return items;
}

export function isGateComplete(session: EndorsementSession): boolean {
  return getCompletenessGate(session).every((i) => i.ok);
}
