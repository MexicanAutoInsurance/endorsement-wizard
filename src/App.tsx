import { useEffect, useMemo, useState } from "react";
import type { EndorsementSession } from "./types";
import { STATUS_LABELS } from "./types";
import {
  deleteSession,
  getActiveSessionId,
  loadSessions,
  startNewSession,
  upsertSession,
  setActiveSessionId,
} from "./lib/storage";
import { isGateComplete } from "./lib/validation";
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
} from "./components/WizardSteps";

function Home({
  sessions,
  onNew,
  onOpen,
  onDelete,
}: {
  sessions: EndorsementSession[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand-mark">
          <div className="eyebrow">Lewis and Lewis · Staff</div>
          <h1>Mexican Auto Insurance</h1>
          <p>Endorsement intake wizard — stack changes, force the towed question, confirm in writing.</p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-body">
          <h2 className="step-title">Sessions</h2>
          <p className="step-help">
            Start a new endorsement session for phone or email intake. Drafts save in this browser.
          </p>
          <button type="button" className="btn btn-primary" onClick={onNew}>
            New endorsement session
          </button>

          <div className="home-grid">
            {sessions.length === 0 ? (
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

export default function App() {
  const [sessions, setSessions] = useState<EndorsementSession[]>([]);
  const [session, setSession] = useState<EndorsementSession | null>(null);
  const [step, setStep] = useState<StepId>("policy");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const all = loadSessions();
    setSessions(all);
    const active = getActiveSessionId();
    if (active) {
      const found = all.find((s) => s.id === active);
      if (found) setSession(found);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const persist = (next: EndorsementSession) => {
    upsertSession(next);
    setSession(next);
    setSessions(loadSessions());
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
      return;
    }
    setStep(STEP_IDS[stepIndex - 1]);
  };

  if (!session) {
    return (
      <Home
        sessions={sessions}
        onNew={() => {
          const s = startNewSession();
          setSessions(loadSessions());
          setSession(s);
          setStep("policy");
        }}
        onOpen={(id) => {
          const found = sessions.find((s) => s.id === id);
          if (!found) return;
          setActiveSessionId(id);
          setSession(found);
          setStep("policy");
        }}
        onDelete={(id) => {
          deleteSession(id);
          setSessions(loadSessions());
        }}
      />
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
        <div className="status-pill">{STATUS_LABELS[session.status]}</div>
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
          {step === "policy" ? (
            <StepPolicy session={session} onChange={persist} />
          ) : null}
          {step === "changes" ? (
            <StepChanges session={session} onChange={persist} />
          ) : null}
          {step === "towed" ? <StepTowed session={session} onChange={persist} /> : null}
          {step === "details" ? (
            <StepDetails session={session} onChange={persist} />
          ) : null}
          {step === "gate" ? <StepGate session={session} /> : null}
          {step === "summary" ? <StepSummary session={session} /> : null}
          {step === "finish" ? (
            <StepFinish session={session} onChange={persist} onToast={setToast} />
          ) : null}

          <div className="actions">
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
                  onClick={() => setSession(null)}
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
