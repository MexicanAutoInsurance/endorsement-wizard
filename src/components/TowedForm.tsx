import type { TowedAction, TowedUnit, TowedUnitType } from "../types";
import {
  TOWED_ACTION_LABELS,
  TOWED_SEPARATE_UNITS_HINT,
  TOWED_TYPE_LABELS,
  WATERCRAFT_RELATED_TYPES,
  emptyTowedUnit,
} from "../types";
import { Field } from "./Field";

export function TowedForm({
  units,
  onChange,
}: {
  units: TowedUnit[];
  onChange: (next: TowedUnit[]) => void;
}) {
  const update = (id: string, patch: Partial<TowedUnit>) => {
    onChange(units.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const remove = (id: string) => {
    if (units.length <= 1) {
      onChange([emptyTowedUnit(crypto.randomUUID())]);
      return;
    }
    onChange(units.filter((u) => u.id !== id));
  };

  const showsWatercraftHint = units.some(
    (u) => u.type && WATERCRAFT_RELATED_TYPES.includes(u.type)
  );

  return (
    <div>
      <p className="tow-separate-hint">{TOWED_SEPARATE_UNITS_HINT}</p>
      {showsWatercraftHint ? (
        <div className="tow-watercraft-reminder" role="status">
          Watercraft-related type selected — remember: trailer, vessel, outboard, and dinghy
          each need their <strong>own</strong> towed-unit entry below (add rows as needed).
        </div>
      ) : null}
      {units.map((unit, index) => (
        <div className="section-card" key={unit.id}>
          <div className="section-card-head">
            <h3 style={{ margin: 0 }}>Towed unit #{index + 1}</h3>
            <button type="button" className="btn btn-ghost" onClick={() => remove(unit.id)}>
              Remove
            </button>
          </div>
          <div className="field-grid three">
            <Field label="Action">
              <select
                value={unit.action}
                onChange={(e) =>
                  update(unit.id, { action: e.target.value as TowedAction | "" })
                }
              >
                <option value="">Select…</option>
                {(Object.keys(TOWED_ACTION_LABELS) as TowedAction[]).map((key) => (
                  <option key={key} value={key}>
                    {TOWED_ACTION_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type" className="span-2">
              <select
                value={unit.type}
                onChange={(e) =>
                  update(unit.id, { type: e.target.value as TowedUnitType | "" })
                }
              >
                <option value="">Select type…</option>
                {(Object.keys(TOWED_TYPE_LABELS) as TowedUnitType[]).map((key) => (
                  <option key={key} value={key}>
                    {TOWED_TYPE_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <input
                value={unit.year}
                onChange={(e) => update(unit.id, { year: e.target.value })}
              />
            </Field>
            <Field label="Make">
              <input
                value={unit.make}
                onChange={(e) => update(unit.id, { make: e.target.value })}
              />
            </Field>
            <Field label="Model">
              <input
                value={unit.model}
                onChange={(e) => update(unit.id, { model: e.target.value })}
              />
            </Field>
            <Field label="Length">
              <input
                value={unit.length}
                onChange={(e) => update(unit.id, { length: e.target.value })}
              />
            </Field>
            <Field label="ID / VIN" className="span-2">
              <input
                value={unit.vin}
                onChange={(e) => update(unit.id, { vin: e.target.value })}
              />
            </Field>
            <Field label="Plate #">
              <input
                value={unit.plate}
                onChange={(e) => update(unit.id, { plate: e.target.value })}
              />
            </Field>
            <Field label="State / Province">
              <input
                value={unit.state}
                onChange={(e) => update(unit.id, { state: e.target.value })}
              />
            </Field>
            <Field label="Value" hint="$0 = liability only">
              <input
                value={unit.value}
                onChange={(e) => update(unit.id, { value: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Registered owner" className="span-2">
              <input
                value={unit.registeredOwner}
                onChange={(e) => update(unit.id, { registeredOwner: e.target.value })}
              />
            </Field>
            <Field label="Lienholder" className="span-2">
              <input
                value={unit.lienholder}
                onChange={(e) => update(unit.id, { lienholder: e.target.value })}
              />
            </Field>
            <Field label="Notes" className="span-2">
              <input
                value={unit.notes}
                onChange={(e) => update(unit.id, { notes: e.target.value })}
                placeholder="Optional — e.g. correcting plate only"
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginTop: "0.75rem" }}
        onClick={() => onChange([...units, emptyTowedUnit(crypto.randomUUID())])}
      >
        + Add another towed unit
      </button>
    </div>
  );
}
