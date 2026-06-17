"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormItem } from "../../ui/FormItem";
import type { ImageField as ImageFieldSchema } from "../../types/field";
import type { ImageFieldValue } from "../../types/submission";

interface Props {
  field: ImageFieldSchema;
  // For an image field the stored value is either an ImageFieldValue, null,
  // or undefined. We narrow at the registry adapter so this component
  // doesn't need to do runtime type guards.
  value: ImageFieldValue | null | undefined;
  error?: string;
  onChange: (value: ImageFieldValue | null) => void;
}

// Reads a file into a base64 data URL. The promise rejects on FileReader
// error so callers can show a local error.
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unexpected reader result"));
    };
    reader.readAsDataURL(file);
  });
}

export function ImageField({ field, value, error, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reactId = useId();
  const inputId = `${field.id}-${reactId}`;
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = field.accept && field.accept.length > 0 ? field.accept.join(",") : "image/*";
  const maxBytes =
    typeof field.maxSizeMb === "number" ? field.maxSizeMb * 1024 * 1024 : undefined;

  const displayedError = error ?? localError ?? undefined;

  const handleFileSelected = async (file: File) => {
    setLocalError(null);

    if (field.accept && field.accept.length > 0 && !field.accept.includes(file.type)) {
      setLocalError(`Unsupported file type: ${file.type || "unknown"}`);
      onChange(null);
      return;
    }
    if (typeof maxBytes === "number" && file.size > maxBytes) {
      setLocalError(`File is too large. Max ${field.maxSizeMb} MB.`);
      onChange(null);
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      onChange({
        kind: "image",
        dataUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
    } catch {
      setLocalError("Could not read file. Please try another one.");
      onChange(null);
    }
  };

  const handleClear = () => {
    setLocalError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <FormItem field={field} htmlFor={inputId} error={displayedError}>
      {value && value.kind === "image" ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.dataUrl}
              alt={value.name}
              className="max-h-48 w-auto object-contain"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="truncate">
              {value.name} · {Math.round(value.size / 1024)} KB
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            aria-invalid={displayedError ? true : undefined}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:bg-brand-700"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          />
          {typeof field.maxSizeMb === "number" ? (
            <p className="mt-1 text-xs text-gray-500">Up to {field.maxSizeMb} MB</p>
          ) : null}
        </div>
      )}
    </FormItem>
  );
}
