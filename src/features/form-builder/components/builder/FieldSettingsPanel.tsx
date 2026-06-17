"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "../../ui/Checkbox";
import type {
  ColorField,
  DateField,
  DividerField,
  FormField,
  FormFieldPrintOptions,
  HeadingField,
  ImageField,
  NumberField,
  RadioField,
  SelectField,
  StaticTextField,
  TextField,
  TextareaField,
} from "../../types/field";
import {
  hasOptions,
  hasPlaceholder,
  isDisplayBlock,
} from "../../lib/fieldCapabilities";
import { assertNever } from "../../lib/exhaustive";
import { OptionsEditor } from "./OptionsEditor";

interface Props {
  field: FormField | null;
  onChange: (field: FormField) => void;
}

export function FieldSettingsPanel({ field, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Field settings</CardTitle>
      </CardHeader>
      <CardBody>
        {field === null ? (
          <p className="text-sm text-gray-500">Select a field to edit its settings.</p>
        ) : (
          <div className="space-y-4">
            <CommonSection field={field} onChange={onChange} />
            <TypeSpecificSection field={field} onChange={onChange} />
            <PrintSection field={field} onChange={onChange} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// -- Common section (label/description/placeholder/required/width) ----------

interface SectionProps {
  field: FormField;
  onChange: (field: FormField) => void;
}

function CommonSection({ field, onChange }: SectionProps) {
  const display = isDisplayBlock(field);
  return (
    <div className="space-y-3">
      <LabeledInput
        label={display && field.type === "heading" ? "Heading text" : "Label"}
        value={field.label}
        onChange={(label) => onChange({ ...field, label })}
      />

      {!display ? (
        <LabeledTextarea
          label="Description"
          value={field.description ?? ""}
          onChange={(description) => onChange({ ...field, description })}
        />
      ) : null}

      {hasPlaceholder(field) ? (
        <LabeledInput
          label="Placeholder"
          value={field.placeholder ?? ""}
          onChange={(placeholder) => onChange({ ...field, placeholder })}
        />
      ) : null}

      {!display ? (
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <Checkbox
            checked={Boolean(field.required)}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
          />
          <span>Required</span>
        </label>
      ) : null}

      <LabeledSelect
        label="Width"
        value={field.width ?? "full"}
        onChange={(width) =>
          onChange({ ...field, width: width === "half" ? "half" : "full" })
        }
        options={[
          { label: "Full", value: "full" },
          { label: "Half", value: "half" },
        ]}
      />
    </div>
  );
}

// -- Type-specific section ---------------------------------------------------

function TypeSpecificSection({ field, onChange }: SectionProps) {
  // Exhaustive switch over the discriminated FormField union. Each branch
  // narrows `field` to its concrete interface, so no casts are needed.
  switch (field.type) {
    case "text":
      return <TextSection field={field} onChange={onChange} />;
    case "textarea":
      return <TextareaSection field={field} onChange={onChange} />;
    case "number":
      return <NumberSection field={field} onChange={onChange} />;
    case "checkbox":
      return null;
    case "select":
    case "radio":
      return <OptionsSection field={field} onChange={onChange} />;
    case "date":
      return <DateSection field={field} onChange={onChange} />;
    case "image":
      return <ImageSection field={field} onChange={onChange} />;
    case "color":
      return <ColorSection field={field} onChange={onChange} />;
    case "staticText":
      return <StaticTextSection field={field} onChange={onChange} />;
    case "heading":
      return <HeadingSection field={field} onChange={onChange} />;
    case "divider":
      return <DividerSection field={field} onChange={onChange} />;
    default:
      // Exhaustiveness check: adding a new variant to FormField makes
      // this call a compile-time error.
      return assertNever(field);
  }
}

// ---- Sections per type -----------------------------------------------------

function TextSection({
  field,
  onChange,
}: {
  field: TextField;
  onChange: (f: TextField) => void;
}) {
  return (
    <LabeledNumberInput
      label="Max length"
      value={field.maxLength ?? null}
      onChange={(maxLength) => onChange({ ...field, maxLength: maxLength ?? undefined })}
    />
  );
}

function TextareaSection({
  field,
  onChange,
}: {
  field: TextareaField;
  onChange: (f: TextareaField) => void;
}) {
  return (
    <div className="space-y-3">
      <LabeledNumberInput
        label="Rows"
        value={field.rows ?? null}
        onChange={(rows) => onChange({ ...field, rows: rows ?? undefined })}
      />
      <LabeledNumberInput
        label="Max length"
        value={field.maxLength ?? null}
        onChange={(maxLength) => onChange({ ...field, maxLength: maxLength ?? undefined })}
      />
    </div>
  );
}

function NumberSection({
  field,
  onChange,
}: {
  field: NumberField;
  onChange: (f: NumberField) => void;
}) {
  return (
    <div className="space-y-3">
      <LabeledNumberInput
        label="Min"
        value={field.min ?? null}
        onChange={(min) => onChange({ ...field, min: min ?? undefined })}
      />
      <LabeledNumberInput
        label="Max"
        value={field.max ?? null}
        onChange={(max) => onChange({ ...field, max: max ?? undefined })}
      />
      <LabeledNumberInput
        label="Step"
        value={field.step ?? null}
        onChange={(step) => onChange({ ...field, step: step ?? undefined })}
      />
    </div>
  );
}

function OptionsSection({
  field,
  onChange,
}: {
  field: SelectField | RadioField;
  onChange: (f: FormField) => void;
}) {
  if (!hasOptions(field)) return null;
  return (
    <OptionsEditor
      options={field.options}
      onChange={(options) => {
        // Narrow back to the original concrete type via the discriminant.
        if (field.type === "select") {
          const next: SelectField = { ...field, options };
          onChange(next);
        } else {
          const next: RadioField = { ...field, options };
          onChange(next);
        }
      }}
    />
  );
}

function DateSection({
  field,
  onChange,
}: {
  field: DateField;
  onChange: (f: DateField) => void;
}) {
  return (
    <div className="space-y-3">
      <LabeledInput
        label="Min (yyyy-mm-dd)"
        value={field.min ?? ""}
        onChange={(min) => onChange({ ...field, min: min || undefined })}
      />
      <LabeledInput
        label="Max (yyyy-mm-dd)"
        value={field.max ?? ""}
        onChange={(max) => onChange({ ...field, max: max || undefined })}
      />
    </div>
  );
}

function ImageSection({
  field,
  onChange,
}: {
  field: ImageField;
  onChange: (f: ImageField) => void;
}) {
  return (
    <LabeledNumberInput
      label="Max size (MB)"
      value={field.maxSizeMb ?? null}
      onChange={(maxSizeMb) => onChange({ ...field, maxSizeMb: maxSizeMb ?? undefined })}
    />
  );
}

function ColorSection({
  field,
  onChange: _onChange,
}: {
  field: ColorField;
  onChange: (f: ColorField) => void;
}) {
  // No color-specific settings for MVP; reference field to keep the
  // discriminated branch exhaustive and the parameter typed.
  void field;
  void _onChange;
  return null;
}

function StaticTextSection({
  field,
  onChange,
}: {
  field: StaticTextField;
  onChange: (f: StaticTextField) => void;
}) {
  return (
    <LabeledTextarea
      label="Content"
      value={field.content}
      onChange={(content) => onChange({ ...field, content })}
    />
  );
}

function HeadingSection({
  field,
  onChange,
}: {
  field: HeadingField;
  onChange: (f: HeadingField) => void;
}) {
  return (
    <LabeledSelect
      label="Level"
      value={String(field.level ?? 2)}
      onChange={(v) => {
        const level = v === "1" ? 1 : v === "3" ? 3 : 2;
        onChange({ ...field, level });
      }}
      options={[
        { label: "H1", value: "1" },
        { label: "H2", value: "2" },
        { label: "H3", value: "3" },
      ]}
    />
  );
}

function DividerSection({
  field,
  onChange: _onChange,
}: {
  field: DividerField;
  onChange: (f: DividerField) => void;
}) {
  void field;
  void _onChange;
  return null;
}

// ---- Print section --------------------------------------------------------
// Applies to every field type (including display blocks). Updates the
// optional `field.print` immutably and strips it entirely when no overrides
// remain, so old stored forms stay clean.

function withPrint<F extends FormField>(
  field: F,
  patch: { visible?: boolean | undefined; label?: string | undefined },
): F {
  const current: FormFieldPrintOptions = field.print ?? {};
  const merged: FormFieldPrintOptions = { ...current };

  if ("visible" in patch) {
    if (patch.visible === undefined) delete merged.visible;
    else merged.visible = patch.visible;
  }
  if ("label" in patch) {
    if (patch.label === undefined || patch.label === "") delete merged.label;
    else merged.label = patch.label;
  }

  const hasAny = merged.visible !== undefined || merged.label !== undefined;
  if (hasAny) {
    return { ...field, print: merged };
  }
  // Strip the key entirely when there are no overrides.
  const { print: _unused, ...rest } = field;
  void _unused;
  return rest as F;
}

function PrintSection({ field, onChange }: SectionProps) {
  const visible = field.print?.visible !== false; // default true
  const printLabel = field.print?.label ?? "";

  return (
    <section
      className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
      aria-label="Print settings"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Print
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-900">
        <Checkbox
          checked={visible}
          onChange={(e) =>
            // When enabled, drop the override entirely so the field defaults
            // back to "visible". When disabled, store visible: false.
            onChange(
              withPrint(field, {
                visible: e.target.checked ? undefined : false,
              }),
            )
          }
        />
        <span>Show in print</span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
          Print label
        </span>
        <Input
          value={printLabel}
          onChange={(e) => onChange(withPrint(field, { label: e.target.value }))}
          placeholder={field.label}
        />
        <span className="mt-1 block text-[11px] text-gray-500">
          If empty, the regular label is used in print.
        </span>
      </label>
    </section>
  );
}

// ---- Small labeled-control helpers ----------------------------------------

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function LabeledNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <Input
        type="number"
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          onChange(Number.isNaN(n) ? null : n);
        }}
      />
    </label>
  );
}
