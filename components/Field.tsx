"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field-label-text">
        {label}
        {hint ? <span className="hint"> — {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
