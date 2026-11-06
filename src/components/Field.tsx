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
    <div className={`field ${className}`.trim()}>
      <label>
        {label}
        {hint ? <span className="hint"> — {hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
