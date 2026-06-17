"use client";

import { useCallback, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormRenderer } from "../FormRenderer";
import { useFormBuilder } from "../../hooks/useFormBuilder";
import type { FormSchema } from "../../types/schema";
import type { FormValues } from "../../types/submission";
import { BuilderHeader, type SaveStatus } from "./BuilderHeader";
import { FieldPalette } from "./FieldPalette";
import { FormBuilderCanvas } from "./FormBuilderCanvas";
import { FieldSettingsPanel } from "./FieldSettingsPanel";

interface Props {
  initialSchema: FormSchema;
  // Optional persistence hook. When omitted, the builder still works
  // — it just doesn't show a Save button (used by the in-memory demo).
  onSave?: (schema: FormSchema) => Promise<FormSchema | null>;
}

export function FormBuilderPage({ initialSchema, onSave }: Props) {
  const {
    state,
    selectedField,
    updateSchema,
    addField,
    selectField,
    updateField,
    removeField,
    moveField,
    setMode,
  } = useFormBuilder(initialSchema);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaveStatus("saving");
    const saved = await onSave(state.schema);
    if (saved === null) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      // Decay status to idle after a short while so it doesn't linger.
      window.setTimeout(() => setSaveStatus("idle"), 1500);
    }
  }, [onSave, state.schema]);

  // Preview values live in the builder page (not in the schema), so the
  // builder doesn't pollute the schema with submission data. They are
  // reset implicitly if the page is unmounted; not persisted by design.
  const [previewValues, setPreviewValues] = useState<FormValues>({});

  const { schema, mode, selectedFieldId } = state;

  return (
    <div className="space-y-4">
      <BuilderHeader
        schema={schema}
        mode={mode}
        onUpdate={updateSchema}
        onModeChange={setMode}
        onSave={onSave ? handleSave : undefined}
        saveStatus={saveStatus}
      />

      {mode === "edit" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <FieldPalette onAddField={addField} />
          </div>

          <div className="space-y-4">
            <FormBuilderCanvas
              fields={schema.fields}
              selectedFieldId={selectedFieldId}
              onSelect={selectField}
              onMove={moveField}
              onRemove={removeField}
            />
          </div>

          <div className="space-y-4">
            <FieldSettingsPanel field={selectedField} onChange={updateField} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardBody>
              {schema.fields.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Add fields in Edit mode to see a preview here.
                </p>
              ) : (
                <FormRenderer
                  schema={schema}
                  values={previewValues}
                  onChange={setPreviewValues}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug — preview values</CardTitle>
            </CardHeader>
            <CardBody>
              <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                {JSON.stringify(previewValues, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
