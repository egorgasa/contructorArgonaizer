"use client";

// Minimal accessible radio group primitive. Lives in the feature, not in
// the global UI kit, because the project UI kit doesn't ship one and we
// don't want to introduce a primitive without a clear cross-feature need.

interface RadioGroupOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  name: string;
  value: string | null | undefined;
  options: RadioGroupOption[];
  invalid?: boolean;
  onChange: (value: string) => void;
}

export function RadioGroup({ name, value, options, invalid, onChange }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-invalid={invalid || undefined}
      className="flex flex-col gap-2"
    >
      {options.map((opt) => {
        const id = `${name}__${opt.value}`;
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-900"
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className={`h-4 w-4 border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500 ${
                invalid ? "border-red-400" : ""
              }`}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
