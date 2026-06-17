"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { FormSchema, FormSettings } from "../../types/schema";
import type { BuilderMode } from "../../hooks/useFormBuilder";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  schema: FormSchema;
  mode: BuilderMode;
  onUpdate: (patch: Partial<FormSchema>) => void;
  onModeChange: (mode: BuilderMode) => void;
  // Optional save integration: when present, a Save button appears.
  onSave?: () => void;
  saveStatus?: SaveStatus;
}

export function BuilderHeader({
  schema,
  mode,
  onUpdate,
  onModeChange,
  onSave,
  saveStatus,
}: Props) {
  const fieldCount = schema.fields.length;

  const updateSettings = (patch: Partial<FormSettings>) => {
    onUpdate({ settings: { ...schema.settings, ...patch } });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Form title
            <Input
              value={schema.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Untitled form"
              className="mt-1"
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Description
            <Textarea
              value={schema.description ?? ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              placeholder="Optional description shown on the form"
              className="mt-1"
            />
          </label>
          <p className="text-xs text-gray-500">
            {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div
            role="tablist"
            aria-label="Builder mode"
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
          >
            <Button
              role="tab"
              aria-selected={mode === "edit"}
              variant={mode === "edit" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onModeChange("edit")}
            >
              Edit
            </Button>
            <Button
              role="tab"
              aria-selected={mode === "preview"}
              variant={mode === "preview" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onModeChange("preview")}
            >
              Preview
            </Button>
          </div>

          {onSave ? (
            <div className="flex items-center justify-end gap-2">
              <SaveStatusIndicator status={saveStatus} />
              <Button
                size="sm"
                onClick={onSave}
                disabled={saveStatus === "saving"}
                aria-label="Save form"
              >
                Save
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <details className="mt-4 rounded-lg border border-gray-200">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-800">
          Form settings
        </summary>
        <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Print title
            <Input
              value={schema.settings.printTitle ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateSettings({ printTitle: v === "" ? undefined : v });
              }}
              placeholder={schema.title || "Form title"}
              className="mt-1"
            />
            <span className="mt-1 block text-[11px] font-normal normal-case text-gray-500">
              Used on the printed page. Defaults to the form title.
            </span>
          </label>

          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Submit button label
            <Input
              value={schema.settings.submitButtonLabel ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateSettings({ submitButtonLabel: v === "" ? undefined : v });
              }}
              placeholder="Submit"
              className="mt-1"
            />
            <span className="mt-1 block text-[11px] font-normal normal-case text-gray-500">
              Shown in fill mode. Defaults to “Submit”.
            </span>
          </label>

          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Layout
            <Select
              value={schema.settings.layout ?? "single-column"}
              onChange={(e) => {
                const v = e.target.value;
                updateSettings({
                  layout:
                    v === "two-column" ? "two-column" : "single-column",
                });
              }}
              className="mt-1"
            >
              <option value="single-column">Single column</option>
              <option value="two-column">Two columns</option>
            </Select>
            <span className="mt-1 block text-[11px] font-normal normal-case text-gray-500">
              On mobile everything stacks to a single column.
            </span>
          </label>
        </div>
      </details>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status?: SaveStatus }) {
  if (status === "saving") {
    return <span className="text-xs text-gray-500">Saving…</span>;
  }
  if (status === "saved") {
    return <span className="text-xs text-green-700">Saved</span>;
  }
  if (status === "error") {
    return (
      <span
        role="alert"
        className="text-xs text-red-600"
        title="Storage may be full. Try removing old forms or large images."
      >
        Save failed
      </span>
    );
  }
  return null;
}
