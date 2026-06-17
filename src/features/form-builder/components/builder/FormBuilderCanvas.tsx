"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { FormField } from "../../types/field";
import { sortFields } from "../../lib/sortFields";
import { FieldListItem } from "./FieldListItem";

interface Props {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onRemove: (id: string) => void;
}

export function FormBuilderCanvas({
  fields,
  selectedFieldId,
  onSelect,
  onMove,
  onRemove,
}: Props) {
  const ordered = useMemo(() => sortFields(fields), [fields]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fields</CardTitle>
      </CardHeader>
      <CardBody>
        {ordered.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              No fields yet
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Pick a field type from the palette on the left to start building your
              form.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ordered.map((field, i) => (
              <FieldListItem
                key={field.id}
                field={field}
                selected={field.id === selectedFieldId}
                isFirst={i === 0}
                isLast={i === ordered.length - 1}
                onSelect={onSelect}
                onMove={onMove}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
