"use client";

import { Controller } from "react-hook-form";
import { Field, FieldDescription } from "@/components/ui/field";

/** Labelled native checkbox bound to a boolean form value. */
export default function CheckboxField({ control, name, label, description, idPrefix = "f" }) {
  const id = `${idPrefix}-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
            <input id={id} type="checkbox" checked={field.value === true} onChange={(e) => field.onChange(e.target.checked)} className="size-4" />
            {label}
          </label>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  );
}
