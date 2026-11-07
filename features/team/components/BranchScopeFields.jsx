"use client";

import { Controller, useWatch } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/** "All branches" checkbox plus one checkbox per branch (shown only when not all branches). */
export default function BranchScopeFields({ control, branches, idPrefix }) {
  const allBranches = useWatch({ control, name: "allBranches" });

  return (
    <>
      <Controller
        name="allBranches"
        control={control}
        render={({ field }) => (
          <Field>
            <label htmlFor={`${idPrefix}-all`} className="flex items-center gap-2 text-sm font-medium">
              <input
                id={`${idPrefix}-all`}
                type="checkbox"
                checked={field.value === true}
                onChange={(event) => field.onChange(event.target.checked)}
                className="size-4"
              />
              Access to all branches
            </label>
          </Field>
        )}
      />
      {!allBranches ? (
        <Controller
          name="branchIds"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Branches</FieldLabel>
              <div className="grid gap-1.5">
                {branches.map((branch) => {
                  const checked = field.value.includes(branch.id);
                  return (
                    <label key={branch.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          field.onChange(checked ? field.value.filter((id) => id !== branch.id) : [...field.value, branch.id])
                        }
                        className="size-4"
                      />
                      {branch.name}
                    </label>
                  );
                })}
              </div>
              <FieldDescription>The member only sees data of the selected branches.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      ) : null}
    </>
  );
}
