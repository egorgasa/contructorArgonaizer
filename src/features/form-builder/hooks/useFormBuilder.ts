"use client";

import { useCallback, useReducer } from "react";
import type { FormField, FormFieldType } from "../types/field";
import type { FormSchema } from "../types/schema";
import { createField } from "../lib/createField";
import { sortFields } from "../lib/sortFields";

export type BuilderMode = "edit" | "preview";

export interface FormBuilderState {
  schema: FormSchema;
  selectedFieldId: string | null;
  mode: BuilderMode;
}

export type FormBuilderAction =
  | { type: "setSchema"; schema: FormSchema }
  | { type: "updateSchema"; patch: Partial<FormSchema> }
  | { type: "addField"; fieldType: FormFieldType }
  | { type: "selectField"; fieldId: string | null }
  | { type: "updateField"; field: FormField }
  | { type: "removeField"; fieldId: string }
  | { type: "moveField"; fieldId: string; direction: "up" | "down" }
  | { type: "setMode"; mode: BuilderMode };

function nowIso(): string {
  return new Date().toISOString();
}

function touchSchema(schema: FormSchema): FormSchema {
  return { ...schema, updatedAt: nowIso() };
}

function reducer(state: FormBuilderState, action: FormBuilderAction): FormBuilderState {
  switch (action.type) {
    case "setSchema":
      return { ...state, schema: action.schema, selectedFieldId: null };

    case "updateSchema":
      return {
        ...state,
        schema: touchSchema({ ...state.schema, ...action.patch }),
      };

    case "addField": {
      const nextOrder =
        state.schema.fields.reduce((max, f) => Math.max(max, f.order), -1) + 1;
      const field = createField(action.fieldType, nextOrder);
      return {
        ...state,
        schema: touchSchema({
          ...state.schema,
          fields: [...state.schema.fields, field],
        }),
        selectedFieldId: field.id,
      };
    }

    case "selectField":
      return { ...state, selectedFieldId: action.fieldId };

    case "updateField": {
      // Preserve order in the underlying array; the discriminated-union
      // type of the incoming field guarantees structural integrity.
      const fields = state.schema.fields.map((f) =>
        f.id === action.field.id ? action.field : f,
      );
      return { ...state, schema: touchSchema({ ...state.schema, fields }) };
    }

    case "removeField": {
      const fields = state.schema.fields.filter((f) => f.id !== action.fieldId);
      // If the removed field was selected, try to keep a neighbor selected
      // (the next field by order, falling back to the previous). This keeps
      // the settings panel populated and avoids an empty-selection blink.
      let nextSelected: string | null = state.selectedFieldId;
      if (state.selectedFieldId === action.fieldId) {
        const ordered = sortFields(state.schema.fields);
        const removedIndex = ordered.findIndex((f) => f.id === action.fieldId);
        const neighbor =
          ordered[removedIndex + 1] ?? ordered[removedIndex - 1] ?? null;
        nextSelected = neighbor ? neighbor.id : null;
      }
      return {
        ...state,
        schema: touchSchema({ ...state.schema, fields }),
        selectedFieldId: nextSelected,
      };
    }

    case "moveField": {
      const ordered = sortFields(state.schema.fields);
      const index = ordered.findIndex((f) => f.id === action.fieldId);
      if (index < 0) return state;
      const swapWith = action.direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= ordered.length) return state;

      // Swap `order` between the two adjacent fields. This keeps `order`
      // values as integers in [0, n-1] when they started that way, and
      // doesn't depend on array index after sort.
      const a = ordered[index];
      const b = ordered[swapWith];
      const fields = state.schema.fields.map((f) => {
        if (f.id === a.id) return { ...f, order: b.order };
        if (f.id === b.id) return { ...f, order: a.order };
        return f;
      });
      return { ...state, schema: touchSchema({ ...state.schema, fields }) };
    }

    case "setMode":
      return { ...state, mode: action.mode };
  }
}

export function useFormBuilder(initialSchema: FormSchema) {
  const [state, dispatch] = useReducer(reducer, {
    schema: initialSchema,
    selectedFieldId: null,
    mode: "edit" as BuilderMode,
  });

  const setSchema = useCallback(
    (schema: FormSchema) => dispatch({ type: "setSchema", schema }),
    [],
  );
  const updateSchema = useCallback(
    (patch: Partial<FormSchema>) => dispatch({ type: "updateSchema", patch }),
    [],
  );
  const addField = useCallback(
    (fieldType: FormFieldType) => dispatch({ type: "addField", fieldType }),
    [],
  );
  const selectField = useCallback(
    (fieldId: string | null) => dispatch({ type: "selectField", fieldId }),
    [],
  );
  const updateField = useCallback(
    (field: FormField) => dispatch({ type: "updateField", field }),
    [],
  );
  const removeField = useCallback(
    (fieldId: string) => dispatch({ type: "removeField", fieldId }),
    [],
  );
  const moveField = useCallback(
    (fieldId: string, direction: "up" | "down") =>
      dispatch({ type: "moveField", fieldId, direction }),
    [],
  );
  const setMode = useCallback(
    (mode: BuilderMode) => dispatch({ type: "setMode", mode }),
    [],
  );

  const selectedField =
    state.selectedFieldId !== null
      ? state.schema.fields.find((f) => f.id === state.selectedFieldId) ?? null
      : null;

  return {
    state,
    selectedField,
    setSchema,
    updateSchema,
    addField,
    selectField,
    updateField,
    removeField,
    moveField,
    setMode,
  };
}
