"use client";

import { useEffect, useMemo, useState } from "react";
import type { EndorsementSession } from "@/lib/types";
import { CHANGE_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import {
  apiCreateSession,
  apiDeleteSession,
  apiListSessions,
  apiMarkInviteSent,
  apiSaveSession,
  apiUnlockStaff,
  getStaffAccessCode,
  setStaffAccessCode,
} from "@/lib/api-client";
import { buildClientInviteEmail, clientFillUrl } from "@/lib/client-link";
import { isGateComplete, isInviteBasicsComplete } from "@/lib/validation";
import {
  STEP_IDS,
  STEP_LABELS,
  type StepId,
  StepPolicy,
  StepChanges,
  StepTowed,
  StepDetails,
  StepGate,
  StepSummary,
  StepFinish,
} from "@/components/WizardSteps";
import { EndorsementOrderForm } from "@/components/EndorsementOrderForm";

const ACTIVE_KEY = "mai-endorsement-active-v3";

function Unlock({ onUnlocked }: { onUnlocked: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ configured: boolean; local: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/staff/unlock")
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => setInfo({ configured: false, local: true }));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!info?.configured) {
        setError(
          "Staff access is locked until STAFF_ACCESS_CODE is set in Cursor Secrets. Client magic links do not need this code.",
        );
        return;
      }
      await apiUnlockStaff(code);
      setStaffAccessCode(code);
      onUnlocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlock");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand-mark">
          <div className="eyebrow">Lewis and Lewis · Staff</div>
          <h1>Mexican Auto Insurance</h1>
          <p>Endorsement wizard — staff unlock</p>
        </div>
      </header>
      <div className="panel">
        <div className="panel-body">
          <h2 className="step-title">Staff access</h2>
          {info?.configured ? (
            <p className="step-help">
              Enter the staff access code (same value as the{" "}
              <strong>STAFF_ACCESS_CODE</strong> app secret). Client fill-out links never need
              this code.
            </p>
          ) : (
            <p className="step-help">
              Staff screens are locked until <strong>STAFF_ACCESS_CODE</strong> is added in
              Cursor Secrets
              {info?.local
                ? " (local: STAFF_ACCESS_CODE=your-code npm run dev)"
                : ""}
              . Client magic links stay public and do not use this code.
            </p>
          )}
          <div className="field-grid" style={{ maxWidth: 360 }}>
            <label className="field">
              <span className="field-label-text">Access code</span>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                autoComplete="current-password"
                disabled={!info?.configured}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </label>
          </div>
          {error ? <p className="gate-item bad">{error}</p> : null}
          {!info?.configured ? (
            <p className="gate-item bad" style={{ marginTop: "0.75rem" }}>
              Cannot unlock yet — set STAFF_ACCESS_CODE in Secrets, then refresh this page.
            </p>
          ) : null}
          <div className="actions" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !info?.configured || !code}
              onClick={() => void submit()}
            >
              Unlock staff wizard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home({
  sessions,
  loading,
  onNew,
  onOpen,
  onDelete,
  onRefresh,
}: {
  sessions: EndorsementSession[];
  loading: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand-mark">
          <div className="eyebrow">Lewis and Lewis · Staff</div>
          <h1>Mexican Auto Insurance</h1>
          <p>
            Enter basics, send the client a fill-out link, then review and confirm.
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-body">
          <h2 className="step-title">Sessions</h2>
          <p className="step-help">
            Sessions sync to the shared database so client magic links work on any device.
          </p>
          <div className="actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-primary" onClick={onNew}>
              New endorsement session
            </button>
            <button type="button" className="btn btn-secondary" onClick={onRefresh}>
              Refresh
            </button>
          </div>

          <div className="home-grid">
            {loading ? (
              <p className="session-meta">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="session-meta">No sessions yet.</p>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="session-row" style={{ display: "block" }}>
                  <button
                    type="button"
                    className="session-row"
                    style={{ border: 0, padding: 0, background: "transparent", boxShadow: "none" }}
                    onClick={() => onOpen(s.id)}
                  >
                    <strong>
                      {s.policy.insuredName || "Untitled"} · {s.policy.crtNumber || "No CRT#"}
                    </strong>
                    <div className="session-meta">
                      {STATUS_LABELS[s.status]} · {s.changeTypes.length} change
                      {s.changeTypes.length === 1 ? "" : "s"} · updated{" "}
                      {new Date(s.updatedAt).toLocaleString()}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: "0.35rem" }}
                    onClick={() => onDelete(s.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvitePanel({
  session,
  onSession,
  onToast,
}: {
  session: EndorsementSession;
  onSession: (s: EndorsementSession) => void;
  onToast: (msg: string) => void;
}) {
  const [clientUrl, setClientUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const basicsOk = isInviteBasicsComplete(session);

  const ensureLink = async () => {
    setBusy(true);
    try {
      const saved = await apiSaveSession({
        ...session,
        changeTypesLockedByStaff: session.changeTypes.length > 0,
      });
      const { session: next, clientUrl: url } = await apiMarkInviteSent(saved.id);
      onSession(next);
      setClientUrl(url);
      onToast("Client link ready");
      return url;
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Could not create link");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const email = useMemo(() => {
    const url = clientUrl || clientFillUrl("", session.clientToken);
    return buildClientInviteEmail(session, url);
  }, [session, clientUrl]);

  const mailto = `mailto:${encodeURIComponent(session.policy.email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;

  return (
    <div className="section-card invite-card" style={{ marginTop: "1.25rem" }}>
      <h3>Send client fill-out link</h3>
      <p className="step-help">
        {session.changeTypes.length > 0 ? (
          <>
            Client link will open <strong>only</strong> these sections:{" "}
            {session.changeTypes.map((t) => CHANGE_TYPE_LABELS[t]).join(", ")} — plus towed
            Yes/No and fee acknowledgments. Fee waive stays staff-only.
          </>
        ) : (
          <>
            No change types selected — client will see the full menu to choose. Prefer
            pre-selecting what they already requested by phone/email so their form stays short.
          </>
        )}
      </p>
      {!basicsOk ? (
        <p className="gate-item bad">Need CRT #, insured name, and email first.</p>
      ) : null}
      {session.status === "awaiting_client" ? (
        <p className="gate-item ok">Status: awaiting client answers.</p>
      ) : null}
      {session.status === "client_submitted" ? (
        <p className="gate-item ok">
          Client submitted {session.clientSubmittedAt
            ? new Date(session.clientSubmittedAt).toLocaleString()
            : ""}
          — review answers below, edit if needed, then continue to summary / confirmation.
        </p>
      ) : null}
          <div className="actions actions-sticky invite-actions" style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!basicsOk || busy}
          onClick={() => void ensureLink()}
        >
          {busy ? "Preparing…" : "Send client fill-out link"}
        </button>
        {basicsOk ? (
          <>
            <a className="btn btn-secondary" href={mailto}>
              Open mailto with link
            </a>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                const url = clientUrl || (await ensureLink());
                if (!url) return;
                const text = `${email.subject}\n\n${email.body}`;
                await navigator.clipboard.writeText(text);
                onToast("Invite email copied");
              }}
            >
              Copy email body
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                const url = clientUrl || clientFillUrl("", session.clientToken);
                await navigator.clipboard.writeText(url);
                onToast("Link copied");
              }}
            >
              Copy link only
            </button>
          </>
        ) : null}
      </div>
      {(clientUrl || session.clientLinkSentAt) && basicsOk ? (
        <p className="session-meta" style={{ marginTop: "0.75rem", wordBreak: "break-all" }}>
          Link: {clientUrl || clientFillUrl("", session.clientToken)}
        </p>
      ) : null}
    </div>
  );
}

export default function StaffApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [sessions, setSessions] = useState<EndorsementSession[]>([]);
  const [session, setSession] = useState<EndorsementSession | null>(null);
  const [step, setStep] = useState<StepId>("policy");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Never auto-unlock without a configured secret + stored code (fail closed)
    const existing = getStaffAccessCode();
    if (!existing) return;
    fetch("/api/staff/unlock")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => {
        if (d.configured) setUnlocked(true);
      })
      .catch(() => {
        /* stay locked */
      });
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const all = await apiListSessions();
      setSessions(all);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load sessions");
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    void refresh();
  }, [unlocked]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const persistGen = useMemo(() => ({ n: 0 }), []);
  const persist = async (next: EndorsementSession) => {
    setSession(next);
    const gen = ++persistGen.n;
    try {
      const saved = await apiSaveSession(next);
      // Ignore stale responses so rapid typing doesn't wipe newer fields
      if (gen !== persistGen.n) return;
      setSession(saved);
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === saved.id);
        if (idx < 0) return [saved, ...prev];
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    } catch (e) {
      if (gen !== persistGen.n) return;
      setToast(e instanceof Error ? e.message : "Save failed");
    }
  };

  const stepIndex = STEP_IDS.indexOf(step);
  const gateOk = useMemo(() => (session ? isGateComplete(session) : false), [session]);

  const goNext = () => {
    if (!session) return;
    if (step === "gate" && !gateOk) return;
    const next = STEP_IDS[Math.min(stepIndex + 1, STEP_IDS.length - 1)];
    setStep(next);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      setSession(null);
      setShowOrderForm(false);
      localStorage.removeItem(ACTIVE_KEY);
      return;
    }
    setStep(STEP_IDS[stepIndex - 1]);
  };

  if (!unlocked) {
    return <Unlock onUnlocked={() => setUnlocked(true)} />;
  }

  if (!session) {
    return (
      <>
        <Home
          sessions={sessions}
          loading={loading}
          onNew={() => {
            void (async () => {
              const s = await apiCreateSession();
              localStorage.setItem(ACTIVE_KEY, s.id);
              setSessions(await apiListSessions());
              setSession(s);
              setStep("policy");
            })();
          }}
          onOpen={(id) => {
            void (async () => {
              const all = await apiListSessions();
              const found = all.find((s) => s.id === id);
              if (!found) return;
              localStorage.setItem(ACTIVE_KEY, id);
              setSession(found);
              // After client submits, land on printable order form first
              if (found.status === "client_submitted") {
                setShowOrderForm(true);
                setStep("summary");
              } else {
                setShowOrderForm(false);
                setStep("policy");
              }
            })();
          }}
          onDelete={(id) => {
            void (async () => {
              await apiDeleteSession(id);
              setSessions(await apiListSessions());
            })();
          }}
          onRefresh={() => void refresh()}
        />
        {toast ? <div className="toast">{toast}</div> : null}
      </>
    );
  }

  if (showOrderForm) {
    return (
      <>
        <EndorsementOrderForm
          session={session}
          onClose={() => setShowOrderForm(false)}
        />
        {toast ? <div className="toast">{toast}</div> : null}
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand-mark">
          <div className="eyebrow">Lewis and Lewis · Staff wizard</div>
          <h1>Mexican Auto Insurance</h1>
          <p>
            {session.policy.insuredName || "New session"}
            {session.policy.crtNumber ? ` · ${session.policy.crtNumber}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowOrderForm(true)}
          >
            Print order form
          </button>
          <div className="status-pill">{STATUS_LABELS[session.status]}</div>
        </div>
      </header>

      <div className="panel">
        <nav className="stepper" aria-label="Wizard steps">
          {STEP_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              className={`step-chip ${step === id ? "active" : ""} ${i < stepIndex ? "done" : ""}`}
              onClick={() => {
                if (id === "summary" || id === "finish") {
                  if (!gateOk) return;
                }
                setStep(id);
              }}
            >
              {STEP_LABELS[id]}
            </button>
          ))}
        </nav>

        <div className="panel-body">
          {session.status === "client_submitted" ? (
            <div className="section-card invite-card" style={{ marginBottom: "1rem" }}>
              <h3>Client submitted — ready to print</h3>
              <p className="step-help">
                Open the printable Renewal–Endorsement order form (from → to), print or PDF it,
                then continue to confirmation email if needed. You can still edit fields in the
                wizard steps.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowOrderForm(true)}
              >
                View / print order form
              </button>
            </div>
          ) : null}

          {step === "policy" ? (
            <>
              <StepPolicy session={session} onChange={(s) => void persist(s)} />
              <InvitePanel
                session={session}
                onSession={(s) => {
                  setSession(s);
                  void refresh();
                }}
                onToast={setToast}
              />
            </>
          ) : null}
          {step === "changes" ? (
            <>
              <StepChanges session={session} onChange={(s) => void persist(s)} />
              <InvitePanel
                session={session}
                onSession={(s) => {
                  setSession(s);
                  void refresh();
                }}
                onToast={setToast}
              />
            </>
          ) : null}
          {step === "towed" ? (
            <StepTowed session={session} onChange={(s) => void persist(s)} />
          ) : null}
          {step === "details" ? (
            <StepDetails session={session} onChange={(s) => void persist(s)} />
          ) : null}
          {step === "gate" ? <StepGate session={session} /> : null}
          {step === "summary" ? (
            <>
              <StepSummary session={session} />
              <div className="actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOrderForm(true)}
                >
                  Print order form
                </button>
              </div>
            </>
          ) : null}
          {step === "finish" ? (
            <StepFinish
              session={session}
              onChange={(s) => void persist(s)}
              onToast={setToast}
            />
          ) : null}

          <div className="actions actions-sticky">
            <button type="button" className="btn btn-secondary" onClick={goBack}>
              {stepIndex === 0 ? "All sessions" : "Back"}
            </button>
            <div className="right">
              {step !== "finish" ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={goNext}
                  disabled={step === "gate" && !gateOk}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSession(null);
                    setShowOrderForm(false);
                    localStorage.removeItem(ACTIVE_KEY);
                  }}
                >
                  Done — back to sessions
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
