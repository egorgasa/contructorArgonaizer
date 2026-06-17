"use client";

import { useMemo } from "react";
import { FormFillPage } from "@/features/form-builder/components/fill/FormFillPage";
import { createEmptyForm } from "@/features/form-builder/lib/createEmptyForm";
import {
  createCheckboxField,
  createColorField,
  createDateField,
  createDividerField,
  createHeadingField,
  createImageField,
  createNumberField,
  createRadioField,
  createSelectField,
  createStaticTextField,
  createTextField,
  createTextareaField,
} from "@/features/form-builder/lib/createField";
import type { FormSchema } from "@/features/form-builder/types/schema";

function buildDemoSchema(): FormSchema {
  const fullName = {
    ...createTextField(0),
    label: "Full name",
    placeholder: "John Doe",
    required: true,
  };
  const description = {
    ...createTextareaField(1),
    label: "Description",
    placeholder: "Tell us what you need",
    rows: 4,
    required: true,
  };
  const quantity = {
    ...createNumberField(2),
    label: "Quantity",
    placeholder: "1",
    min: 1,
    max: 100,
    step: 1,
  };
  const agree = { ...createCheckboxField(3), label: "I agree", required: true };
  const priority = {
    ...createSelectField(4),
    label: "Priority",
    required: true,
    options: [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
    ],
  };
  const delivery = {
    ...createRadioField(5),
    label: "Delivery method",
    required: true,
    options: [
      { label: "Pickup", value: "pickup" },
      { label: "Courier", value: "courier" },
    ],
  };

  const date = {
    ...createDateField(6),
    label: "Preferred date",
    min: "2026-01-01",
    max: "2026-12-31",
  };

  const heading = { ...createHeadingField(7), label: "Additional information" };
  const staticBlock = {
    ...createStaticTextField(8),
    content:
      "Attach a reference image (max 5 MB, PNG/JPEG/WebP) and pick a preferred accent color.",
  };
  const divider = { ...createDividerField(9) };

  const image = {
    ...createImageField(10),
    label: "Reference image",
    accept: ["image/png", "image/jpeg", "image/webp"],
    maxSizeMb: 5,
  };
  const color = { ...createColorField(11), label: "Preferred color" };

  return createEmptyForm({
    title: "Fill demo form",
    description:
      "A schema-driven demo of fill mode + validation (Slice 4). Submissions are not persisted.",
    settings: { submitButtonLabel: "Submit", layout: "single-column" },
    fields: [
      fullName,
      description,
      quantity,
      agree,
      priority,
      delivery,
      date,
      heading,
      staticBlock,
      divider,
      image,
      color,
    ],
  });
}

export default function FormsFillDemoPage() {
  const schema = useMemo(buildDemoSchema, []);
  return <FormFillPage schema={schema} />;
}
