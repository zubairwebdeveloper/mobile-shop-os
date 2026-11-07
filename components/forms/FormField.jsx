"use client";

import { Controller } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SELECT_CLASSES =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none " +
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 " +
  "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

/**
 * One labelled form field: React Hook Form Controller + shadcn Field components.
 * - `multiline` renders a textarea
 * - `options` ([{ value, label }]) renders a native select (accessible, no extra dependency)
 * `idPrefix` keeps element IDs unique when several forms share a page.
 */
export default function FormField({
  control,
  name,
  label,
  description,
  type = "text",
  placeholder,
  multiline = false,
  options,
  autoComplete,
  inputMode,
  idPrefix = "f",
  disabled = false,
}) {
  const id = `${idPrefix}-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {options ? (
            <select {...field} id={id} disabled={disabled} aria-invalid={fieldState.invalid} className={SELECT_CLASSES}>
              {options.map((option) => (
                <option key={option.value} value={option.value} className="bg-popover text-popover-foreground">
                  {option.label}
                </option>
              ))}
            </select>
          ) : multiline ? (
            <Textarea
              {...field}
              id={id}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
            />
          ) : (
            <Input
              {...field}
              id={id}
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              inputMode={inputMode}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
            />
          )}
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  );
}
