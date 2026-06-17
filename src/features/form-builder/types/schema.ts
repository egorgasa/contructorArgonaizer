import type { FormField } from "./field";

export interface FormSettings {
  submitButtonLabel?: string;
  printTitle?: string;
  layout?: "single-column" | "two-column";
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  version: number;
  fields: FormField[];
  settings: FormSettings;
  createdAt?: string;
  updatedAt?: string;
}
