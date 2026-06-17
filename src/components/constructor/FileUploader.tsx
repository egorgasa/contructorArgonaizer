"use client";

import { useCallback, useId, useRef } from "react";
import { FILE_UPLOAD_LIMITS } from "@/lib/storage/types";

export interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

interface FileUploaderProps {
  files: PendingFile[];
  onChange: (next: PendingFile[]) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

function isAllowed(file: File): boolean {
  const allowed: readonly string[] = FILE_UPLOAD_LIMITS.allowedMimeTypes;
  return allowed.includes(file.type);
}

export function FileUploader({ files, onChange, disabled }: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const next: PendingFile[] = [...files];
      const errors: string[] = [];
      for (const file of Array.from(incoming)) {
        if (!isAllowed(file)) {
          errors.push(`Тип «${file.type || file.name}» не поддерживается.`);
          continue;
        }
        if (file.size > FILE_UPLOAD_LIMITS.maxFileSizeBytes) {
          errors.push(
            `Файл «${file.name}» больше ${Math.round(
              FILE_UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024),
            )} МБ.`,
          );
          continue;
        }
        if (next.length >= FILE_UPLOAD_LIMITS.maxFilesPerRequest) {
          errors.push(
            `Максимум ${FILE_UPLOAD_LIMITS.maxFilesPerRequest} файлов на заявку.`,
          );
          break;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        });
      }
      onChange(next);
      if (errors.length > 0) {
        // Surface validation errors via alert — small and acceptable for MVP.
        alert(errors.join("\n"));
      }
      // Reset native input so the same file can be re-picked after removal.
      if (inputRef.current) inputRef.current.value = "";
    },
    [files, onChange],
  );

  const remove = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onChange(files.filter((f) => f.id !== id));
  };

  const allowedAccept = FILE_UPLOAD_LIMITS.allowedMimeTypes.join(",");
  const remaining = FILE_UPLOAD_LIMITS.maxFilesPerRequest - files.length;
  const maxMb = Math.round(FILE_UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024));

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-700 transition hover:border-brand-400 hover:bg-brand-50/40"
      >
        <span className="font-medium text-gray-900">Добавить файлы</span>
        <span className="mt-1 text-xs text-gray-600">
          JPEG / PNG / WEBP / HEIC / PDF — до {maxMb} МБ каждый,
          максимум {FILE_UPLOAD_LIMITS.maxFilesPerRequest} файлов
        </span>
        <span className="mt-1 text-xs text-gray-500">Осталось: {Math.max(remaining, 0)}</span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={allowedAccept}
          disabled={disabled || remaining <= 0}
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />
      </label>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    PDF
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-gray-900">{f.file.name}</div>
                <div className="text-xs text-gray-500">
                  {f.file.type || "файл"} · {formatBytes(f.file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(f.id)}
                disabled={disabled}
                className="text-xs text-gray-500 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
              >
                удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
