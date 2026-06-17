import type { FormSchema } from "../types/schema";
import { generateId } from "./id";

export function createEmptyForm(partial?: Partial<FormSchema>): FormSchema {
  const now = new Date().toISOString();
  return {
    id: generateId("form"),
    title: "Untitled form",
    version: 1,
    fields: [],
    settings: {
      submitButtonLabel: "Submit",
      layout: "single-column",
    },
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}
