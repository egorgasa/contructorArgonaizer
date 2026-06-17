"use client";

import { InputHTMLAttributes, forwardRef } from "react";

// Minimal local checkbox primitive. The project UI kit doesn't ship one,
// and we don't want to introduce a global primitive in Slice 1 — it lives
// here next to the field component that uses it.
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className = "", invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 ${
        invalid ? "border-red-400" : ""
      } ${className}`}
      {...rest}
    />
  );
});
