"use client";

import type { FormField } from "../../types/field";
import { FIELD_META } from "../../lib/fieldMeta";
import { isDisplayBlock } from "../../lib/fieldCapabilities";

interface Props {
  field: FormField;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onRemove: (id: string) => void;
}

export function FieldListItem({
  field,
  selected,
  isFirst,
  isLast,
  onSelect,
  onMove,
  onRemove,
}: Props) {
  const typeLabel = FIELD_META[field.type].label;
  // Display blocks don't have a meaningful `label` semantically, but for
  // canvas display we still show `field.label` to give the user a handle.
  const displayLabel = field.label || typeLabel;

  return (
    <li
      aria-current={selected ? "true" : undefined}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
        selected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(field.id)}
        className="min-w-0 flex-1 text-left"
        aria-label={`Select field ${displayLabel}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-900">
            {displayLabel}
          </span>
          {field.required && !isDisplayBlock(field) ? (
            <span aria-label="required" className="text-xs text-red-600">
              *
            </span>
          ) : null}
          {field.print?.visible === false ? (
            <Badge tone="muted" title="This field will not appear in print">
              No print
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={isDisplayBlock(field) ? "block" : "type"}>
            {typeLabel}
          </Badge>
          {isDisplayBlock(field) ? (
            <Badge tone="muted">Layout</Badge>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          aria-label={`Move ${displayLabel} up`}
          disabled={isFirst}
          onClick={() => onMove(field.id, "up")}
        >
          ↑
        </IconButton>
        <IconButton
          aria-label={`Move ${displayLabel} down`}
          disabled={isLast}
          onClick={() => onMove(field.id, "down")}
        >
          ↓
        </IconButton>
        <IconButton
          aria-label={`Delete ${displayLabel}`}
          onClick={() => {
            if (typeof window === "undefined" || window.confirm(`Delete "${displayLabel}"?`)) {
              onRemove(field.id);
            }
          }}
          tone="danger"
        >
          ×
        </IconButton>
      </div>
    </li>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "default" | "danger";
}

function IconButton({ tone = "default", className = "", ...rest }: IconButtonProps) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 hover:bg-red-50 disabled:text-gray-300"
      : "text-gray-600 hover:bg-gray-100 disabled:text-gray-300";
  return (
    <button
      type="button"
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm transition disabled:cursor-not-allowed ${toneClass} ${className}`}
      {...rest}
    />
  );
}

type BadgeTone = "type" | "block" | "muted";

interface BadgeProps {
  tone?: BadgeTone;
  title?: string;
  children: React.ReactNode;
}

function Badge({ tone = "type", title, children }: BadgeProps) {
  const cls =
    tone === "block"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : tone === "muted"
        ? "bg-gray-50 text-gray-600 border-gray-200"
        : "bg-brand-50 text-brand-700 border-brand-100";
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}
