"use client";

import type { ChangeEvent } from "react";
import type { VehicleFields } from "@/lib/types";
import { Field } from "@/components/Field";

export function VehicleForm({
  value,
  onChange,
  title,
}: {
  value: VehicleFields;
  onChange: (next: VehicleFields) => void;
  title: string;
}) {
  const set =
    (key: keyof VehicleFields) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [key]: e.target.value });

  return (
    <div className="section-card">
      <h3>{title}</h3>
      <div className="field-grid three">
        <Field label="Year">
          <input value={value.year} onChange={set("year")} placeholder="2022" />
        </Field>
        <Field label="Make">
          <input value={value.make} onChange={set("make")} placeholder="Toyota" />
        </Field>
        <Field label="Model">
          <input value={value.model} onChange={set("model")} placeholder="4Runner" />
        </Field>
        <Field label="Length" hint="motorhome if applicable">
          <input value={value.length} onChange={set("length")} placeholder="ft" />
        </Field>
        <Field label="VIN" className="span-2">
          <input value={value.vin} onChange={set("vin")} placeholder="Vehicle ID number" />
        </Field>
        <Field label="Plate #">
          <input value={value.plate} onChange={set("plate")} />
        </Field>
        <Field label="State / Province">
          <input value={value.state} onChange={set("state")} />
        </Field>
        <Field label="CMV" hint="$0 = liability only">
          <input value={value.cmv} onChange={set("cmv")} placeholder="0" />
        </Field>
        <Field label="Other auto insurer" className="span-2">
          <input value={value.otherInsurer} onChange={set("otherInsurer")} />
        </Field>
        <Field label="Lienholder" className="span-2">
          <input value={value.lienholder} onChange={set("lienholder")} />
        </Field>
      </div>
    </div>
  );
}
