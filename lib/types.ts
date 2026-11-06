export type SessionStatus =
  | "draft"
  | "awaiting_client"
  | "client_submitted"
  | "confirmation_sent"
  | "ready_to_issue";

export type ChangeType =
  | "effective_date"
  | "change_term"
  | "insured_name"
  | "contact_fields"
  | "special_named_insured"
  | "special_dob"
  | "special_dl"
  | "change_vehicle"
  | "correct_vehicle"
  | "towed_units"
  | "optional_coverages"
  | "other_drivers";

export type TermOption =
  | "1–20 Days"
  | "1 Month"
  | "3 Months"
  | "6 Months"
  | "Annual";

export type TowedUnitType =
  | "watercraft"
  | "outboard"
  | "dinghy"
  | "watercraft_trailer"
  | "trailer_other"
  | "camper";

/** Types that often travel as a multi-unit boat rig — each must be its own entry */
export const WATERCRAFT_RELATED_TYPES: TowedUnitType[] = [
  "watercraft",
  "outboard",
  "dinghy",
  "watercraft_trailer",
];

export type TowedAction = "add" | "correct" | "change" | "delete";

export type CoverageAction = "add" | "delete";

export type DriverAction = "add" | "delete";

export interface VehicleFields {
  make: string;
  year: string;
  model: string;
  length: string;
  vin: string;
  plate: string;
  state: string;
  otherInsurer: string;
  lienholder: string;
  cmv: string;
}

export interface TowedUnit {
  id: string;
  action: TowedAction | "";
  type: TowedUnitType | "";
  make: string;
  year: string;
  model: string;
  length: string;
  vin: string;
  plate: string;
  state: string;
  registeredOwner: string;
  lienholder: string;
  value: string;
  notes: string;
}

export interface OptionalCoverageItem {
  id: string;
  action: CoverageAction | "";
  name: string;
  notes: string;
}

export interface OtherDriverItem {
  id: string;
  action: DriverAction | "";
  name: string;
  dob: string;
  licenseNumber: string;
  licenseState: string;
  notes: string;
}

export interface PolicyIdentity {
  crtNumber: string;
  insuredName: string;
  phone: string;
  email: string;
  beforeNotes: string;
}

export interface VehicleChange {
  deleteVehicle: VehicleFields;
  addVehicle: VehicleFields;
}

export interface VehicleCorrection {
  field: string;
  fromValue: string;
  toValue: string;
  notes: string;
}

export interface TermChange {
  currentTerm: TermOption | "";
  newTerm: TermOption | "";
}

export interface NameChange {
  currentName: string;
  newName: string;
}

export interface ContactChange {
  mailingAddress: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  fax: string;
  notes: string;
}

export interface SpecialChange {
  namedInsuredFrom: string;
  namedInsuredTo: string;
  dobFrom: string;
  dobTo: string;
  dlNumberFrom: string;
  dlNumberTo: string;
  dlStateFrom: string;
  dlStateTo: string;
  notes: string;
}

export interface StaffAttestation {
  method: "phone" | "email" | "";
  takenBy: string;
  date: string;
  notes: string;
}

export interface EndorsementSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  /** Opaque public fill-out token — never show fee waive on /client/:token */
  clientToken: string;
  clientLinkSentAt: string | null;
  clientSubmittedAt: string | null;
  /**
   * When true, staff pre-selected change types and client should fill those.
   * When false / empty changeTypes, client may choose types.
   */
  changeTypesLockedByStaff: boolean;
  policy: PolicyIdentity;
  changeTypes: ChangeType[];
  effectiveDate: string;
  /** Prior effective date when changing effective date */
  priorEffectiveDate: string;
  feeAcknowledged: boolean;
  /** STAFF-ONLY — never expose waive controls on client-facing surfaces */
  feeWaived: boolean;
  /** STAFF-ONLY — optional reason when feeWaived */
  feeWaiveReason: string;
  /**
   * Client/staff acknowledgment that missed info may require a new endorsement
   * request and an additional fee ($15/$40). Separate from fee waive.
   */
  missedInfoFeeAcknowledged: boolean;
  towedBringing: "yes" | "no" | "";
  vehicleChange: VehicleChange;
  vehicleCorrections: VehicleCorrection[];
  towedUnits: TowedUnit[];
  termChange: TermChange;
  nameChange: NameChange;
  contactChange: ContactChange;
  specialChange: SpecialChange;
  optionalCoverages: OptionalCoverageItem[];
  otherDrivers: OtherDriverItem[];
  attestation: StaffAttestation;
}

/** Client-safe view — fee waive fields stripped / forced false */
export type ClientSessionView = Omit<
  EndorsementSession,
  "feeWaived" | "feeWaiveReason" | "attestation"
> & {
  feeWaived: false;
  feeWaiveReason: "";
};

export const emptyVehicle = (): VehicleFields => ({
  make: "",
  year: "",
  model: "",
  length: "",
  vin: "",
  plate: "",
  state: "",
  otherInsurer: "",
  lienholder: "",
  cmv: "",
});

export const emptyTowedUnit = (id: string): TowedUnit => ({
  id,
  action: "add",
  type: "",
  make: "",
  year: "",
  model: "",
  length: "",
  vin: "",
  plate: "",
  state: "",
  registeredOwner: "",
  lienholder: "",
  value: "",
  notes: "",
});

export const emptyCoverage = (id: string): OptionalCoverageItem => ({
  id,
  action: "add",
  name: "",
  notes: "",
});

export const emptyDriver = (id: string): OtherDriverItem => ({
  id,
  action: "add",
  name: "",
  dob: "",
  licenseNumber: "",
  licenseState: "",
  notes: "",
});

export const emptyVehicleCorrection = (): VehicleCorrection => ({
  field: "",
  fromValue: "",
  toValue: "",
  notes: "",
});

function newToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export const createSession = (): EndorsementSession => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    clientToken: newToken(),
    clientLinkSentAt: null,
    clientSubmittedAt: null,
    changeTypesLockedByStaff: false,
    policy: {
      crtNumber: "",
      insuredName: "",
      phone: "",
      email: "",
      beforeNotes: "",
    },
    changeTypes: [],
    effectiveDate: "",
    priorEffectiveDate: "",
    feeAcknowledged: false,
    feeWaived: false,
    feeWaiveReason: "",
    missedInfoFeeAcknowledged: false,
    towedBringing: "",
    vehicleChange: {
      deleteVehicle: emptyVehicle(),
      addVehicle: emptyVehicle(),
    },
    vehicleCorrections: [emptyVehicleCorrection()],
    towedUnits: [emptyTowedUnit(crypto.randomUUID())],
    termChange: {
      currentTerm: "",
      newTerm: "",
    },
    nameChange: {
      currentName: "",
      newName: "",
    },
    contactChange: {
      mailingAddress: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      email: "",
      fax: "",
      notes: "",
    },
    specialChange: {
      namedInsuredFrom: "",
      namedInsuredTo: "",
      dobFrom: "",
      dobTo: "",
      dlNumberFrom: "",
      dlNumberTo: "",
      dlStateFrom: "",
      dlStateTo: "",
      notes: "",
    },
    optionalCoverages: [emptyCoverage(crypto.randomUUID())],
    otherDrivers: [emptyDriver(crypto.randomUUID())],
    attestation: {
      method: "",
      takenBy: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  };
};

export function toClientView(session: EndorsementSession): ClientSessionView {
  return {
    ...session,
    feeWaived: false,
    feeWaiveReason: "",
  };
}

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  effective_date: "Effective date",
  change_term: "Term amount",
  insured_name: "Insured name",
  contact_fields: "Mailing address / contact",
  special_named_insured: "Named Insured (special)",
  special_dob: "Date of birth (special)",
  special_dl: "Driver’s license # (special)",
  change_vehicle: "Change vehicle (full replace)",
  correct_vehicle: "Correct vehicle field(s)",
  towed_units: "Towed units (add / correct / change / delete)",
  optional_coverages: "Optional coverages (add / delete)",
  other_drivers: "Other drivers (add / delete)",
};

export const SPECIAL_CHANGE_TYPES: ChangeType[] = [
  "special_named_insured",
  "special_dob",
  "special_dl",
];

export function isSpecialChange(type: ChangeType): boolean {
  return SPECIAL_CHANGE_TYPES.includes(type);
}

export const TERM_OPTIONS: TermOption[] = [
  "1–20 Days",
  "1 Month",
  "3 Months",
  "6 Months",
  "Annual",
];

export const TOWED_TYPE_LABELS: Record<TowedUnitType, string> = {
  watercraft: "Boat / watercraft (vessel only)",
  outboard: "Outboard motor (separate unit)",
  dinghy: "Dinghy (separate from main boat)",
  watercraft_trailer: "Boat / watercraft trailer (trailer only)",
  trailer_other: "Trailer / other",
  camper: "Camper / vehicle in tow",
};

export const TOWED_SEPARATE_UNITS_HINT =
  "Boat trailer, boat, outboard motor, and dinghy are SEPARATE units — each needs its own entry (not one combined “boat rig” line). Example: boat on a trailer = at least trailer + boat; add outboard as a third; dinghy as another.";

export const TOWED_ACTION_LABELS: Record<TowedAction, string> = {
  add: "Add",
  correct: "Correct",
  change: "Change",
  delete: "Delete",
};

export const STATUS_LABELS: Record<SessionStatus, string> = {
  draft: "Draft",
  awaiting_client: "Awaiting client",
  client_submitted: "Client submitted",
  confirmation_sent: "Confirmation sent",
  ready_to_issue: "Ready to issue",
};

export const VEHICLE_FIELD_OPTIONS = [
  "Make",
  "Year",
  "Model",
  "Length",
  "VIN",
  "Plate #",
  "State / Province",
  "Other auto insurer",
  "Lienholder",
  "CMV / value",
] as const;

export const OPTIONAL_COVERAGE_PRESETS = [
  "Excess liability",
  "UM+",
  "Watercraft liability",
  "VIP / travel assistance",
  "Business use",
  "Other",
] as const;
