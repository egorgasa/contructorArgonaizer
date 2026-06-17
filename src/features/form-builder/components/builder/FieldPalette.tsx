"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FIELD_META, PALETTE_ORDER } from "../../lib/fieldMeta";
import type { FormFieldType } from "../../types/field";

interface Props {
  onAddField: (type: FormFieldType) => void;
}

const LAYOUT_TYPES: FormFieldType[] = ["heading", "staticText", "divider"];

function isLayoutType(type: FormFieldType): boolean {
  return LAYOUT_TYPES.includes(type);
}

export function FieldPalette({ onAddField }: Props) {
  // Derive groups from PALETTE_ORDER so the order stays the single source
  // of truth. Labels come from the registry — never hardcoded here.
  const layout = PALETTE_ORDER.filter(isLayoutType);
  const inputs = PALETTE_ORDER.filter((t) => !isLayoutType(t));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add field</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <PaletteSection title="Layout" types={layout} onAddField={onAddField} />
        <PaletteSection title="Input fields" types={inputs} onAddField={onAddField} />
      </CardBody>
    </Card>
  );
}

interface SectionProps {
  title: string;
  types: FormFieldType[];
  onAddField: (type: FormFieldType) => void;
}

function PaletteSection({ title, types, onAddField }: SectionProps) {
  if (types.length === 0) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {types.map((type) => (
          <Button
            key={type}
            variant="secondary"
            size="sm"
            onClick={() => onAddField(type)}
            aria-label={`Add ${FIELD_META[type].label} field`}
            className="justify-start"
          >
            + {FIELD_META[type].label}
          </Button>
        ))}
      </div>
    </section>
  );
}
