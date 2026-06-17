"use client";

import { useMemo } from "react";
import { FormBuilderPage } from "@/features/form-builder/components/builder/FormBuilderPage";
import { createEmptyForm } from "@/features/form-builder/lib/createEmptyForm";
import { createTextField } from "@/features/form-builder/lib/createField";

export default function FormsBuilderDemoPage() {
  // Seed an empty form with a single text field so the canvas isn't fully
  // empty on first open. The builder is fully functional with zero fields
  // — this just makes the demo more discoverable.
  const initialSchema = useMemo(() => {
    const seed = { ...createTextField(0), label: "Full name", required: true };
    return createEmptyForm({
      title: "Untitled form",
      description: "",
      fields: [seed],
    });
  }, []);

  return <FormBuilderPage initialSchema={initialSchema} />;
}
