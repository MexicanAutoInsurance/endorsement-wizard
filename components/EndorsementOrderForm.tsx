"use client";

import type { EndorsementSession } from "@/lib/types";
import {
  orderFormChangeLines,
  orderFormChecks,
  orderFormContactLine,
} from "@/lib/order-form";

function Mark({ on }: { on: boolean }) {
  return (
    <span className={`order-check ${on ? "on" : ""}`} aria-hidden="true">
      {on ? "●" : "○"}
    </span>
  );
}

export function EndorsementOrderForm({
  session,
  onClose,
}: {
  session: EndorsementSession;
  onClose: () => void;
}) {
  const checks = orderFormChecks(session);
  const lines = orderFormChangeLines(session);
  const today = new Date().toLocaleDateString("en-US");
  const date =
    session.clientSubmittedAt ||
    session.updatedAt ||
    session.createdAt ||
    today;

  return (
    <div className="order-form-shell">
      <div className="order-form-toolbar no-print">
        <p className="step-help" style={{ margin: 0 }}>
          Staff printable <strong>Renewal – Endorsement</strong> order form (from → to). Card
          fields stay blank — no PCI. Use browser Print.
        </p>
        <div className="actions" style={{ margin: 0, border: 0, padding: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Back to session
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            Print order form
          </button>
        </div>
      </div>

      <article className="order-form-page" aria-label="Renewal Endorsement Form">
        <header className="order-form-header">
          <h1>Renewal – Endorsement Form</h1>
          <p className="order-agency">Lewis and Lewis Insurance Agency, Inc.</p>
          <p className="order-meta">
            California Surplus Line Insurance Broker License #0645420
            <br />
            11900 W. Olympic Boulevard, Suite 475, Los Angeles, CA 90064
            <br />
            Telephone (800) 966-6830 · (310) 207-7700 · Fax (310) 207-7701
            <br />
            E-mail Info@MexicanAutoInsurance.com · www.MexicanAutoInsurance.com
          </p>
        </header>

        <div className="order-field-row">
          <span className="order-label">Date:</span>
          <span className="order-value">
            {new Date(date).toLocaleDateString("en-US")}
          </span>
        </div>
        <div className="order-field-row">
          <span className="order-label">Telephone and e-mail:</span>
          <span className="order-value">{orderFormContactLine(session) || "—"}</span>
        </div>
        <div className="order-field-row">
          <span className="order-label">Name of Insured:</span>
          <span className="order-value">{session.policy.insuredName || "—"}</span>
        </div>
        <div className="order-field-row">
          <span className="order-label">
            Renewal and/or Endorsement Certificate / Policy to be Renewed or Endorsed #
          </span>
          <span className="order-value">{session.policy.crtNumber || "—"}</span>
        </div>

        <div className="order-checks">
          <label>
            <Mark on={checks.personal} /> Personal Data Change
          </label>
          <label>
            <Mark on={checks.vehicle} /> Vehicle Data Change
          </label>
          <label>
            <Mark on={checks.towed} /> Towed Unit Change
          </label>
          <label>
            <Mark on={checks.optional} /> Add an Optional Coverage
          </label>
          <label>
            <Mark on={checks.other} /> Other
          </label>
          <label>
            <Mark on={checks.special_send} /> Special sending instructions.
          </label>
        </div>

        <div className="order-field-row">
          <span className="order-label">Renewal or Endorsement to be Effective</span>
          <span className="order-value">{session.effectiveDate || "—"}</span>
        </div>

        <section className="order-notes" aria-label="Change details from to">
          <h2 className="order-notes-title">Change details (from → to)</h2>
          {lines.length === 0 ? (
            <p className="order-note-line">(No change details entered yet.)</p>
          ) : (
            lines.map((line, i) => (
              <p key={i} className="order-note-line">
                {line}
              </p>
            ))
          )}
          {session.policy.beforeNotes.trim() ? (
            <p className="order-note-line">
              FoxPro / before notes: {session.policy.beforeNotes.trim()}
            </p>
          ) : null}
        </section>

        <section className="order-payment" aria-label="Payment — leave blank">
          <p className="order-pay-hint">
            Payment (fill by hand if needed — not stored in this app)
          </p>
          <div className="order-field-row">
            <span className="order-label">
              MasterCard; Visa; American Express; Discover:
            </span>
            <span className="order-value blank">&nbsp;</span>
          </div>
          <div className="order-field-row">
            <span className="order-label">Card Expiration Month / Year:</span>
            <span className="order-value blank">&nbsp;</span>
          </div>
          <div className="order-admin-grid">
            <div>
              <span className="order-label">Client code</span>
              <span className="order-value blank">&nbsp;</span>
            </div>
            <div>
              <span className="order-label">Invoice#</span>
              <span className="order-value blank">&nbsp;</span>
            </div>
            <div>
              <span className="order-label">Receipt#</span>
              <span className="order-value blank">&nbsp;</span>
            </div>
            <div>
              <span className="order-label">Amount $</span>
              <span className="order-value blank">&nbsp;</span>
            </div>
          </div>
          <div className="order-admin-grid">
            <div>
              <span className="order-label">Processed by:</span>
              <span className="order-value">
                {session.attestation.takenBy || ""}
              </span>
            </div>
            <div>
              <span className="order-label">Date:</span>
              <span className="order-value">
                {session.attestation.date || ""}
              </span>
            </div>
          </div>
        </section>

        <footer className="order-form-footer">
          <span>Quálitas · Lewis and Lewis Insurance Agency</span>
          <span>Revision 190311 · App fill {session.id.slice(0, 8)}</span>
        </footer>
      </article>
    </div>
  );
}
