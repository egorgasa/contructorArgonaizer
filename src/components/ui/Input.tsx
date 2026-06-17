"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${
        invalid
          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-brand-500 focus:ring-brand-100"
      } ${className}`}
      {...rest}
    />
  );
});
