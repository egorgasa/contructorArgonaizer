import type { FormField } from "../../types/field";
import type { FieldValue, FormValues, ImageFieldValue } from "../../types/submission";
import { assertNever } from "../../lib/exhaustive";

interface PrintFieldRendererProps {
  field: FormField;
  values: FormValues;
}

const EMPTY = "—";

function isImageValue(v: FieldValue): v is ImageFieldValue {
  return typeof v === "object" && v !== null && "kind" in v && v.kind === "image";
}

function displayLabel(field: FormField): string {
  return field.print?.label ?? field.label;
}

function asTextLike(v: FieldValue): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  return null;
}

function FieldShell({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-field print-avoid-break">
      <div className="print-field-label">{label}</div>
      {description ? (
        <div className="print-meta" style={{ marginBottom: 4 }}>
          {description}
        </div>
      ) : null}
      <div className="print-field-value">{children}</div>
    </div>
  );
}

function Empty() {
  return <span className="print-field-value--empty">{EMPTY}</span>;
}

// Single-switch renderer over the discriminated FormField union. Each branch
// narrows `field.type`, picks the right value from `values`, and prints it.
// Display blocks (heading/staticText/divider) never read `values`.
export function PrintFieldRenderer({ field, values }: PrintFieldRendererProps) {
  if (field.print?.visible === false) return null;

  switch (field.type) {
    case "text":
    case "textarea": {
      const v = values[field.id];
      const text = asTextLike(v);
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {text === null ? <Empty /> : text}
        </FieldShell>
      );
    }
    case "number": {
      const v = values[field.id];
      const text = typeof v === "number" && Number.isFinite(v) ? String(v) : null;
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {text === null ? <Empty /> : text}
        </FieldShell>
      );
    }
    case "date": {
      const v = values[field.id];
      const text = typeof v === "string" && v !== "" ? v : null;
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {text === null ? <Empty /> : text}
        </FieldShell>
      );
    }
    case "select":
    case "radio": {
      const v = values[field.id];
      if (typeof v !== "string" || v === "") {
        return (
          <FieldShell label={displayLabel(field)} description={field.description}>
            <Empty />
          </FieldShell>
        );
      }
      const match = field.options.find((o) => o.value === v);
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {match ? match.label : v}
        </FieldShell>
      );
    }
    case "checkbox": {
      const v = values[field.id];
      const text = typeof v === "boolean" ? (v ? "Yes" : "No") : null;
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {text === null ? <Empty /> : text}
        </FieldShell>
      );
    }
    case "image": {
      const v = values[field.id];
      if (!isImageValue(v)) {
        return (
          <FieldShell label={displayLabel(field)} description={field.description}>
            <Empty />
          </FieldShell>
        );
      }
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.dataUrl} alt={v.name || displayLabel(field)} className="print-image" />
          <div className="print-image-meta">{v.name}</div>
        </FieldShell>
      );
    }
    case "color": {
      const v = values[field.id];
      const hex = typeof v === "string" && v !== "" ? v : null;
      return (
        <FieldShell label={displayLabel(field)} description={field.description}>
          {hex === null ? (
            <Empty />
          ) : (
            <span>
              <span
                className="print-color-swatch"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
              <span style={{ fontFamily: "ui-monospace, monospace" }}>{hex}</span>
            </span>
          )}
        </FieldShell>
      );
    }
    case "heading": {
      const level = field.level ?? 2;
      const text = displayLabel(field);
      const className =
        level === 1 ? "print-heading-1" : level === 2 ? "print-heading-2" : "print-heading-3";
      if (level === 1) return <h1 className={className}>{text}</h1>;
      if (level === 2) return <h2 className={className}>{text}</h2>;
      return <h3 className={className}>{text}</h3>;
    }
    case "staticText": {
      return <p className="print-static-text print-avoid-break">{field.content}</p>;
    }
    case "divider": {
      return <hr className="print-divider" />;
    }
    default:
      return assertNever(field);
  }
}
