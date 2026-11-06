import type {
  ChangeType,
  CoverageAction,
  DriverAction,
  EndorsementSession,
  SessionStatus,
  TermOption,
} from "../types";
import {
  CHANGE_TYPE_LABELS,
  OPTIONAL_COVERAGE_PRESETS,
  STATUS_LABELS,
  TERM_OPTIONS,
  VEHICLE_FIELD_OPTIONS,
  emptyCoverage,
  emptyDriver,
  emptyVehicleCorrection,
  isSpecialChange,
} from "../types";
import { getCompletenessGate, isGateComplete } from "../lib/validation";
import { endorsementFeeAmount, feeContextLabel, feeLine } from "../lib/fees";
import {
  buildConfirmationEmail,
  buildFoxProExport,
  buildSummary,
} from "../lib/summary";
import { Field } from "./Field";
import { VehicleForm } from "./VehicleForm";
import { TowedForm } from "./TowedForm";
import { TowedUnitHelper } from "./TowedUnitHelper";
import { TOWED_SEPARATE_UNITS_HINT } from "../types";

export const STEP_IDS = [
  "policy",
  "changes",
  "towed",
  "details",
  "gate",
  "summary",
  "finish",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export const STEP_LABELS: Record<StepId, string> = {
  policy: "1. Policy",
  changes: "2. Changes",
  towed: "3. Towed?",
  details: "4. Details",
  gate: "5. Checklist",
  summary: "6. Summary",
  finish: "7. Confirm",
};

const CHANGE_GROUPS: { title: string; types: ChangeType[] }[] = [
  {
    title: "Dates & term",
    types: ["effective_date", "change_term"],
  },
  {
    title: "Insured & contact",
    types: ["insured_name", "contact_fields"],
  },
  {
    title: "Special (docs may be required)",
    types: ["special_named_insured", "special_dob", "special_dl"],
  },
  {
    title: "Vehicle & towed",
    types: ["change_vehicle", "correct_vehicle", "towed_units"],
  },
  {
    title: "Coverages & drivers",
    types: ["optional_coverages", "other_drivers"],
  },
];

export function StepPolicy({
  session,
  onChange,
}: {
  session: EndorsementSession;
  onChange: (next: EndorsementSession) => void;
}) {
  const p = session.policy;
  return (
    <>
      <h2 className="step-title">Identify the policy</h2>
      <p className="step-help">
        Paste what you see in FoxPro. No live lookup — this session is for guided intake only.
      </p>
      <p className="script-prompt">
        “I’m looking up your policy now. Can I confirm the name on the policy and a good phone
        and email for written confirmation?”
      </p>
      <div className="field-grid two">
        <Field label="Policy / CRT #" hint="from FoxPro">
          <input
            value={p.crtNumber}
            onChange={(e) =>
              onChange({ ...session, policy: { ...p, crtNumber: e.target.value } })
            }
            placeholder="e.g. CRT-123456"
            autoFocus
          />
        </Field>
        <Field label="Insured name" hint="as on policy today">
          <input
            value={p.insuredName}
            onChange={(e) =>
              onChange({ ...session, policy: { ...p, insuredName: e.target.value } })
            }
          />
        </Field>
        <Field label="Phone">
          <input
            value={p.phone}
            onChange={(e) =>
              onChange({ ...session, policy: { ...p, phone: e.target.value } })
            }
            placeholder="(555) 555-5555"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={p.email}
            onChange={(e) =>
              onChange({ ...session, policy: { ...p, email: e.target.value } })
            }
            placeholder="client@email.com"
          />
        </Field>
        <Field
          label="Current term on policy"
          hint="sets fee class if you’re not changing term"
        >
          <select
            value={session.termChange.currentTerm}
            onChange={(e) =>
              onChange({
                ...session,
                termChange: {
                  ...session.termChange,
                  currentTerm: e.target.value as TermOption | "",
                },
              })
            }
          >
            <option value="">Select if known…</option>
            {TERM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Before snapshot notes"
          hint="optional — what’s on the policy today in FoxPro"
          className="span-2"
        >
          <textarea
            value={p.beforeNotes}
            onChange={(e) =>
              onChange({ ...session, policy: { ...p, beforeNotes: e.target.value } })
            }
            placeholder="e.g. 2021 Jeep Wrangler, 6 Months term, no towed units listed…"
          />
        </Field>
      </div>
    </>
  );
}

export function StepChanges({
  session,
  onChange,
}: {
  session: EndorsementSession;
  onChange: (next: EndorsementSession) => void;
}) {
  const feeAmt = endorsementFeeAmount(session);

  const toggle = (type: ChangeType) => {
    const has = session.changeTypes.includes(type);
    let changeTypes = has
      ? session.changeTypes.filter((t) => t !== type)
      : [...session.changeTypes, type];

    // Selecting towed change implies we'll capture units
    if (type === "towed_units" && !has) {
      // keep as-is; towed Yes still required separately
    }

    onChange({ ...session, changeTypes });
  };

  return (
    <>
      <h2 className="step-title">What needs to change?</h2>
      <p className="step-help">
        Stack every change in this one session. Fee is <strong>${feeAmt}</strong> for this
        policy class ($15 short-term 1–20 days; $40 for 1 Month or longer) — one fee for the
        stack, unless waived.
      </p>
      <p className="fee-banner">{feeContextLabel(session)}</p>
      <p className="script-prompt">
        “What do we need to change — dates, term, name, vehicle, towed unit, coverages, or
        drivers?”
      </p>

      {CHANGE_GROUPS.map((group) => (
        <div key={group.title} className="change-group">
          <h3 className="change-group-title">
            {group.title}
            {group.title.startsWith("Special") ? (
              <span className="special-badge">Docs may be required</span>
            ) : null}
          </h3>
          <div className="choice-row">
            {group.types.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip-toggle ${session.changeTypes.includes(type) ? "selected" : ""} ${isSpecialChange(type) ? "special" : ""}`}
                onClick={() => toggle(type)}
              >
                {CHANGE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="field-grid two" style={{ marginTop: "1.25rem" }}>
        <Field label="Effective date of change(s)">
          <input
            type="date"
            value={session.effectiveDate}
            onChange={(e) => onChange({ ...session, effectiveDate: e.target.value })}
          />
        </Field>
        {session.changeTypes.includes("effective_date") ? (
          <Field label="Prior effective date" hint="what’s on the policy now">
            <input
              type="date"
              value={session.priorEffectiveDate}
              onChange={(e) =>
                onChange({ ...session, priorEffectiveDate: e.target.value })
              }
            />
          </Field>
        ) : (
          <div />
        )}
      </div>

      {/* STAFF-ONLY: fee waive — do not port this control to client public links */}
      <div className="section-card" style={{ marginTop: "1rem" }}>
        <h3>Endorsement fee</h3>
        <p className="step-help" style={{ marginBottom: "0.65rem" }}>
          Waive is staff-only. Clients never see this toggle on future self-serve links.
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={session.feeWaived}
            onChange={(e) =>
              onChange({
                ...session,
                feeWaived: e.target.checked,
                feeAcknowledged: e.target.checked ? false : session.feeAcknowledged,
              })
            }
          />
          <span>
            Waive ${feeAmt} endorsement/policy fee for this session
          </span>
        </label>
        {session.feeWaived ? (
          <div style={{ marginTop: "0.75rem" }}>
            <Field label="Waive reason" hint="optional">
              <input
                value={session.feeWaiveReason}
                onChange={(e) =>
                  onChange({ ...session, feeWaiveReason: e.target.value })
                }
                placeholder="e.g. agency courtesy / same-day correction"
              />
            </Field>
            <p className="step-help" style={{ marginBottom: 0, marginTop: "0.5rem" }}>
              Summary and email will show <strong>{feeLine(session)}</strong>.
            </p>
          </div>
        ) : (
          <label className="checkbox-row" style={{ marginTop: "0.75rem" }}>
            <input
              type="checkbox"
              checked={session.feeAcknowledged}
              onChange={(e) =>
                onChange({ ...session, feeAcknowledged: e.target.checked })
              }
            />
            <span>
              Client understands the <strong>${feeAmt}</strong> endorsement fee applies once
              for this stacked request (payment stays in the usual office process).
            </span>
          </label>
        )}
      </div>

      <div className="section-card" style={{ marginTop: "1rem" }}>
        <h3>Missed information → additional fee</h3>
        <p className="script-prompt" style={{ marginTop: 0 }}>
          “Please understand: if anything needed is missing or incomplete, we’ll have to start
          another endorsement request for review — and that means another fee of ${feeAmt} under
          the same rules.”
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={session.missedInfoFeeAcknowledged}
            onChange={(e) =>
              onChange({
                ...session,
                missedInfoFeeAcknowledged: e.target.checked,
              })
            }
          />
          <span>
            Client acknowledges that confirming this request means incomplete or missed details
            may require a <strong>new endorsement request</strong> and an{" "}
            <strong>additional ${feeAmt} fee</strong> ($15 short-term 1–20 days / $40 for 1 Month
            or longer). Separate from any staff fee waive.
          </span>
        </label>
      </div>
    </>
  );
}

export function StepTowed({
  session,
  onChange,
}: {
  session: EndorsementSession;
  onChange: (next: EndorsementSession) => void;
}) {
  return (
    <>
      <h2 className="step-title">Any towed unit?</h2>
      <p className="step-help">
        Required every session. Mexican law: trailers, boats, campers, and other attachments
        must be listed on the policy (at least liability / $0 value).
      </p>
      <TowedUnitHelper />
      <p className="script-prompt">
        “Are you bringing a trailer, boat, camper, or anything else towed by or on the
        vehicle?”
      </p>
      <p className="tow-separate-hint">{TOWED_SEPARATE_UNITS_HINT}</p>
      <div className="choice-row">
        <button
          type="button"
          className={`choice ${session.towedBringing === "yes" ? "selected" : ""}`}
          onClick={() => {
            const changeTypes = session.changeTypes.includes("towed_units")
              ? session.changeTypes
              : [...session.changeTypes, "towed_units" as ChangeType];
            onChange({ ...session, towedBringing: "yes", changeTypes });
          }}
        >
          <strong>Yes</strong>
          <span>Unlock towed unit detail fields</span>
        </button>
        <button
          type="button"
          className={`choice ${session.towedBringing === "no" ? "selected" : ""}`}
          onClick={() => onChange({ ...session, towedBringing: "no" })}
        >
          <strong>No</strong>
          <span>Record attestation — nothing towed</span>
        </button>
      </div>
      {session.towedBringing === "yes" ? (
        <div style={{ marginTop: "1.1rem" }}>
          <TowedForm
            units={session.towedUnits}
            onChange={(towedUnits) => onChange({ ...session, towedUnits })}
          />
        </div>
      ) : null}
    </>
  );
}

export function StepDetails({
  session,
  onChange,
}: {
  session: EndorsementSession;
  onChange: (next: EndorsementSession) => void;
}) {
  const t = new Set(session.changeTypes);
  const showAnything =
    t.has("change_term") ||
    t.has("insured_name") ||
    t.has("contact_fields") ||
    t.has("special_named_insured") ||
    t.has("special_dob") ||
    t.has("special_dl") ||
    t.has("change_vehicle") ||
    t.has("correct_vehicle") ||
    t.has("optional_coverages") ||
    t.has("other_drivers") ||
    (t.has("towed_units") && session.towedBringing !== "yes");

  if (!showAnything) {
    return (
      <>
        <h2 className="step-title">Change details</h2>
        <p className="step-help">
          Select change types on the previous steps to unlock detail fields. Effective date and
          fee are already on the Changes step; towed details appear when Yes is selected.
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="step-title">Change details</h2>
      <p className="step-help">Fill only what applies to this stack.</p>

      {t.has("change_term") ? (
        <div className="section-card">
          <h3>Term amount</h3>
          <p className="script-prompt" style={{ marginTop: 0 }}>
            “Are we moving this to annual, six months, or another term?”
          </p>
          <div className="field-grid two">
            <Field label="Current term">
              <select
                value={session.termChange.currentTerm}
                onChange={(e) =>
                  onChange({
                    ...session,
                    termChange: {
                      ...session.termChange,
                      currentTerm: e.target.value as TermOption | "",
                    },
                  })
                }
              >
                <option value="">Select…</option>
                {TERM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="New term" hint="fee follows the new term">
              <select
                value={session.termChange.newTerm}
                onChange={(e) =>
                  onChange({
                    ...session,
                    termChange: {
                      ...session.termChange,
                      newTerm: e.target.value as TermOption | "",
                    },
                  })
                }
              >
                <option value="">Select…</option>
                {TERM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="fee-banner" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
            Fee after this term change: {feeLine({ ...session })} — {feeContextLabel(session)}
          </p>
        </div>
      ) : null}

      {t.has("insured_name") ? (
        <div className="section-card">
          <h3>Insured name</h3>
          <div className="field-grid two">
            <Field label="Current name on policy">
              <input
                value={session.nameChange.currentName}
                onChange={(e) =>
                  onChange({
                    ...session,
                    nameChange: { ...session.nameChange, currentName: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="New insured name">
              <input
                value={session.nameChange.newName}
                onChange={(e) =>
                  onChange({
                    ...session,
                    nameChange: { ...session.nameChange, newName: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        </div>
      ) : null}

      {t.has("contact_fields") ? (
        <div className="section-card">
          <h3>Mailing address / contact</h3>
          <div className="field-grid two">
            <Field label="Mailing address" className="span-2">
              <input
                value={session.contactChange.mailingAddress}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: {
                      ...session.contactChange,
                      mailingAddress: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="City">
              <input
                value={session.contactChange.city}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, city: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="State / Province">
              <input
                value={session.contactChange.state}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, state: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="ZIP / Postal">
              <input
                value={session.contactChange.zip}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, zip: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Phone">
              <input
                value={session.contactChange.phone}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, phone: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                value={session.contactChange.email}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, email: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Fax">
              <input
                value={session.contactChange.fax}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, fax: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Notes" className="span-2">
              <input
                value={session.contactChange.notes}
                onChange={(e) =>
                  onChange({
                    ...session,
                    contactChange: { ...session.contactChange, notes: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        </div>
      ) : null}

      {t.has("special_named_insured") ||
      t.has("special_dob") ||
      t.has("special_dl") ? (
        <div className="section-card special-card">
          <h3>
            Special changes{" "}
            <span className="special-badge">Supporting documents may be required</span>
          </h3>
          <p className="step-help">
            Flag clearly for the client email. Staff should collect any required docs before
            issuing in FoxPro.
          </p>
          {t.has("special_named_insured") ? (
            <div className="field-grid two" style={{ marginBottom: "0.75rem" }}>
              <Field label="Named Insured — from">
                <input
                  value={session.specialChange.namedInsuredFrom}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: {
                        ...session.specialChange,
                        namedInsuredFrom: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Named Insured — to">
                <input
                  value={session.specialChange.namedInsuredTo}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: {
                        ...session.specialChange,
                        namedInsuredTo: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
          {t.has("special_dob") ? (
            <div className="field-grid two" style={{ marginBottom: "0.75rem" }}>
              <Field label="DOB — from">
                <input
                  value={session.specialChange.dobFrom}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: { ...session.specialChange, dobFrom: e.target.value },
                    })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </Field>
              <Field label="DOB — to">
                <input
                  value={session.specialChange.dobTo}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: { ...session.specialChange, dobTo: e.target.value },
                    })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </Field>
            </div>
          ) : null}
          {t.has("special_dl") ? (
            <div className="field-grid two" style={{ marginBottom: "0.75rem" }}>
              <Field label="DL # — from">
                <input
                  value={session.specialChange.dlNumberFrom}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: {
                        ...session.specialChange,
                        dlNumberFrom: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="DL # — to">
                <input
                  value={session.specialChange.dlNumberTo}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: {
                        ...session.specialChange,
                        dlNumberTo: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="DL state — from">
                <input
                  value={session.specialChange.dlStateFrom}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: {
                        ...session.specialChange,
                        dlStateFrom: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="DL state — to">
                <input
                  value={session.specialChange.dlStateTo}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      specialChange: {
                        ...session.specialChange,
                        dlStateTo: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
          <Field label="Special-change notes">
            <input
              value={session.specialChange.notes}
              onChange={(e) =>
                onChange({
                  ...session,
                  specialChange: { ...session.specialChange, notes: e.target.value },
                })
              }
              placeholder="Docs requested / received…"
            />
          </Field>
        </div>
      ) : null}

      {t.has("change_vehicle") ? (
        <>
          <VehicleForm
            title="Vehicle to REMOVE from the policy"
            value={session.vehicleChange.deleteVehicle}
            onChange={(deleteVehicle) =>
              onChange({
                ...session,
                vehicleChange: { ...session.vehicleChange, deleteVehicle },
              })
            }
          />
          <VehicleForm
            title="Vehicle to ADD / REPLACE"
            value={session.vehicleChange.addVehicle}
            onChange={(addVehicle) =>
              onChange({
                ...session,
                vehicleChange: { ...session.vehicleChange, addVehicle },
              })
            }
          />
        </>
      ) : null}

      {t.has("correct_vehicle") ? (
        <div className="section-card">
          <h3>Vehicle field corrections</h3>
          {session.vehicleCorrections.map((row, index) => (
            <div key={index} className="field-grid three" style={{ marginBottom: "0.75rem" }}>
              <Field label="Field">
                <select
                  value={row.field}
                  onChange={(e) => {
                    const vehicleCorrections = [...session.vehicleCorrections];
                    vehicleCorrections[index] = { ...row, field: e.target.value };
                    onChange({ ...session, vehicleCorrections });
                  }}
                >
                  <option value="">Select…</option>
                  {VEHICLE_FIELD_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="From">
                <input
                  value={row.fromValue}
                  onChange={(e) => {
                    const vehicleCorrections = [...session.vehicleCorrections];
                    vehicleCorrections[index] = { ...row, fromValue: e.target.value };
                    onChange({ ...session, vehicleCorrections });
                  }}
                />
              </Field>
              <Field label="To">
                <input
                  value={row.toValue}
                  onChange={(e) => {
                    const vehicleCorrections = [...session.vehicleCorrections];
                    vehicleCorrections[index] = { ...row, toValue: e.target.value };
                    onChange({ ...session, vehicleCorrections });
                  }}
                />
              </Field>
              <Field label="Notes" className="span-2">
                <input
                  value={row.notes}
                  onChange={(e) => {
                    const vehicleCorrections = [...session.vehicleCorrections];
                    vehicleCorrections[index] = { ...row, notes: e.target.value };
                    onChange({ ...session, vehicleCorrections });
                  }}
                />
              </Field>
              <div className="field">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const vehicleCorrections =
                      session.vehicleCorrections.length <= 1
                        ? [emptyVehicleCorrection()]
                        : session.vehicleCorrections.filter((_, i) => i !== index);
                    onChange({ ...session, vehicleCorrections });
                  }}
                >
                  Remove row
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              onChange({
                ...session,
                vehicleCorrections: [
                  ...session.vehicleCorrections,
                  emptyVehicleCorrection(),
                ],
              })
            }
          >
            + Add correction
          </button>
        </div>
      ) : null}

      {t.has("towed_units") && session.towedBringing !== "yes" ? (
        <div style={{ marginTop: "0.5rem" }}>
          <p className="step-help">
            Towed change selected — answer Yes on the towed step, or enter units here.
          </p>
          <TowedForm
            units={session.towedUnits}
            onChange={(towedUnits) => onChange({ ...session, towedUnits })}
          />
        </div>
      ) : null}

      {t.has("optional_coverages") ? (
        <div className="section-card">
          <h3>Optional coverages</h3>
          {session.optionalCoverages.map((row) => (
            <div key={row.id} className="field-grid three" style={{ marginBottom: "0.75rem" }}>
              <Field label="Action">
                <select
                  value={row.action}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      optionalCoverages: session.optionalCoverages.map((c) =>
                        c.id === row.id
                          ? { ...c, action: e.target.value as CoverageAction | "" }
                          : c
                      ),
                    })
                  }
                >
                  <option value="">Select…</option>
                  <option value="add">Add</option>
                  <option value="delete">Delete</option>
                </select>
              </Field>
              <Field label="Coverage" className="span-2">
                <select
                  value={
                    OPTIONAL_COVERAGE_PRESETS.includes(
                      row.name as (typeof OPTIONAL_COVERAGE_PRESETS)[number]
                    )
                      ? row.name
                      : row.name
                        ? "Other"
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...session,
                      optionalCoverages: session.optionalCoverages.map((c) =>
                        c.id === row.id
                          ? {
                              ...c,
                              name: v === "Other" ? (c.name === "Other" ? "" : c.name) || "" : v,
                            }
                          : c
                      ),
                    });
                  }}
                >
                  <option value="">Select…</option>
                  {OPTIONAL_COVERAGE_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              {(row.name === "Other" ||
                (row.name &&
                  !OPTIONAL_COVERAGE_PRESETS.includes(
                    row.name as (typeof OPTIONAL_COVERAGE_PRESETS)[number]
                  ))) && (
                <Field label="Other coverage name" className="span-2">
                  <input
                    value={row.name === "Other" ? "" : row.name}
                    onChange={(e) =>
                      onChange({
                        ...session,
                        optionalCoverages: session.optionalCoverages.map((c) =>
                          c.id === row.id ? { ...c, name: e.target.value } : c
                        ),
                      })
                    }
                  />
                </Field>
              )}
              <Field label="Notes" className="span-2">
                <input
                  value={row.notes}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      optionalCoverages: session.optionalCoverages.map((c) =>
                        c.id === row.id ? { ...c, notes: e.target.value } : c
                      ),
                    })
                  }
                />
              </Field>
              <div className="field">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    onChange({
                      ...session,
                      optionalCoverages:
                        session.optionalCoverages.length <= 1
                          ? [emptyCoverage(crypto.randomUUID())]
                          : session.optionalCoverages.filter((c) => c.id !== row.id),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              onChange({
                ...session,
                optionalCoverages: [
                  ...session.optionalCoverages,
                  emptyCoverage(crypto.randomUUID()),
                ],
              })
            }
          >
            + Add coverage row
          </button>
        </div>
      ) : null}

      {t.has("other_drivers") ? (
        <div className="section-card">
          <h3>Other drivers</h3>
          {session.otherDrivers.map((row) => (
            <div key={row.id} className="field-grid three" style={{ marginBottom: "0.75rem" }}>
              <Field label="Action">
                <select
                  value={row.action}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      otherDrivers: session.otherDrivers.map((d) =>
                        d.id === row.id
                          ? { ...d, action: e.target.value as DriverAction | "" }
                          : d
                      ),
                    })
                  }
                >
                  <option value="">Select…</option>
                  <option value="add">Add</option>
                  <option value="delete">Delete</option>
                </select>
              </Field>
              <Field label="Name" className="span-2">
                <input
                  value={row.name}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      otherDrivers: session.otherDrivers.map((d) =>
                        d.id === row.id ? { ...d, name: e.target.value } : d
                      ),
                    })
                  }
                />
              </Field>
              <Field label="DOB">
                <input
                  value={row.dob}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      otherDrivers: session.otherDrivers.map((d) =>
                        d.id === row.id ? { ...d, dob: e.target.value } : d
                      ),
                    })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </Field>
              <Field label="License #">
                <input
                  value={row.licenseNumber}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      otherDrivers: session.otherDrivers.map((d) =>
                        d.id === row.id ? { ...d, licenseNumber: e.target.value } : d
                      ),
                    })
                  }
                />
              </Field>
              <Field label="License state">
                <input
                  value={row.licenseState}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      otherDrivers: session.otherDrivers.map((d) =>
                        d.id === row.id ? { ...d, licenseState: e.target.value } : d
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Notes" className="span-2">
                <input
                  value={row.notes}
                  onChange={(e) =>
                    onChange({
                      ...session,
                      otherDrivers: session.otherDrivers.map((d) =>
                        d.id === row.id ? { ...d, notes: e.target.value } : d
                      ),
                    })
                  }
                />
              </Field>
              <div className="field">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    onChange({
                      ...session,
                      otherDrivers:
                        session.otherDrivers.length <= 1
                          ? [emptyDriver(crypto.randomUUID())]
                          : session.otherDrivers.filter((d) => d.id !== row.id),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              onChange({
                ...session,
                otherDrivers: [...session.otherDrivers, emptyDriver(crypto.randomUUID())],
              })
            }
          >
            + Add driver row
          </button>
        </div>
      ) : null}
    </>
  );
}

export function StepGate({ session }: { session: EndorsementSession }) {
  const items = getCompletenessGate(session);
  const complete = isGateComplete(session);
  return (
    <>
      <h2 className="step-title">Completeness checklist</h2>
      <p className="step-help">
        Fix anything marked missing before you continue to the client summary.
      </p>
      <div className="gate-list">
        {items.map((item) => (
          <div key={item.id} className={`gate-item ${item.ok ? "ok" : ""}`}>
            <span className="mark">{item.ok ? "✓" : "!"}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {complete ? (
        <p className="fee-banner" style={{ marginTop: "1rem" }}>
          Ready — all required fields for this stack are complete. {feeLine(session)}.
        </p>
      ) : (
        <p className="step-help" style={{ marginTop: "1rem" }}>
          Go back and complete the missing items. Continue stays locked until the gate passes.
        </p>
      )}
    </>
  );
}

export function StepSummary({ session }: { session: EndorsementSession }) {
  const { changes, staysSame, specialWarnings } = buildSummary(session);
  return (
    <>
      <h2 className="step-title">Before → after summary</h2>
      <p className="step-help">
        This is what the client will be asked to confirm in writing before you issue in FoxPro.
      </p>
      {specialWarnings.length ? (
        <div className="special-banner">
          {specialWarnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      ) : null}
      <div className="summary-columns">
        <div className="summary-box changes">
          <h3>What changes</h3>
          <ul>
            {changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="summary-box same">
          <h3>What stays the same</h3>
          <ul>
            {staysSame.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export function StepFinish({
  session,
  onChange,
  onToast,
}: {
  session: EndorsementSession;
  onChange: (next: EndorsementSession) => void;
  onToast: (msg: string) => void;
}) {
  const email = buildConfirmationEmail(session);
  const fox = buildFoxProExport(session);
  const mailto = `mailto:${encodeURIComponent(session.policy.email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  const feeAmt = endorsementFeeAmount(session);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`${label} copied`);
    } catch {
      onToast("Copy failed — select the text manually");
    }
  };

  return (
    <>
      <h2 className="step-title">Confirm & export</h2>
      <p className="step-help">
        Email the client this summary. Do not issue in FoxPro until they reply-confirm. Then
        paste the export block into your office process.
      </p>
      <p className="fee-banner">{feeLine(session)} — {feeContextLabel(session)}</p>

      <div className="section-card">
        <h3>Staff attestation</h3>
        <div className="field-grid two">
          <Field label="Taken by">
            <input
              value={session.attestation.takenBy}
              onChange={(e) =>
                onChange({
                  ...session,
                  attestation: { ...session.attestation, takenBy: e.target.value },
                })
              }
              placeholder="Staff name"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={session.attestation.date}
              onChange={(e) =>
                onChange({
                  ...session,
                  attestation: { ...session.attestation, date: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Taken via">
            <select
              value={session.attestation.method}
              onChange={(e) =>
                onChange({
                  ...session,
                  attestation: {
                    ...session.attestation,
                    method: e.target.value as "phone" | "email" | "",
                  },
                })
              }
            >
              <option value="">Select…</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </Field>
          <Field label="Attestation notes">
            <input
              value={session.attestation.notes}
              onChange={(e) =>
                onChange({
                  ...session,
                  attestation: { ...session.attestation, notes: e.target.value },
                })
              }
              placeholder="Optional"
            />
          </Field>
        </div>
      </div>

      <div className="section-card">
        <h3>Session status</h3>
        <div className="choice-row">
          {(Object.keys(STATUS_LABELS) as SessionStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={`chip-toggle ${session.status === status ? "selected" : ""}`}
              onClick={() => onChange({ ...session, status })}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <p className="step-help" style={{ marginBottom: 0, marginTop: "0.75rem" }}>
          Manual toggles for Phase 1 — mark “Confirmation sent” after you email, then “Awaiting
          client,” then “Ready to issue” only after written confirm.
        </p>
      </div>

      <div className="section-card">
        <h3>Confirmation email</h3>
        <Field label="Subject">
          <input value={email.subject} readOnly />
        </Field>
        <div style={{ marginTop: "0.75rem" }}>
          <Field label="Body">
            <textarea
              className="mono-block"
              value={email.body}
              readOnly
              style={{ minHeight: 260 }}
            />
          </Field>
        </div>
        <div className="choice-row" style={{ marginTop: "0.85rem" }}>
          <a className="btn btn-primary" href={mailto}>
            Open in email (mailto)
          </a>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => copy(`${email.subject}\n\n${email.body}`, "Email")}
          >
            Copy email
          </button>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() =>
              onChange({
                ...session,
                status:
                  session.status === "draft" ? "confirmation_sent" : session.status,
              })
            }
          >
            Mark confirmation sent
          </button>
        </div>
      </div>

      <div className="section-card">
        <h3>FoxPro paste export</h3>
        <textarea className="mono-block" value={fox} readOnly />
        <div className="choice-row" style={{ marginTop: "0.85rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => copy(fox, "FoxPro block")}
          >
            Copy FoxPro block
          </button>
        </div>
        <p className="step-help" style={{ marginBottom: 0 }}>
          Fee in export: ${feeAmt}
          {session.feeWaived ? " (waived)" : ""}.
        </p>
      </div>
    </>
  );
}
