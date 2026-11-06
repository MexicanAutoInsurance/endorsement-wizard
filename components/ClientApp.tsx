"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeType, EndorsementSession, TermOption } from "@/lib/types";
import {
  CHANGE_TYPE_LABELS,
  TERM_OPTIONS,
  TOWED_SEPARATE_UNITS_HINT,
  isSpecialChange,
} from "@/lib/types";
import { apiGetClientSession, apiSaveClientSession } from "@/lib/api-client";
import { endorsementFeeAmount, feeContextLabel } from "@/lib/fees";
import {
  getClientCompletenessGate,
  isClientGateComplete,
} from "@/lib/validation";
import { Field } from "@/components/Field";
import { TowedUnitHelper } from "@/components/TowedUnitHelper";
import { TowedForm } from "@/components/TowedForm";
import { StepDetails } from "@/components/WizardSteps";

const CHANGE_GROUPS: { title: string; types: ChangeType[] }[] = [
  { title: "Dates & term", types: ["effective_date", "change_term"] },
  { title: "Insured & contact", types: ["insured_name", "contact_fields"] },
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

type ClientStep = "welcome" | "changes" | "towed" | "details" | "review" | "thanks";

export default function ClientApp({ token }: { token: string }) {
  const [session, setSession] = useState<EndorsementSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ClientStep>("welcome");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = await apiGetClientSession(token);
        setSession(s);
        if (s.status === "client_submitted" || s.status === "confirmation_sent" || s.status === "ready_to_issue") {
          setStep("thanks");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Link not found");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const gate = useMemo(
    () => (session ? getClientCompletenessGate(session) : []),
    [session],
  );
  const gateOk = useMemo(
    () => (session ? isClientGateComplete(session) : false),
    [session],
  );

  const persistGen = useMemo(() => ({ n: 0 }), []);
  const persist = async (next: EndorsementSession, submit = false) => {
    setSession(next);
    const gen = ++persistGen.n;
    setSaving(true);
    try {
      const saved = await apiSaveClientSession(token, next, submit);
      if (gen !== persistGen.n && !submit) return saved;
      setSession(saved);
      if (submit) setStep("thanks");
      return saved;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally {
      if (gen === persistGen.n) setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="app-shell client-shell">
        <header className="brand-bar">
          <div className="brand-mark">
            <div className="eyebrow">Mexican Auto Insurance</div>
            <h1>Link not available</h1>
            <p>{error}</p>
          </div>
        </header>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell client-shell">
        <p className="session-meta">Loading your form…</p>
      </div>
    );
  }

  const feeAmt = endorsementFeeAmount(session);
  const typesLocked = session.changeTypesLockedByStaff && session.changeTypes.length > 0;

  if (step === "thanks") {
    return (
      <div className="app-shell client-shell">
        <header className="brand-bar">
          <div className="brand-mark">
            <div className="eyebrow">Mexican Auto Insurance</div>
            <h1>Thank you</h1>
            <p>
              We received your answers for policy{" "}
              <strong>{session.policy.crtNumber || "on file"}</strong>. Our office will review
              and email a written confirmation of what changes before anything is issued.
            </p>
          </div>
        </header>
        <div className="panel">
          <div className="panel-body">
            <p className="step-help" style={{ marginBottom: 0 }}>
              Questions? Call (800) 966-6830 or email Info@MexicanAutoInsurance.com.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell client-shell">
      <header className="brand-bar">
        <div className="brand-mark">
          <div className="eyebrow">Mexican Auto Insurance · Client form</div>
          <h1>Complete your endorsement details</h1>
          <p>
            {session.policy.insuredName || "Hello"}
            {session.policy.crtNumber ? ` · Policy ${session.policy.crtNumber}` : ""}
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-body">
          {step === "welcome" ? (
            <>
              <h2 className="step-title">A few details from you</h2>
              <p className="step-help">
                Lewis and Lewis started this request. Please answer in plain language — especially
                whether you are bringing anything towed. This is not a binder of insurance.
              </p>
              <div className="field-grid two">
                <Field label="Name on policy">
                  <input value={session.policy.insuredName} disabled />
                </Field>
                <Field label="Policy / CRT #">
                  <input value={session.policy.crtNumber} disabled />
                </Field>
                <Field label="Email">
                  <input value={session.policy.email} disabled />
                </Field>
                <Field label="Phone" hint="optional">
                  <input
                    value={session.policy.phone}
                    onChange={(e) =>
                      void persist({
                        ...session,
                        policy: { ...session.policy, phone: e.target.value },
                      })
                    }
                    placeholder="(555) 555-5555"
                  />
                </Field>
                <Field
                  label="Current term (if you know it)"
                  hint="sets the fee class: $15 for 1–20 Days, $40 for longer"
                >
                  <select
                    value={session.termChange.currentTerm}
                    onChange={(e) =>
                      void persist({
                        ...session,
                        termChange: {
                          ...session.termChange,
                          currentTerm: e.target.value as TermOption | "",
                        },
                      })
                    }
                  >
                    <option value="">Not sure…</option>
                    {TERM_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="fee-banner">{feeContextLabel(session)}</p>
            </>
          ) : null}

          {step === "changes" ? (
            <>
              <h2 className="step-title">
                {typesLocked ? "Your requested changes" : "What needs to change?"}
              </h2>
              {typesLocked ? (
                <>
                  <p className="step-help">
                    Our office already marked what you asked for by phone or email. You’ll only
                    fill these sections — plus a required towed-unit question next.
                  </p>
                  <ul className="locked-type-list">
                    {session.changeTypes.map((type) => (
                      <li key={type} className="locked-type-item">
                        {CHANGE_TYPE_LABELS[type]}
                        {isSpecialChange(type) ? (
                          <span className="special-badge">Docs may be required</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="step-help">
                    Select everything that needs to change. You can stack multiple changes in one
                    request (one fee).
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
                        {group.types.map((type) => {
                          const selected = session.changeTypes.includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              className={`chip-toggle ${selected ? "selected" : ""} ${isSpecialChange(type) ? "special" : ""}`}
                              onClick={() => {
                                const changeTypes = selected
                                  ? session.changeTypes.filter((t) => t !== type)
                                  : [...session.changeTypes, type];
                                void persist({ ...session, changeTypes });
                              }}
                            >
                              {CHANGE_TYPE_LABELS[type]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="field-grid two" style={{ marginTop: "1.25rem" }}>
                <Field label="When should this change take effect?">
                  <input
                    type="date"
                    value={session.effectiveDate}
                    onChange={(e) =>
                      void persist({ ...session, effectiveDate: e.target.value })
                    }
                  />
                </Field>
                {session.changeTypes.includes("effective_date") ? (
                  <Field label="Prior effective date on the policy">
                    <input
                      type="date"
                      value={session.priorEffectiveDate}
                      onChange={(e) =>
                        void persist({
                          ...session,
                          priorEffectiveDate: e.target.value,
                        })
                      }
                    />
                  </Field>
                ) : (
                  <div />
                )}
              </div>

              <div className="section-card" style={{ marginTop: "1rem" }}>
                <h3>Endorsement fee</h3>
                <p className="step-help">
                  The endorsement/policy fee for this request is <strong>${feeAmt}</strong> ($15
                  for 1–20 Days / $40 for 1 Month or longer). Payment stays with our usual office
                  process. Only our staff can waive a fee — you will not see a waive option here.
                </p>
                <label className="checkbox-row tap-target">
                  <input
                    type="checkbox"
                    checked={session.feeAcknowledged}
                    onChange={(e) =>
                      void persist({
                        ...session,
                        feeAcknowledged: e.target.checked,
                      })
                    }
                  />
                  <span>
                    I understand the <strong>${feeAmt}</strong> endorsement fee applies once for
                    this stacked request.
                  </span>
                </label>
              </div>

              <div className="section-card" style={{ marginTop: "1rem" }}>
                <h3>Missed information → additional fee</h3>
                <label className="checkbox-row tap-target">
                  <input
                    type="checkbox"
                    checked={session.missedInfoFeeAcknowledged}
                    onChange={(e) =>
                      void persist({
                        ...session,
                        missedInfoFeeAcknowledged: e.target.checked,
                      })
                    }
                  />
                  <span>
                    I acknowledge that incomplete or missed details may require a{" "}
                    <strong>new endorsement request</strong> and an{" "}
                    <strong>additional ${feeAmt} fee</strong>.
                  </span>
                </label>
              </div>
            </>
          ) : null}

          {step === "towed" ? (
            <>
              <h2 className="step-title">Are you bringing a towed unit?</h2>
              <p className="step-help">
                Required. Mexican law: trailers, boats, campers, and other attachments must be
                listed on the policy (at least liability / $0 value).
              </p>
              <TowedUnitHelper />
              <p className="tow-separate-hint">{TOWED_SEPARATE_UNITS_HINT}</p>
              <div className="choice-row">
                <button
                  type="button"
                  className={`choice ${session.towedBringing === "yes" ? "selected" : ""}`}
                  onClick={() => {
                    const changeTypes = session.changeTypes.includes("towed_units")
                      ? session.changeTypes
                      : [...session.changeTypes, "towed_units" as ChangeType];
                    void persist({
                      ...session,
                      towedBringing: "yes",
                      changeTypes,
                    });
                  }}
                >
                  <strong>Yes</strong>
                  <span>Trailer, boat, camper, or other towed unit</span>
                </button>
                <button
                  type="button"
                  className={`choice ${session.towedBringing === "no" ? "selected" : ""}`}
                  onClick={() =>
                    void persist({ ...session, towedBringing: "no" })
                  }
                >
                  <strong>No</strong>
                  <span>Nothing towed by or on the vehicle</span>
                </button>
              </div>
              {session.towedBringing === "yes" ? (
                <div style={{ marginTop: "1.1rem" }}>
                  <TowedForm
                    units={session.towedUnits}
                    onChange={(towedUnits) =>
                      void persist({ ...session, towedUnits })
                    }
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {step === "details" ? (
            <StepDetails
              session={session}
              onChange={(s) => void persist(s)}
            />
          ) : null}

          {step === "review" ? (
            <>
              <h2 className="step-title">Check before you send</h2>
              <p className="step-help">
                Fix anything marked incomplete, then submit. Our staff will review and email you
                a confirmation of changes.
              </p>
              <ul className="gate-list">
                {gate.map((item) => (
                  <li
                    key={item.id}
                    className={`gate-item ${item.ok ? "ok" : "bad"}`}
                  >
                    {item.ok ? "✓" : "○"} {item.label}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="actions actions-sticky">
            {step !== "welcome" ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const order: ClientStep[] = [
                    "welcome",
                    "changes",
                    "towed",
                    "details",
                    "review",
                  ];
                  const i = order.indexOf(step);
                  setStep(order[Math.max(0, i - 1)]);
                }}
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="right">
              {step !== "review" ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => {
                    const order: ClientStep[] = [
                      "welcome",
                      "changes",
                      "towed",
                      "details",
                      "review",
                    ];
                    const i = order.indexOf(step);
                    setStep(order[Math.min(order.length - 1, i + 1)]);
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!gateOk || saving}
                  onClick={() => void persist(session, true)}
                >
                  {saving ? "Submitting…" : "Submit to Lewis and Lewis"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
