"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition focus:outline-none focus:ring-2 ${
        invalid
          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-brand-500 focus:ring-brand-100"
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});
