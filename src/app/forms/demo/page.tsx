"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormRenderer } from "@/features/form-builder/components/FormRenderer";
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
import type { FormValues } from "@/features/form-builder/types/submission";

// Build a demo schema once per module load. The schema is the only thing
// the renderer needs — the demo page does not depend on the builder or
// any persistence.
function buildDemoSchema(): FormSchema {
  const text = {
    ...createTextField(0),
    label: "Full name",
    placeholder: "John Doe",
    required: true,
  };
  const textarea = {
    ...createTextareaField(1),
    label: "Description",
    placeholder: "Tell us what you need",
    rows: 4,
  };
  const number = {
    ...createNumberField(2),
    label: "Quantity",
    placeholder: "1",
    min: 1,
    step: 1,
    required: true,
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

  const date = { ...createDateField(5), label: "Preferred date" };
  const delivery = {
    ...createRadioField(6),
    label: "Delivery method",
    options: [
      { label: "Pickup", value: "pickup" },
      { label: "Courier", value: "courier" },
    ],
  };

  const heading = { ...createHeadingField(7), label: "Additional information" };
  const staticBlock = {
    ...createStaticTextField(8),
    content:
      "Attach a reference image if you have one, and pick a preferred accent color.",
  };
  const divider = { ...createDividerField(9) };

  const image = { ...createImageField(10), label: "Reference image" };
  const color = { ...createColorField(11), label: "Preferred color" };

  return createEmptyForm({
    title: "Demo form",
    description: "A schema-driven demo to validate Slice 2 of the form builder.",
    fields: [
      text,
      textarea,
      number,
      agree,
      priority,
      date,
      delivery,
      heading,
      staticBlock,
      divider,
      image,
      color,
    ],
  });
}

export default function FormsDemoPage() {
  const schema = useMemo(buildDemoSchema, []);
  const [values, setValues] = useState<FormValues>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{schema.title}</h1>
        {schema.description ? (
          <p className="mt-1 text-sm text-gray-600">{schema.description}</p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form</CardTitle>
        </CardHeader>
        <CardBody>
          <FormRenderer schema={schema} values={values} onChange={setValues} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug — current values</CardTitle>
        </CardHeader>
        <CardBody>
          <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
            {JSON.stringify(values, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
