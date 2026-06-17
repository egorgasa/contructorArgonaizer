"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { SelectOption } from "../../types/field";

interface Props {
  options: SelectOption[];
  onChange: (next: SelectOption[]) => void;
}

// Editor for select/radio options. The data shape (SelectOption) is the
// same for both — RadioOption is structurally identical and assignable.
export function OptionsEditor({ options, onChange }: Props) {
  const setLabel = (index: number, label: string) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, label } : opt)));
  };
  const setValue = (index: number, value: string) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, value } : opt)));
  };
  const remove = (index: number) => {
    const next = options.filter((_, i) => i !== index);
    // Never leave the editor with zero options — keep one stub.
    onChange(next.length > 0 ? next : [{ label: "Option 1", value: "option-1" }]);
  };
  const add = () => {
    const nextIndex = options.length + 1;
    onChange([
      ...options,
      { label: `Option ${nextIndex}`, value: `option-${nextIndex}` },
    ]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Options
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          + Add option
        </Button>
      </div>
      <ul className="space-y-2">
        {options.map((opt, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              aria-label={`Option ${i + 1} label`}
              value={opt.label}
              onChange={(e) => setLabel(i, e.target.value)}
              placeholder="Label"
            />
            <Input
              aria-label={`Option ${i + 1} value`}
              value={opt.value}
              onChange={(e) => setValue(i, e.target.value)}
              placeholder="value"
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove option ${i + 1}`}
              onClick={() => remove(i)}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
